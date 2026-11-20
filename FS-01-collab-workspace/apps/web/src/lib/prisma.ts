import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { webPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.webPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.webPrisma = prisma;
}
