import bcrypt from 'bcrypt';
import { prisma } from '../../utils/prisma';
import { Role } from '@prisma/client';
import { AppError } from '../../middlewares/error.middleware';
import { signLocalJwt, verifyLocalJwt } from '../../utils/jwt';
import type { LocalJwtPayload } from '../../utils/jwt';

const SALT_ROUNDS = 10;

export interface StaffSession {
    userId: string;
    staffId: string;
    restaurantId: string;
    tenantId: string;
    loginId?: string;
    email: string;
    name: string;
    role: Role;
}

/**
 * Hash password for staff
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Login staff with email/phone/login_id and password
 * Returns access and refresh tokens
 */
export async function loginStaff(identifier: string, password: string) {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const normalizedEmail = isEmail ? trimmed.toLowerCase() : undefined;

    // Find active MANAGER/WAITER by email OR phone OR login_id
    const staff = await prisma.restaurantUser.findFirst({
        where: {
            role: { in: ['MANAGER', 'WAITER'] },
            user_id: { not: null },
            password_hash: { not: null },
            OR: [
                normalizedEmail ? { email: normalizedEmail } : undefined,
                { phone: trimmed },
                { login_id: trimmed }
            ].filter(Boolean) as any
        },
        include: {
            user: {
                select: { id: true },
            },
            restaurant: {
                select: { id: true, tenant_id: true, name: true, slug: true },
            },
        },
    });

    if (!staff) {
        throw new AppError('AUTH_FAILED', 'Invalid credentials', 401);
    }

    // Check if staff is active
    if (!staff.is_active) {
        throw new AppError('ACCOUNT_INACTIVE', 'Your account is not active. Please contact admin.', 403);
    }

    const isValidPassword = await verifyPassword(password, staff.password_hash);
    if (!isValidPassword) {
        throw new AppError('AUTH_FAILED', 'Invalid credentials', 401);
    }

    // Generate access and refresh tokens using local JWT
    const tokenPayload = {
        userId: staff.user_id,
        tenantId: staff.restaurant.tenant_id,
        role: staff.role as 'OWNER' | 'MANAGER' | 'WAITER',
    };

    const accessToken = signLocalJwt(tokenPayload, 'access');
    const refreshToken = signLocalJwt(tokenPayload, 'refresh');

    return {
        accessToken,
        refreshToken,
        user: {
            id: staff.user_id,
            tenantId: staff.restaurant.tenant_id,
            role: staff.role,
            email: staff.email,
            phone: staff.phone,
            allowed_restaurant_ids: [staff.restaurant_id],
        },
        staff: {
            id: staff.id,
            loginId: staff.login_id,
            email: staff.email,
            name: staff.name,
            phone: staff.phone,
            profileImageUrl: staff.profile_image_url,
            role: staff.role,
            completedOrdersCount: staff.completed_orders_count,
        },
        restaurant: {
            id: staff.restaurant.id,
            tenantId: staff.restaurant.tenant_id,
            name: staff.restaurant.name,
            slug: staff.restaurant.slug,
        },
    };
}

/**
 * Get current staff info from token
 */
export async function getStaffMe(userId: string) {
    // Find the user's restaurant staff record
    const staff = await prisma.restaurantUser.findFirst({
        where: {
            user_id: userId,
            role: { in: ['MANAGER', 'WAITER'] },
        },
        include: {
            restaurant: {
                select: { id: true, name: true, slug: true, tenant_id: true },
            },
        },
    });

    if (!staff) {
        throw new AppError('STAFF_NOT_FOUND', 'Staff record not found', 404);
    }

    if (!staff.is_active) {
        throw new AppError('ACCOUNT_INACTIVE', 'Your account has been deactivated', 403);
    }

    // Get today's completed orders count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompletedOrders = await prisma.order.count({
        where: {
            waiter_id: staff.id,
            payment_status: 'PAID',
            paid_at: {
                gte: today,
            },
        },
    });

    return {
        user: {
            id: userId,
            tenantId: staff.restaurant.tenant_id,
            role: staff.role,
            email: staff.email,
            phone: staff.phone,
            allowed_restaurant_ids: [staff.restaurant_id],
        },
        staff: {
            id: staff.id,
            loginId: staff.login_id,
            name: staff.name,
            phone: staff.phone,
            profileImageUrl: staff.profile_image_url,
            role: staff.role,
            completedOrdersCount: staff.completed_orders_count,
            todayCompletedOrders,
        },
        restaurant: {
            id: staff.restaurant.id,
            tenantId: staff.restaurant.tenant_id,
            name: staff.restaurant.name,
            slug: staff.restaurant.slug,
        },
    };
}

/**
 * Logout - stateless, client discards tokens
 */
export async function logoutStaff() {
    return { success: true, message: 'Logged out successfully' };
}

// Backward-compatible alias
export const loginWaiter = loginStaff;
