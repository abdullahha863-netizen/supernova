import amqp, { type Channel, type ChannelModel } from "amqplib";

export const MINING_SHARE_QUEUE = process.env.MINING_SHARE_QUEUE || "mining.share.submit.v1";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting: Promise<Channel> | null = null;

async function getChannel(): Promise<Channel> {
  if (channel) return channel;
  if (connecting) return connecting;

  connecting = (async () => {
    const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
    const conn = await amqp.connect(url);
    const ch = await conn.createChannel();
    await ch.assertQueue(MINING_SHARE_QUEUE, { durable: true });

    conn.on("close", () => {
      connection = null;
      channel = null;
    });

    conn.on("error", () => {
      connection = null;
      channel = null;
    });

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

export interface ShareSubmissionMessage {
  minerId: string;
  userId: string;
  nonce: string;
  difficulty: number;
  accepted: boolean;
  reward: number;
  submittedAt: string;
  sourceIp: string;
}

export async function publishShareSubmission(payload: ShareSubmissionMessage): Promise<boolean> {
  const ch = await getChannel();
  return ch.sendToQueue(MINING_SHARE_QUEUE, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: "application/json",
    timestamp: Date.now(),
  });
}

export async function ensureMiningQueueReady(): Promise<boolean> {
  await getChannel();
  return true;
}

export async function closeMiningQueue(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}
