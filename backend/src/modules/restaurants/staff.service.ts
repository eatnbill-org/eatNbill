import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middlewares/error.middleware';

interface CreateStaffInput {
    name: string;
    role: 'MANAGER' | 'WAITER';
    email?: string;
    phone?: string;
    password?: string;
    address?: string;
    salary?: string;
    shiftDetail?: string;
}

interface UpdateStaffInput {
    name?: string;
    role?: 'MANAGER' | 'WAITER';
    email?: string;
    phone?: string;
    password?: string;
    address?: string;
    isActive?: boolean;
    salary?: string;
    shiftDetail?: string;
}

function normalizeEmail(email?: string) {
    const value = email?.trim().toLowerCase();
    return value ? value : undefined;
}

function normalizePhone(phone?: string) {
    const value = phone?.trim();
    return value ? value : undefined;
}

function toStaffDto(s: any) {
    return {
        id: s.id,
        name: s.name,
        role: s.role,
        email: s.email,
        phone: s.phone,
        address: s.address,
        isActive: s.is_active,
        salary: s.salary?.toString(),
        shiftDetail: s.shift_detail,
        createdAt: s.created_at,
    };
}

export async function createStaff(
    tenantId: string,
    restaurantId: string,
    input: CreateStaffInput
) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    if (input.role === 'MANAGER') {
        if (!email || !phone) {
            throw new AppError('VALIDATION_FAILED', 'Email and phone are required for managers', 400);
        }
        if (!input.password) {
            throw new AppError('VALIDATION_FAILED', 'Password is required for managers', 400);
        }
    }

    if (email || phone) {
        const existing = await prisma.restaurantUser.findFirst({
            where: {
                OR: [
                    email ? { email } : undefined,
                    phone ? { phone } : undefined,
                ].filter(Boolean) as any,
            },
        });

        if (existing) {
            if (input.role === 'MANAGER' || existing.role === 'MANAGER') {
                throw new AppError('STAFF_EXISTS', 'Email or phone already used by a manager', 400);
            }
        }
    }

    let passwordHash: string | undefined;
    let userId: string | null = null;

    if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
    }

    if (input.role === 'MANAGER') {
        const userEmail = email || `staff-${crypto.randomUUID()}@local.rbs`;

        const user = await prisma.user.create({
            data: {
                tenant_id: tenantId,
                email: userEmail,
                phone: phone,
                role: input.role,
                is_active: true,
                email_verified: true,
                password_hash: passwordHash,
            },
        });
        userId = user.id;
    }

    const staff = await prisma.restaurantUser.create({
        data: {
            restaurant_id: restaurantId,
            user_id: userId,
            role: input.role,
            name: input.name,
            email,
            phone,
            address: input.address,
            password_hash: passwordHash,
            salary: input.salary ? parseFloat(input.salary) : null,
            shift_detail: input.shiftDetail,
            is_active: true,
            is_shared_login: false,
        },
    });

    return toStaffDto(staff);
}

export async function listStaff(_tenantId: string, restaurantId: string) {
    if (!restaurantId || restaurantId === 'undefined') {
        return [];
    }

    const staffList = await prisma.restaurantUser.findMany({
        where: {
            restaurant_id: restaurantId,
            role: { in: ['MANAGER', 'WAITER'] },
            is_shared_login: false,
        },
        orderBy: {
            created_at: 'desc',
        },
    });

    return staffList.map(toStaffDto);
}

export async function getStaffDetails(tenantId: string, staffId: string) {
    const staff = await prisma.restaurantUser.findFirst({
        where: {
            id: staffId,
            restaurant: { tenant_id: tenantId },
        },
    });

    if (!staff || (staff.role !== 'MANAGER' && staff.role !== 'WAITER')) {
        throw new AppError('STAFF_NOT_FOUND', 'Staff member not found', 404);
    }
    if (staff.is_shared_login) {
        throw new AppError('STAFF_NOT_FOUND', 'Staff member not found', 404);
    }

    return {
        ...toStaffDto(staff),
        orders: [],
    };
}

