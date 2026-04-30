import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "mining-loadtest@local.supernova" },
    update: {},
    create: {
      name: "Mining Load Test",
      email: "mining-loadtest@local.supernova",
      password: "dev-only-password",
    },
  });

  const miners = [];
  for (let i = 1; i <= 5; i += 1) {
    const poolWorkerName = `miner${i}.worker${i}`;
    const miner = await prisma.miner.upsert({
      where: {
        userId_poolWorkerName: {
          userId: user.id,
          poolWorkerName,
        },
      },
      update: {
        isActive: true,
        lastSeen: new Date(),
        minerAddress: `127.0.0.${i}`,
      },
      create: {
        userId: user.id,
        minerName: `LoadMiner-${i}`,
        minerAddress: `127.0.0.${i}`,
        poolWorkerName,
        difficulty: 1024,
        isActive: true,
      },
    });
    miners.push(miner);
  }

  const secret = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    secret,
    { expiresIn: "4h" },
  );

  process.stdout.write(JSON.stringify({
    userId: user.id,
    token,
    minerIds: miners.map((m) => m.id),
    workerNames: miners.map((m) => m.poolWorkerName),
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
