import { prisma } from '../../utils/prisma';

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    select: { id: true, email: true, role: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function findUserByEmail(tenantId: string, email: string) {
  return prisma.user.findFirst({
    where: { tenant_id: tenantId, email, deleted_at: null },
  });
}

export async function createUser(
  tenantId: string,
  supabaseId: string,
  email: string,
  role: 'MANAGER' | 'WAITER'
) {
  return prisma.user.create({
    data: { tenant_id: tenantId, supabase_id: supabaseId, email, role },
  });
}

export async function findUserById(tenantId: string, userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId, deleted_at: null },
  });
}

export async function updateUserRole(userId: string, role: 'MANAGER' | 'WAITER') {
  return prisma.user.update({
    where: { id: userId },
    data: { role },
  });
}

export async function softDeleteUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { deleted_at: new Date() },
  });
}

export async function createAuditLog(
  tenantId: string,
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: userId ?? undefined,
      action,
      entity,
      entity_id: entityId,
      metadata: metadata as any,
    },
  });
}
