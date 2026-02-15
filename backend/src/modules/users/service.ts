import { supabaseAdmin } from '../../utils/supabase';
import { AppError } from '../../middlewares/error.middleware';
import {
  createAuditLog,
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  softDeleteUser,
  updateUserRole,
} from './repository';

export async function listTenantUsers(tenantId: string) {
  return listUsers(tenantId);
}

export async function inviteUser(
  tenantId: string,
  actorId: string,
  email: string,
  role: 'MANAGER' | 'WAITER'
) {
  const existing = await findUserByEmail(tenantId, email);
  if (existing) {
    throw new AppError('CONFLICT', 'User already exists', 409);
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) {
    throw new AppError('INVITE_FAILED', error?.message ?? 'Invite failed', 400);
  }

  const user = await createUser(tenantId, data.user.id, email, role);
  await createAuditLog(tenantId, actorId, 'CREATE', 'USER', user.id, { role });

  return { id: user.id, email: user.email, role: user.role };
}

export async function changeUserRole(
  tenantId: string,
  actorId: string,
  targetUserId: string,
  role: 'MANAGER' | 'WAITER'
) {
  const user = await findUserById(tenantId, targetUserId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  if (user.role === 'OWNER') {
    throw new AppError('FORBIDDEN', 'Cannot downgrade OWNER', 403);
  }

  if (actorId === targetUserId) {
    throw new AppError('FORBIDDEN', 'Cannot self-demote', 403);
  }

  const updated = await updateUserRole(user.id, role);
  await createAuditLog(tenantId, actorId, 'UPDATE', 'USER', user.id, { role });

  return { id: updated.id, email: updated.email, role: updated.role };
}

export async function removeUser(
  tenantId: string,
  actorId: string,
  targetUserId: string
) {
  const user = await findUserById(tenantId, targetUserId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  await softDeleteUser(user.id);
  await createAuditLog(tenantId, actorId, 'DELETE', 'USER', user.id);

  return { success: true };
}
