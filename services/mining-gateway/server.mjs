import http from "node:http";
import os from "node:os";
import cluster from "node:cluster";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { publishShare } from "../shared/rabbitmq.mjs";
import { getRedis, publishRedis } from "../shared/redis.mjs";
import { incCounter, recordLatency } from "../shared/mining-metrics.mjs";
import { logger } from "../shared/logger.mjs";
import { assertProductionMiningSafety } from "../shared/production-safety.mjs";

const HOST = process.env.MINING_WS_HOST || "0.0.0.0";
const PORT = Number(process.env.MINING_WS_PORT || "8081");
const WS_PATH = process.env.MINING_WS_PATH || "/ws/mining";
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const RATE_LIMIT_PER_SECOND = Number(process.env.MINING_RATE_LIMIT_PER_SECOND || "12000");
const USE_CLUSTER = process.env.MINING_WS_CLUSTER === "true";
const WORKERS = Number(process.env.MINING_WS_WORKERS || Math.max(1, os.cpus().length));

assertProductionMiningSafety("mining-gateway");

if (USE_CLUSTER && cluster.isPrimary) {
  for (let i = 0; i < WORKERS; i += 1) cluster.fork();
  cluster.on("exit", () => cluster.fork());
} else {
  startServer();
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseTokenFromUrl(urlValue) {
  if (!urlValue) return null;
  const u = new URL(urlValue, "http://localhost");
  return u.searchParams.get("token");
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && typeof decoded === "object") {
      const userId = typeof decoded.sub === "string"
        ? decoded.sub
        : typeof decoded.userId === "string"
          ? decoded.userId
          : null;
      if (userId) return { ...decoded, userId };
    }
    return null;
  } catch {
    return null;
  }
}

async function isAllowedShareRate(redis, minerId) {
  const key = `ws:rate:${minerId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 1);
  return count <= RATE_LIMIT_PER_SECOND;
}

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", pid: process.pid }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 8 * 1024 });
  const redis = getRedis();

  wss.on("connection", (ws, req, session) => {
    ws.isAlive = true;
    ws.session = session;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (buf) => {
      const startedAt = Date.now();
      const data = parseJsonSafe(buf.toString());
      if (!data || typeof data !== "object") {
        ws.send(JSON.stringify({ type: "error", error: "invalid_json" }));
        return;
      }

      if (data.type !== "submit_share") {
        ws.send(JSON.stringify({ type: "error", error: "unsupported_message_type" }));
        return;
      }

      if (process.env.NODE_ENV === "production") {
        void incCounter("share_rejected", { source: "websocket", reason: "real_kaspa_validation_required" });
        ws.send(JSON.stringify({ type: "share_rejected", reason: "real_kaspa_validation_required" }));
        return;
      }

      const { minerId, nonce, difficulty } = data;
      if (!minerId || !nonce || typeof difficulty !== "number") {
        ws.send(JSON.stringify({ type: "error", error: "invalid_share_payload" }));
        return;
      }

      try {
        const allowed = await isAllowedShareRate(redis, minerId);
        if (!allowed) {
          void incCounter("share_rejected", { source: "websocket", reason: "rate_limited" });
          ws.send(JSON.stringify({ type: "share_rejected", reason: "rate_limited" }));
          return;
        }

        await publishShare({
          minerId,
          userId: ws.session.userId,
          nonce,
          difficulty,
          accepted: true,
          reward: 0,
          submittedAt: new Date().toISOString(),
          sourceIp: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
          source: "websocket",
        });

        await publishRedis("mining:shares:ingested", {
          minerId,
          userId: ws.session.userId,
          difficulty,
          at: Date.now(),
        });

        void incCounter("share_accepted", { source: "websocket" });
        void recordLatency("ws_submit_share", Date.now() - startedAt);
        ws.send(JSON.stringify({ type: "share_accepted", minerId, ts: Date.now() }));
      } catch {
        void incCounter("share_rejected", { source: "websocket", reason: "queue_unavailable" });
        ws.send(JSON.stringify({ type: "share_rejected", reason: "queue_unavailable" }));
      }
    });

    ws.on("close", async () => {
      void incCounter("connection_closed", { source: "websocket" });
      await publishRedis("mining:miners:presence", {
        type: "disconnect",
        userId: ws.session.userId,
        at: Date.now(),
      });
    });

    ws.send(JSON.stringify({ type: "ready", pid: process.pid }));
    void incCounter("connection_opened", { source: "websocket" });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
      } else {
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, 15000);

  server.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith(WS_PATH)) {
      socket.destroy();
      return;
    }

    const token = parseTokenFromUrl(req.url);
    const session = token ? verifyToken(token) : null;
    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, session);
    });
  });

  server.listen(PORT, HOST, () => {
    logger.info("Mining gateway listening", { host: HOST, port: PORT, pid: process.pid });
  });

  const shutdown = async () => {
    clearInterval(heartbeat);
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
