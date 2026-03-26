import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

function getPrisma(): PrismaClient {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  return global.prisma;
}

// Lazy proxy — PrismaClient is only created when first accessed at runtime
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => (getPrisma() as any)[prop],
});

export * from '@prisma/client';
