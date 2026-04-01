import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var readPrisma: PrismaClient | undefined;
}

function getDb(): PrismaClient | null {
  if (!global.prisma) {
    try {
      global.prisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL! } }
      });
    } catch (_e) {
      return null;
    }
  }
  return global.prisma!;
}

function getReadDb(): PrismaClient {
  if (!global.readPrisma) {
    global.readPrisma = process.env.READ_REPLICA_URL
      ? new PrismaClient({ datasources: { db: { url: process.env.READ_REPLICA_URL! } } })
      : getDb();
  }
  return global.readPrisma;
}

// Lazy proxies — PrismaClient is only created when first accessed
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => (getDb() as any)[prop],
});

export const readDb: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => (getReadDb() as any)[prop],
});

export * from '@prisma/client';

/**
 * Verify database connectivity.
 * Used during system boot to ensure the database is ready.
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    const client = getDb();
    // Use a simpler test that doesn't rely on raw SQL parsing if it fails
    await client.$connect();
    return true;
  } catch (err) {
    console.error('❌ Database connection verification failed:', (err as Error).message);
    return false;
  }
}
