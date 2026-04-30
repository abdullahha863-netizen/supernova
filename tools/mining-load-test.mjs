import net from "node:net";
import process from "node:process";
import { WebSocket } from "ws";

const mode = process.argv[2] || "health";
const durationSec = Number(process.env.MINING_LOAD_DURATION_SEC || "15");
const connections = Number(process.env.MINING_LOAD_CONNECTIONS || "25");
const ratePerConnection = Number(process.env.MINING_LOAD_RATE || "4");
const token = process.env.MINING_TOKEN || "";

const restUrl = process.env.MINING_REST_URL || "http://127.0.0.1:3000/api/mining/submit-share";
const wsUrl = process.env.MINING_WS_URL || "ws://127.0.0.1:8081/ws/mining";
const healthUrl = process.env.MINING_HEALTH_URL || "http://127.0.0.1:3000/api/mining/health";
const stratumHost = process.env.MINING_STRATUM_HOST || "127.0.0.1";
const stratumPort = Number(process.env.MINING_STRATUM_PORT || "3333");

const minerIds = splitList(process.env.MINING_MINER_IDS);
const workerNames = splitList(process.env.MINING_WORKER_NAMES);

const counters = {
  sent: 0,
  accepted: 0,
  rejected: 0,
  errors: 0,
  connections: 0,
};

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function pick(list, index, fallback) {
  if (list.length === 0) return fallback;
  return list[index % list.length];
}

function summary(label) {
  console.log(JSON.stringify({
    label,
    mode,
    durationSec,
    connections,
    ratePerConnection,
    counters,
  }, null, 2));
}

async function runHealth() {
  const res = await fetch(healthUrl);
  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, body }, null, 2));
}

async function runRest() {
  ensure(minerIds.length > 0, "Set MINING_MINER_IDS for REST testing.");
  ensure(token, "Set MINING_TOKEN for REST testing.");

  const stopAt = Date.now() + durationSec * 1000;
  const runners = Array.from({ length: connections }, (_, index) => restLoop(index, stopAt));
  await Promise.all(runners);
}

async function restLoop(index, stopAt) {
  const intervalMs = Math.max(1, Math.floor(1000 / ratePerConnection));
  while (Date.now() < stopAt) {
    const minerId = pick(minerIds, index, "");
    try {
      const response = await fetch(restUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          minerId,
          nonce: `rest-${index}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          difficulty: 1024,
          token,
        }),
      });

      counters.sent += 1;
      if (response.ok) counters.accepted += 1;
      else counters.rejected += 1;
    } catch {
      counters.errors += 1;
    }

    await sleep(intervalMs);
  }
}

async function runWs() {
  ensure(minerIds.length > 0, "Set MINING_MINER_IDS for WebSocket testing.");
  ensure(token, "Set MINING_TOKEN for WebSocket testing.");

  const stopAt = Date.now() + durationSec * 1000;
  await Promise.all(Array.from({ length: connections }, (_, index) => wsClient(index, stopAt)));
}

function wsClient(index, stopAt) {
  return new Promise((resolve) => {
    const minerId = pick(minerIds, index, "");
    const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
    let timer;

    socket.on("open", () => {
      counters.connections += 1;
      timer = setInterval(() => {
        if (Date.now() >= stopAt) {
          clearInterval(timer);
          socket.close();
          return;
        }

        counters.sent += 1;
        socket.send(JSON.stringify({
          type: "submit_share",
          minerId,
          nonce: `ws-${index}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          difficulty: 1024,
        }));
      }, Math.max(1, Math.floor(1000 / ratePerConnection)));
    });

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "share_accepted") counters.accepted += 1;
        else if (message.type === "share_rejected") counters.rejected += 1;
      } catch {
        counters.errors += 1;
      }
    });

    socket.on("error", () => {
      counters.errors += 1;
    });

    socket.on("close", () => {
      if (timer) clearInterval(timer);
      resolve();
    });
  });
}

async function runStratum() {
  ensure(workerNames.length > 0, "Set MINING_WORKER_NAMES for Stratum testing.");
  ensure(token, "Set MINING_TOKEN for Stratum testing.");

  const stopAt = Date.now() + durationSec * 1000;
  await Promise.all(Array.from({ length: connections }, (_, index) => stratumClient(index, stopAt)));
}

function stratumClient(index, stopAt) {
  return new Promise((resolve) => {
    const workerName = pick(workerNames, index, "");
    const socket = net.createConnection({ host: stratumHost, port: stratumPort });
    let buffer = "";
    let shareId = 10;
    let timer;

    socket.setNoDelay(true);

    socket.on("connect", () => {
      counters.connections += 1;
      socket.write(`${JSON.stringify({ id: 1, method: "mining.subscribe", params: ["supernova-load-test"] })}\n`);
      socket.write(`${JSON.stringify({ id: 2, method: "mining.authorize", params: [workerName, token] })}\n`);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const frames = buffer.split("\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        if (!frame.trim()) continue;

        try {
          const message = JSON.parse(frame);
          if (message.id === 2 && message.result === true && !timer) {
            timer = setInterval(() => {
              if (Date.now() >= stopAt) {
                clearInterval(timer);
                socket.end();
                return;
              }

              counters.sent += 1;
              shareId += 1;
              socket.write(`${JSON.stringify({
                id: shareId,
                method: "mining.submit",
                params: [workerName, "job-1", `nonce-${index}-${Date.now()}`, 1024],
              })}\n`);
            }, Math.max(1, Math.floor(1000 / ratePerConnection)));
          } else if (typeof message.result === "boolean") {
            if (message.result) counters.accepted += 1;
            else counters.rejected += 1;
          }
        } catch {
          counters.errors += 1;
        }
      }
    });

    socket.on("error", () => {
      counters.errors += 1;
    });

    socket.on("close", () => {
      if (timer) clearInterval(timer);
      resolve();
    });
  });
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const reporter = setInterval(() => summary("progress"), 5000);

  try {
    if (mode === "rest") await runRest();
    else if (mode === "ws") await runWs();
    else if (mode === "stratum") await runStratum();
    else await runHealth();

    summary("complete");
  } finally {
    clearInterval(reporter);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
