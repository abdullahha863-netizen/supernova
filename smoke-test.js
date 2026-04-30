const BASE_URL = "http://localhost:3000";
const USER_ID = process.env.SMOKE_TEST_USER_ID || "test-user-1";
const ADMIN_KEY = process.env.ADMIN_KEY || loadEnvValue("ADMIN_KEY");

const workers = [
  "RIG-ALPHA-01",
  "RIG-BETA-02",
  "RIG-GAMMA-03",
];

const DURATION_MS = Number(process.env.SMOKE_TEST_DURATION_MS || 90 * 1000);
const UPDATE_INTERVAL_MS = Number(process.env.SMOKE_TEST_INTERVAL_MS || 12 * 1000);
const DISCONNECT_MS = 5 * 1000;
const DISCONNECT_CHANCE = 0.08;

const workerState = new Map(workers.map((workerName) => [workerName, { connected: false, reconnecting: false }]));

function loadEnvValue(name) {
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return "";

    const line = fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${name}=`));

    if (!line) return "";
    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomHashrate() {
  return Math.round(1000 + Math.random() * 3000);
}

function randomShareEvent() {
  return Math.random() < 0.8 ? "share_accepted" : "share_rejected";
}

async function postJson(path, body) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[smoke] ${path} failed: ${response.status} ${text}`);
      return null;
    }

    return response.json().catch(() => ({}));
  } catch (error) {
    console.error(`[smoke] ${path} error:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function sendUptime(workerName, event) {
  await postJson("/api/mining/uptime", {
    userId: USER_ID,
    workerName,
    event,
  });
}

async function connectWorker(workerName) {
  await sendUptime(workerName, "connect");
  workerState.set(workerName, { connected: true, reconnecting: false });
  console.log(`[smoke] connected ${workerName}`);
}

async function disconnectWorker(workerName) {
  await sendUptime(workerName, "disconnect");
  const current = workerState.get(workerName) || { connected: false, reconnecting: false };
  workerState.set(workerName, { ...current, connected: false });
  console.log(`[smoke] disconnected ${workerName}`);
}

async function reconnectAfterDelay(workerName) {
  const current = workerState.get(workerName) || { connected: false, reconnecting: false };
  if (current.reconnecting) return;

  workerState.set(workerName, { ...current, reconnecting: true });
  await disconnectWorker(workerName);
  await sleep(DISCONNECT_MS);
  await connectWorker(workerName);
}

async function sendWorkerUpdate(workerName) {
  const hashrate = randomHashrate();
  const event = randomShareEvent();

  await postJson("/api/mining/workers", {
    userId: USER_ID,
    workerName,
    hashrate,
    event,
  });

  console.log(`[smoke] update ${workerName}: ${hashrate} H/s, ${event}`);
}

async function runSmokeTest() {
  if (!ADMIN_KEY) {
    throw new Error("ADMIN_KEY is required. Set ADMIN_KEY in the environment or .env.");
  }

  const endsAt = Date.now() + DURATION_MS;
  console.log(`[smoke] starting ${Math.round(DURATION_MS / 1000)} second miner smoke test against ${BASE_URL}`);
  console.log(`[smoke] userId=${USER_ID}`);

  await Promise.all(workers.map((workerName) => connectWorker(workerName)));

  while (Date.now() < endsAt) {
    const connectedWorkers = workers.filter((workerName) => workerState.get(workerName)?.connected);

    await Promise.all(connectedWorkers.map((workerName) => sendWorkerUpdate(workerName)));
    console.log(`[smoke] cycle complete: ${connectedWorkers.length}/${workers.length} workers online`);

    const canDisconnect = workers.filter((workerName) => {
      const state = workerState.get(workerName);
      return state?.connected && !state.reconnecting;
    });

    if (canDisconnect.length > 0 && Math.random() < DISCONNECT_CHANCE) {
      const workerName = canDisconnect[Math.floor(Math.random() * canDisconnect.length)];
      console.log(`[smoke] temporary disconnect scheduled for ${workerName}`);
      void reconnectAfterDelay(workerName);
    }

    await sleep(Math.min(UPDATE_INTERVAL_MS, Math.max(0, endsAt - Date.now())));
  }

  console.log("[smoke] duration complete, disconnecting all workers");
  await Promise.all(workers.map((workerName) => disconnectWorker(workerName)));
  console.log("[smoke] smoke test finished");
}

runSmokeTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[smoke] unexpected fatal error:", error);
    process.exit(1);
  });
