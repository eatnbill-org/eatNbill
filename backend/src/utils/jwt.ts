import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env';

export type VerifiedJwt = {
  payload: JWTPayload;
};

export type LocalJwtPayload = {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'MANAGER' | 'WAITER';
  supabaseId?: string; // Keep for backwards compatibility with Supabase operations
  resetNonce?: string;
  type: 'access' | 'refresh' | 'password_reset';
};

// ==========================================
// LOCAL JWT (Primary method - fast, no external calls)
// ==========================================

/**
 * Sign a local JWT with our own secret
 * Used for access and refresh tokens
 */
export function signLocalJwt(
  payload: Omit<LocalJwtPayload, 'type'>,
  type: 'access' | 'refresh' | 'password_reset'
): string {
  const expiresIn =
    type === 'access'
      ? env.JWT_ACCESS_EXPIRY
      : type === 'refresh'
        ? env.JWT_REFRESH_EXPIRY
        : env.JWT_PASSWORD_RESET_EXPIRY;
  
  const options: SignOptions = {
    expiresIn: expiresIn as any,
    issuer: 'eatnbill-api',
    audience: 'eatnbill-app',
  };
  
  return jwt.sign({ ...payload, type }, env.JWT_SECRET, options);
}

/**
 * Verify a local JWT signed with our secret
 * Fast - no external calls
 */
export function verifyLocalJwt(token: string): LocalJwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'eatnbill-api',
      audience: 'eatnbill-app',
    }) as LocalJwtPayload;

    return decoded;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Decode JWT without verification (for inspection only)
 */
export function decodeJwt(token: string): any {
  return jwt.decode(token);
}

// ==========================================
// SUPABASE JWT (Legacy - only for migration/backward compatibility)
// ==========================================

// Supabase JWKS (cached internally by jose)
const supabaseJwks = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export async function verifySupabaseJwt(token: string): Promise<VerifiedJwt> {
  try {
    const { payload } = await jwtVerify(token, supabaseJwks, {
      audience: env.JWT_AUDIENCE,
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });

    return { payload };
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}
