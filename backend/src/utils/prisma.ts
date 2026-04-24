import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Use DIRECT connection for persistent server (not serverless)
// PgBouncer pooler adds 100-500ms latency per query
const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
// Keep Prisma conservative when pointed at Supabase's session pooler.
// Higher values can exhaust the pool quickly during local dev with watch mode.
const connectionLimit = process.env.NODE_ENV === 'production' ? 10 : 5;
const urlWithPooling = `${connectionUrl}${connectionUrl.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=60`;

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
