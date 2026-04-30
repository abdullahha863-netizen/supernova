const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson(base, pathname, adminKey) {
  const res = await fetch(`${base}${pathname}`, {
    headers: {
      "x-admin-key": adminKey,
      accept: "application/json",
    },
  });
  const body = await readJson(res);
  return { res, body };
}

async function main() {
  loadEnvFile();

  const base = String(process.env.BASE_URL || "http://localhost:3000").trim();
  const adminKey = String(process.env.ADMIN_KEY || "").trim();
  assert(adminKey, "ADMIN_KEY is required");

  const summary = {};

  const health = await getJson(base, "/api/mining/health", adminKey);
  assert(health.res.ok, `Health failed: ${JSON.stringify(health.body)}`);
  assert(health.body.checks?.redis === true, "Expected Redis health check to be true");
  assert(health.body.checks?.rabbitmq === true, "Expected RabbitMQ health check to be true");
  summary.health = health.body;

  const queue = await getJson(base, "/api/mining/queue", adminKey);
  assert(queue.res.ok, `Queue failed: ${JSON.stringify(queue.body)}`);
  assert(Number(queue.body.consumers || 0) >= 1, "Expected at least one queue consumer");
  summary.queue = queue.body;

  const writer = await getJson(base, "/api/mining/hashrate-writer", adminKey);
  assert(writer.res.ok, `Hashrate writer failed: ${JSON.stringify(writer.body)}`);
  assert(writer.body.status === "healthy", `Expected hashrate writer healthy, got ${writer.body.status}`);
  summary.writer = writer.body;

  const metrics = await getJson(base, "/api/mining/metrics", adminKey);
  assert(metrics.res.ok, `Metrics failed: ${JSON.stringify(metrics.body)}`);
  assert(metrics.body.ok === true, "Expected metrics ok=true");
  summary.metrics = {
    counters: Object.keys(metrics.body.counters || {}).length,
    latency: Object.keys(metrics.body.latency || {}).length,
  };

  const pending = await getJson(base, "/api/admin/cashout-review", adminKey);
  assert(pending.res.ok, `Cashout review list failed: ${JSON.stringify(pending.body)}`);
  assert(Array.isArray(pending.body.rows), "Expected pending cashout rows array");
  assert(pending.body.rows.length > 0, "Expected at least one pending cashout request for e2e validation");

  const selected = pending.body.rows[0];
  const userId = selected.userId;
  const payoutId = selected.payoutId;
  summary.selectedPending = { userId, payoutId, amount: selected.amount };

  const [user, cashout, uptime, fraud, hashrate] = await Promise.all([
    getJson(base, `/api/mining/user/${encodeURIComponent(userId)}`, adminKey),
    getJson(base, `/api/mining/cashout?userId=${encodeURIComponent(userId)}`, adminKey),
    getJson(base, `/api/mining/uptime?userId=${encodeURIComponent(userId)}`, adminKey),
    getJson(base, `/api/mining/fraud-check?userId=${encodeURIComponent(userId)}`, adminKey),
    getJson(base, `/api/mining/hashrate/history?userId=${encodeURIComponent(userId)}`, adminKey),
  ]);

  assert(user.res.ok && user.body.ok, `User API failed: ${JSON.stringify(user.body)}`);
  assert(cashout.res.ok && cashout.body.ok, `Cashout API failed: ${JSON.stringify(cashout.body)}`);
  assert(uptime.res.ok && uptime.body.ok, `Uptime API failed: ${JSON.stringify(uptime.body)}`);
  assert(fraud.res.ok && fraud.body.ok, `Fraud API failed: ${JSON.stringify(fraud.body)}`);
  assert(hashrate.res.ok && hashrate.body.ok, `Hashrate history API failed: ${JSON.stringify(hashrate.body)}`);

  const matchingPayout = (cashout.body.history || []).find((row) => row.id === payoutId);
  assert(matchingPayout, `Expected payout ${payoutId} in user cashout history`);
  assert(["pending", "paid", "rejected"].includes(String(matchingPayout.status)), "Unexpected payout status value");

  const windows = hashrate.body.windows || {};
  assert(Object.keys(windows).length >= 4, "Expected multiple hashrate windows");
  assert(hashrate.body.currentHashrate >= 0, "Expected current hashrate >= 0");

  const invalidActionRes = await fetch(`${base}/api/mining/cashout`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-admin-key": adminKey,
      accept: "application/json",
    },
    body: JSON.stringify({ payoutId: 999999999, action: "approve" }),
  });
  const invalidActionBody = await readJson(invalidActionRes);
  assert(invalidActionRes.status === 409, `Expected invalid payout action to return 409, got ${invalidActionRes.status}`);
  assert(invalidActionBody.ok === false, "Expected invalid payout action to return ok=false");

  summary.detailChecks = {
    userName: user.body.user?.name,
    pendingBalance: cashout.body.pendingBalance,
    workerCount: uptime.body.workerCount,
    fraudFlags: fraud.body.flagCount,
    hashrateWindowPoints: Object.fromEntries(Object.entries(windows).map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0])),
    invalidActionStatus: invalidActionRes.status,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
