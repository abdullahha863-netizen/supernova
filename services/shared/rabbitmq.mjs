import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
export const SHARE_QUEUE = process.env.MINING_SHARE_QUEUE || "mining.share.submit.v1";

let connection;
let channel;
let connecting;
const observedConnections = new WeakSet();

function resetState() {
  connection = null;
  channel = null;
}

function bindConnectionListeners(conn) {
  if (observedConnections.has(conn)) return;

  conn.on("close", () => {
    if (connection === conn) resetState();
  });

  conn.on("error", () => {
    if (connection === conn) resetState();
  });

  observedConnections.add(conn);
}

export async function getRabbitChannel() {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    const conn = connection || await amqp.connect(RABBITMQ_URL);
    bindConnectionListeners(conn);

    const ch = await conn.createChannel();
    await ch.assertQueue(SHARE_QUEUE, { durable: true });

    ch.on("close", () => {
      if (channel === ch) channel = null;
    });

    ch.on("error", () => {
      if (channel === ch) channel = null;
    });

    connection = conn;
    channel = ch;
    return ch;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export async function publishShare(payload) {
  const ch = await getRabbitChannel();
  return ch.sendToQueue(SHARE_QUEUE, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: "application/json",
    timestamp: Date.now(),
  });
}

export async function closeRabbit() {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}
