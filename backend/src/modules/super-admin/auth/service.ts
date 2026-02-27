import { compare, hash } from 'bcrypt';
import { prisma } from '../../utils/prisma';
import { signLocalJwt, verifyLocalJwt } from '../../utils/jwt';
import { AppError } from '../../middlewares/error.middleware';
import { logSuperAdminAction } from '../middleware';

const SALT_ROUNDS = 12;

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Login super admin with email and password
 */
export async function loginSuperAdmin(email: string, password: string): Promise<LoginResult> {
  // Find admin by email
  const admin = await prisma.adminUser.findFirst({
    where: {
      email: email.toLowerCase(),
      is_active: true,
      deleted_at: null,
    },
  });
  
  if (!admin) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  
  // Verify password
  const isValidPassword = await compare(password, admin.password_hash || '');
  
  if (!isValidPassword) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  
  // Generate tokens
  const accessToken = signLocalJwt(
    {
      userId: admin.id,
      tenantId: 'platform', // Super admins don't belong to a tenant
      role: 'SUPER_ADMIN' as any,
      supabaseId: admin.supabase_id,
    },
    'access'
  );
  
  const refreshToken = signLocalJwt(
    {
      userId: admin.id,
      tenantId: 'platform',
      role: 'SUPER_ADMIN' as any,
      supabaseId: admin.supabase_id,
    },
    'refresh'
  );
  
  // Log the login action
  await logSuperAdminAction(
    admin.id,
    'LOGIN',
    'ADMIN_USER',
    admin.id,
    undefined,
    { ip_address: 'unknown' } // IP will be captured by middleware
  );
  
  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  };
}

/**
 * Refresh session with refresh token
 */
export async function refreshSession(refreshToken: string): Promise<LoginResult> {
  try {
    const payload = verifyLocalJwt(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new AppError('INVALID_TOKEN', 'Invalid token type', 401);
    }
    
    // Verify admin still exists and is active
    const admin = await prisma.adminUser.findFirst({
      where: {
        id: payload.userId,
        is_active: true,
        deleted_at: null,
      },
    });
    
    if (!admin) {
      throw new AppError('UNAUTHORIZED', 'Admin not found or inactive', 401);
    }
    
    // Generate new tokens
    const newAccessToken = signLocalJwt(
      {
        userId: admin.id,
        tenantId: 'platform',
        role: 'SUPER_ADMIN' as any,
        supabaseId: admin.supabase_id,
      },
      'access'
    );
    
    const newRefreshToken = signLocalJwt(
      {
        userId: admin.id,
        tenantId: 'platform',
        role: 'SUPER_ADMIN' as any,
        supabaseId: admin.supabase_id,
      },
      'refresh'
    );
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  } catch (error: any) {
    if (error.message === 'Token expired') {
      throw new AppError('TOKEN_EXPIRED', 'Refresh token expired', 401);
    }
    throw new AppError('INVALID_TOKEN', 'Invalid refresh token', 401);
  }
}

/**
 * Get admin by ID
 */
export async function getAdminById(adminId: string) {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });
  
  if (!admin) {
    throw new AppError('NOT_FOUND', 'Admin not found', 404);
  }
  
  return admin;
}

/**
 * Create a new super admin (for seeding)
 */
export async function createSuperAdmin(
  email: string,
  password: string,
  name?: string
) {
  // Check if admin already exists
  const existing = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (existing) {
    throw new AppError('CONFLICT', 'Admin with this email already exists', 409);
  }
  
  // Hash password
  const passwordHash = await hash(password, SALT_ROUNDS);
  
  // Create admin
  const admin = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name || null,
      supabase_id: `local_${Date.now()}`, // Generate a local supabase_id for non-supabase auth
      is_active: true,
    },
  });
  
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    created_at: admin.created_at,
  };
}
