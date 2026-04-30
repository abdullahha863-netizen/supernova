import { PrismaClient } from "@prisma/client";
import { assertProductionDatabaseUrl } from "@/lib/databaseSafety";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

assertProductionDatabaseUrl();

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