export async function updateStaff(
    tenantId: string,
    staffId: string,
    input: UpdateStaffInput
) {
    const existing = await prisma.restaurantUser.findFirst({
        where: {
            id: staffId,
            restaurant: { tenant_id: tenantId },
        },
        include: { user: true },
    });

    if (!existing || (existing.role !== 'MANAGER' && existing.role !== 'WAITER')) {
        throw new AppError('STAFF_NOT_FOUND', 'Staff member not found', 404);
    }

    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const targetRole = input.role ?? existing.role;

    if (targetRole === 'MANAGER') {
        const managerEmail = email ?? existing.email;
        const managerPhone = phone ?? existing.phone;
        if (!managerEmail || !managerPhone) {
            throw new AppError('VALIDATION_FAILED', 'Email and phone are required for managers', 400);
        }

        if (email && email !== existing.email) {
            const duplicate = await prisma.restaurantUser.findFirst({
                where: { email, id: { not: staffId } },
            });
            if (duplicate) {
                throw new AppError('STAFF_EXISTS', 'Email already used by another staff', 400);
            }
        }

        if (phone && phone !== existing.phone) {
            const duplicate = await prisma.restaurantUser.findFirst({
                where: { phone, id: { not: staffId } },
            });
            if (duplicate) {
                throw new AppError('STAFF_EXISTS', 'Phone already used by another staff', 400);
            }
        }
    } else if (targetRole === 'WAITER') {
        if (email || phone) {
            const managerConflict = await prisma.restaurantUser.findFirst({
                where: {
                    role: 'MANAGER',
                    OR: [
                        email ? { email } : undefined,
                        phone ? { phone } : undefined,
                    ].filter(Boolean) as any,
                },
            });
            if (managerConflict) {
                throw new AppError('STAFF_EXISTS', 'Email or phone already used by a manager', 400);
            }
        }
    }

    let passwordHash: string | undefined;
    if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
    }
    if (targetRole === 'WAITER') {
        passwordHash = undefined;
    }

    if (targetRole === 'MANAGER' && !existing.user_id) {
        if (!passwordHash) {
            throw new AppError('VALIDATION_FAILED', 'Password is required to create manager login', 400);
        }

        const userEmail = email ?? existing.email ?? `staff-${crypto.randomUUID()}@local.rbs`;
        const userPhone = phone ?? existing.phone ?? null;

        const user = await prisma.user.create({
            data: {
                tenant_id: tenantId,
                email: userEmail,
                phone: userPhone,
                role: Role.MANAGER,
                is_active: true,
                email_verified: true,
                password_hash: passwordHash,
            },
        });

        existing.user_id = user.id;
    }

    const updated = await prisma.restaurantUser.update({
        where: { id: staffId },
        data: {
            name: input.name,
            role: input.role,
            email,
            phone,
            address: input.address,
            salary: input.salary ? parseFloat(input.salary) : undefined,
            shift_detail: input.shiftDetail,
            is_active: input.isActive,
            password_hash: targetRole === 'WAITER' ? null : passwordHash,
            user_id: targetRole === 'WAITER' ? null : (existing.user_id ?? undefined),
        },
    });

    if (existing.user_id) {
        const userUpdate =
            targetRole === 'WAITER'
                ? {
                    role: Role.WAITER,
                    is_active: false,
                    password_hash: null,
                }
                : {
                    role: input.role,
                    email: email || undefined,
                    phone,
                    is_active: input.isActive,
                    password_hash: passwordHash,
                };

        await prisma.user.update({
            where: { id: existing.user_id },
            data: userUpdate,
        }).catch(() => {
            // Keep staff update successful even if linked user update fails.
        });
    }

    return toStaffDto(updated);
}

export async function toggleStaffStatus(tenantId: string, staffId: string) {
    const existing = await prisma.restaurantUser.findFirst({
        where: {
            id: staffId,
            restaurant: { tenant_id: tenantId },
        },
    });

    if (!existing || (existing.role !== 'MANAGER' && existing.role !== 'WAITER')) {
        throw new AppError('STAFF_NOT_FOUND', 'Staff member not found', 404);
    }

    const updated = await prisma.restaurantUser.update({
        where: { id: staffId },
        data: { is_active: !existing.is_active },
    });

    if (updated.user_id) {
        await prisma.user.update({
            where: { id: updated.user_id },
            data: { is_active: updated.is_active },
        }).catch(() => {
            // Keep staff toggle successful even if linked user update fails.
        });
    }

    return {
        id: updated.id,
        isActive: updated.is_active,
        message: updated.is_active ? 'Staff activated' : 'Staff deactivated',
    };
}

