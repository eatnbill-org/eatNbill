import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Use DIRECT connection for persistent server (not serverless)
// PgBouncer pooler adds 100-500ms latency per query
const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
// Reduced connection_limit to 3 to be extra safe in development
const urlWithPooling = `${connectionUrl}${connectionUrl.includes('?') ? '&' : '?'}connection_limit=3&pool_timeout=30`;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
    datasourceUrl: urlWithPooling,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ONLY for graceful shutdown
export async function shutdownPrisma() {
  await prisma.$disconnect();
}
