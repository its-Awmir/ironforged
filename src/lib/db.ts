import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

let _db: PrismaClient | undefined;

try {
  _db = globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _db;
} catch (error) {
  console.error("[DB_INIT] Failed to initialize Prisma client:", error);
  _db = undefined;
}

function ensureReady(): PrismaClient {
  if (!_db) {
    throw new Error(
      "Database client is not initialized. Check that DATABASE_URL is set and the Prisma adapter is configured correctly."
    );
  }
  return _db;
}

/**
 * Lazy accessor for the Prisma client. Throws a clear error only when
 * first accessed if initialization failed, instead of crashing at module
 * load time. `isDbReady()` can still be used to check availability without
 * triggering initialization.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = ensureReady();
    const value = client[prop as keyof PrismaClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function isDbReady(): boolean {
  return _db !== undefined && _db !== null;
}