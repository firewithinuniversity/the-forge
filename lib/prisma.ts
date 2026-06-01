import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Production: connect to Turso cloud database
  // Development: use local SQLite file
  const adapter =
    tursoUrl && tursoToken
      ? new PrismaLibSql({ url: tursoUrl, authToken: tursoToken })
      : new PrismaLibSql({ url: `file:${process.cwd()}/dev.db` });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