export async function deleteStaff(tenantId: string, staffId: string) {
    const existing = await prisma.restaurantUser.findFirst({
        where: {
            id: staffId,
            restaurant: { tenant_id: tenantId },
        },
    });

    if (!existing || (existing.role !== 'MANAGER' && existing.role !== 'WAITER')) {
        throw new AppError('STAFF_NOT_FOUND', 'Staff member not found', 404);
    }

    await prisma.restaurantUser.update({
        where: { id: staffId },
        data: { is_active: false },
    });

    if (existing.user_id) {
        await prisma.user.update({
            where: { id: existing.user_id },
            data: { is_active: false },
        }).catch(() => {
            // Keep staff delete successful even if linked user update fails.
        });
    }

    return { success: true, message: 'Staff member deleted' };
}

export async function getSharedLoginDetails(restaurantId: string) {
    if (!restaurantId || restaurantId === 'undefined') {
        return { email: '', loginId: '' };
    }

    const sharedUser = await prisma.restaurantUser.findFirst({
        where: {
            restaurant_id: restaurantId,
            role: 'WAITER',
            is_shared_login: true,
        },
        select: {
            email: true,
            login_id: true,
        },
    });

    return {
        email: sharedUser?.email || '',
        loginId: sharedUser?.login_id || '',
    };
}

export async function updateSharedLoginCredentials(
    restaurantId: string,
    identifier: string,
    password?: string
) {
    if (!restaurantId || restaurantId === 'undefined') {
        throw new AppError('BAD_REQUEST', 'Restaurant ID is required', 400);
    }

    const restaurant = await prisma.restaurant.findFirst({
        where: { id: restaurantId },
        select: { tenant_id: true },
    });

    if (!restaurant) {
        throw new AppError('BAD_REQUEST', 'Restaurant not found', 400);
    }

    const existing = await prisma.restaurantUser.findFirst({
        where: {
            restaurant_id: restaurantId,
            role: 'WAITER',
            is_shared_login: true,
        },
    });

    const isEmail = identifier.includes('@');
    const normalizedIdentifier = isEmail ? identifier.trim().toLowerCase() : identifier.trim();

    const managerConflict = await prisma.restaurantUser.findFirst({
        where: {
            restaurant_id: restaurantId,
            role: 'MANAGER',
            OR: [
                isEmail ? { email: normalizedIdentifier } : undefined,
                !isEmail ? { phone: normalizedIdentifier } : undefined,
            ].filter(Boolean) as any,
        },
    });
    if (managerConflict) {
        throw new AppError('STAFF_EXISTS', 'Identifier already used by a manager', 400);
    }

    const data: any = {
        name: 'Shared Staff Account',
        is_active: true,
        is_shared_login: true,
        email: isEmail ? normalizedIdentifier : null,
        login_id: isEmail ? null : normalizedIdentifier,
        phone: isEmail ? null : normalizedIdentifier,
    };

    if (password) {
        data.password_hash = await bcrypt.hash(password, 10);
    }
    if (!existing && !data.password_hash) {
        throw new AppError('VALIDATION_FAILED', 'Password is required for shared login', 400);
    }
    if (existing && !data.password_hash && !existing.password_hash) {
        throw new AppError('VALIDATION_FAILED', 'Password is required for shared login', 400);
    }

    if (existing) {
        if (!existing.user_id) {
            const userEmail = isEmail
                ? normalizedIdentifier
                : `shared-waiter-${restaurantId}@local.rbs`;
            const user = await prisma.user.create({
                data: {
                    tenant_id: restaurant.tenant_id,
                    email: userEmail,
                    phone: isEmail ? null : normalizedIdentifier,
                    role: Role.WAITER,
                    is_active: true,
                    email_verified: true,
                    password_hash: data.password_hash ?? existing.password_hash ?? null,
                },
            });
            data.user_id = user.id;
        }

        const updated = await prisma.restaurantUser.update({
            where: { id: existing.id },
            data,
        });
        return { email: updated.email, loginId: updated.login_id };
    }

    const userEmail = isEmail
        ? normalizedIdentifier
        : `shared-waiter-${restaurantId}@local.rbs`;

    const user = await prisma.user.create({
        data: {
            tenant_id: restaurant.tenant_id,
            email: userEmail,
            phone: isEmail ? null : normalizedIdentifier,
            role: Role.WAITER,
            is_active: true,
            email_verified: true,
            password_hash: data.password_hash ?? null,
        },
    });

    const created = await prisma.restaurantUser.create({
        data: {
            ...data,
            restaurant_id: restaurantId,
            role: Role.WAITER,
            is_active: true,
            user_id: user.id,
        },
    });

    return { email: created.email, loginId: created.login_id };
}
