import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Use DIRECT connection for persistent server (not serverless)
// PgBouncer pooler adds 100-500ms latency per query
const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
// Increased connection_limit to 10 for better concurrency in development
// and increased pool_timeout to 60s to handle slow cold starts or network lag
const urlWithPooling = `${connectionUrl}${connectionUrl.includes('?') ? '&' : '?'}connection_limit=20&pool_timeout=60`;

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
