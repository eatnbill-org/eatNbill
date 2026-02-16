import { prisma } from '../../utils/prisma';
import type { Prisma, Role } from '@prisma/client';
import { generateUniqueRestaurantSlug } from '../../utils/slug';

export async function createRestaurant(
  tenantId: string,
  userId: string,
  data: {
    name: string;
    address?: string | null;
    gst_number?: string | null;
  }
) {
  // Generate unique slug from name and address
  const slug = await generateUniqueRestaurantSlug(data.name, data.address);

  const restaurant = await prisma.restaurant.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      slug,
      address: data.address,
      gst_number: data.gst_number,
    },
  });

  // Create restaurant user assignment for the creator (as OWNER)
  await prisma.restaurantUser.create({
    data: {
      restaurant_id: restaurant.id,
      user_id: userId,
      role: 'OWNER',
      is_active: true,
    },
  });

  return restaurant;
}

export async function getRestaurantById(tenantId: string, userId: string, restaurantId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, tenant_id: tenantId, deleted_at: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      address: true,
      gst_number: true,
      tagline: true,
      restaurant_type: true,
      phone: true,
      email: true,
      opening_hours: true,
      closing_hours: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!restaurant) return null;

  // Fetch Current User's email and phone (Manager or Owner)
  // This satisfies the requirement: "Manager side main email and number main manager ka email and number show hona chahiye"
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, role: true }
  });

  // If we have a user, we use their email/phone for the profile view
  // Otherwise fallback to restaurant table fields
  return {
    ...restaurant,
    email: currentUser?.email || restaurant.email,
    phone: currentUser?.phone || restaurant.phone,
    // Add current user role for context if needed
    user_role: currentUser?.role
  };
}

export async function updateRestaurantProfile(
  restaurantId: string,
  tenantId: string,
  userId: string,
  userRole: string,
  data: {
    name?: string;
    slug?: string;
    logo_url?: string | null;
    address?: string | null;
    gst_number?: string | null;
    tagline?: string | null;
    restaurant_type?: string | null;
    phone?: string | null;
    email?: string | null;
    opening_hours?: any;
    closing_hours?: any;
  }
) {
  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url ?? undefined,
      address: data.address ?? undefined,
      gst_number: data.gst_number ?? undefined,
      tagline: data.tagline ?? undefined,
      restaurant_type: data.restaurant_type ?? undefined,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      opening_hours: data.opening_hours ?? undefined,
      closing_hours: data.closing_hours ?? undefined,
    },
  });

  // Sync with Tenant if name changed
  if (data.name) {
    await prisma.tenant.update({
      where: { id: restaurant.tenant_id },
      data: { name: data.name },
    });
  }

  // Update CURRENT User's email and phone if provided (Sync with User table)
  // This ensures that when an Admin or Manager saves, THEIR info is updated in the User table.
  if (data.email || data.phone) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: data.email ?? undefined,
        phone: data.phone ?? undefined
      }
    });
  }

  return restaurant;
}

export async function getRestaurantSettings(restaurantId: string) {
  return prisma.restaurantSettings.findUnique({
    where: { restaurant_id: restaurantId },
  });
}

export async function upsertRestaurantSettings(
  restaurantId: string,
  data: {
    opening_hours?: Prisma.InputJsonValue | null;
    currency?: string;
    tax_included?: boolean;
  }
) {
  return prisma.restaurantSettings.upsert({
    where: { restaurant_id: restaurantId },
    create: {
      restaurant_id: restaurantId,
      opening_hours: data.opening_hours ?? undefined,
      currency: data.currency ?? 'INR',
      tax_included: data.tax_included ?? true,
    },
    update: {
      opening_hours: data.opening_hours ?? undefined,
      currency: data.currency ?? undefined,
      tax_included: data.tax_included ?? undefined,
    },
  });
}

export async function getRestaurantThemeSettings(restaurantId: string) {
  return prisma.restaurantThemeSettings.findUnique({
    where: { restaurant_id: restaurantId },
  });
}

export async function upsertRestaurantThemeSettings(
  restaurantId: string,
  data: {
    theme_id: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_scale?: 'SM' | 'MD' | 'LG';
  }
) {
  return prisma.restaurantThemeSettings.upsert({
    where: { restaurant_id: restaurantId },
    create: {
      restaurant_id: restaurantId,
      theme_id: data.theme_id,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      accent_color: data.accent_color,
      font_scale: data.font_scale ?? 'MD',
    },
    update: {
      theme_id: data.theme_id,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      accent_color: data.accent_color,
      font_scale: data.font_scale ?? 'MD',
    },
  });
}

export async function listRestaurantUsers(restaurantId: string) {
  return prisma.restaurantUser.findMany({
    where: { restaurant_id: restaurantId },
    select: {
      id: true,
      user_id: true,
      role: true,
      is_active: true,
      created_at: true,
      user: {
        select: {
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getRestaurantUserById(restaurantUserId: string) {
  return prisma.restaurantUser.findUnique({
    where: { id: restaurantUserId },
  });
}

export async function countActiveAdmins(restaurantId: string) {
  return prisma.restaurantUser.count({
    where: { restaurant_id: restaurantId, role: 'OWNER', is_active: true },
  });
}

export async function createRestaurantUser(
  restaurantId: string,
  data: {
    user_id: string;
    role: Role;
    is_active?: boolean;
  }
) {
  return prisma.restaurantUser.create({
    data: {
      restaurant_id: restaurantId,
      user_id: data.user_id,
      role: data.role,
      is_active: data.is_active ?? true,
    },
  });
}

export async function updateRestaurantUser(
  restaurantUserId: string,
  data: {
    role?: Role;
    is_active?: boolean;
  }
) {
  return prisma.restaurantUser.update({
    where: { id: restaurantUserId },
    data: {
      role: data.role,
      is_active: data.is_active,
    },
  });
}

export async function deleteRestaurantUser(restaurantUserId: string) {
  return prisma.restaurantUser.delete({
    where: { id: restaurantUserId },
  });
}

export async function listHalls(restaurantId: string) {
  return prisma.restaurantHall.findMany({
    where: { restaurant_id: restaurantId },
    orderBy: { created_at: 'asc' },
  });
}

export async function createHall(
  restaurantId: string,
  data: { name: string; is_ac?: boolean }
) {
  return prisma.restaurantHall.create({
    data: {
      restaurant_id: restaurantId,
      name: data.name,
      is_ac: data.is_ac ?? false,
    },
  });
}

export async function updateHall(
  hallId: string,
  data: { name?: string; is_ac?: boolean }
) {
  return prisma.restaurantHall.update({
    where: { id: hallId },
    data: {
      name: data.name,
      is_ac: data.is_ac,
    },
  });
}

export async function deleteHall(hallId: string) {
  return prisma.restaurantHall.delete({
    where: { id: hallId },
  });
}

export async function listTables(restaurantId: string) {
  return prisma.restaurantTable.findMany({
    where: { restaurant_id: restaurantId },
    include: {
      hall: true,
      qr_code: true,
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function createTable(
  restaurantId: string,
  data: { hall_id: string; table_number: string; seats: number; is_active?: boolean }
) {
  return prisma.restaurantTable.create({
    data: {
      restaurant_id: restaurantId,
      hall_id: data.hall_id,
      table_number: data.table_number,
      seats: data.seats,
      is_active: data.is_active ?? true,
    },
    include: { hall: true },
  });
}

export async function updateTable(
  tableId: string,
  data: { hall_id?: string; table_number?: string; seats?: number; is_active?: boolean }
) {
  return prisma.restaurantTable.update({
    where: { id: tableId },
    data: {
      hall_id: data.hall_id,
      table_number: data.table_number,
      seats: data.seats,
      is_active: data.is_active,
    },
    include: { hall: true },
  });
}

export async function updateTableStatus(
  tableId: string,
  tableStatus: 'AVAILABLE' | 'RESERVED'
) {
  return prisma.restaurantTable.update({
    where: { id: tableId },
    data: {
      table_status: tableStatus,
    },
    include: { hall: true },
  });
}

export async function hasActiveDineInOrdersForTable(tableId: string) {
  const count = await prisma.order.count({
    where: {
      table_id: tableId,
      order_type: 'DINE_IN',
      status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] },
    },
  });
  return count > 0;
}

export async function deleteTable(tableId: string) {
  return prisma.restaurantTable.delete({
    where: { id: tableId },
  });
}

export async function getTableWithHall(restaurantId: string, tableId: string) {
  return prisma.restaurantTable.findFirst({
    where: { id: tableId, restaurant_id: restaurantId },
    include: { hall: true, restaurant: true },
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

// Dashboard Analytics
export async function getDashboardAnalytics(tenantId: string, restaurantId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Today's orders by status
  const todayOrders = await prisma.order.groupBy({
    by: ['status'],
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      placed_at: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    _count: { id: true },
    _sum: { total_amount: true },
  });

  // Today's revenue (completed orders only)
  const todayRevenue = await prisma.order.aggregate({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: 'COMPLETED',
      completed_at: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    _sum: { total_amount: true },
    _count: { id: true },
  });

  // Active orders (not completed or cancelled)
  const activeOrders = await prisma.order.count({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      status: {
        in: ['ACTIVE'],
      },
    },
  });

  // Active tables (tables with active orders)
  const activeTables = await prisma.restaurantTable.count({
    where: {
      restaurant_id: restaurantId,
      is_active: true,
      orders: {
        some: {
          status: {
            in: ['ACTIVE'],
          },
        },
      },
    },
  });

  // Top 5 products (by order count today)
  const topProducts = await prisma.orderItem.groupBy({
    by: ['product_id', 'name_snapshot'],
    where: {
      order: {
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        placed_at: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    },
    _sum: { quantity: true },
    _count: { id: true },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 5,
  });

  // Recent orders (last 10)
  const recentOrders = await prisma.order.findMany({
    where: {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
    },
    orderBy: { placed_at: 'desc' },
    take: 10,
    select: {
      id: true,
      order_number: true,
      customer_name: true,
      total_amount: true,
      status: true,
      order_type: true,
      placed_at: true,
      table_number: true,
    },
  });

  // Staff on duty (active restaurant users)
  const staffOnDuty = await prisma.restaurantUser.count({
    where: {
      restaurant_id: restaurantId,
      is_active: true,
    },
  });

  return {
    todayOrders: todayOrders.map((o) => ({
      status: o.status,
      count: o._count.id,
      total: o._sum.total_amount || 0,
    })),
    todayRevenue: {
      total: todayRevenue._sum.total_amount || 0,
      count: todayRevenue._count.id,
    },
    activeOrders,
    activeTables,
    topProducts: topProducts.map((p) => ({
      product_id: p.product_id,
      name: p.name_snapshot,
      quantity: p._sum.quantity || 0,
      order_count: p._count.id,
    })),
    recentOrders,
    staffOnDuty,
  };
}

// List restaurants for user (for multi-restaurant switcher)
export async function listUserRestaurants(
  tenantId: string,
  userId: string,
  userRole: string
) {
  // If OWNER, return all restaurants in tenant
  if (userRole === 'OWNER') {
    return prisma.restaurant.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Otherwise, return only restaurants user has access to
  const restaurantUsers = await prisma.restaurantUser.findMany({
    where: {
      user_id: userId,
      is_active: true,
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo_url: true,
          tenant_id: true,
          deleted_at: true,
        },
      },
    },
  });

  return restaurantUsers
    .filter((ru) => ru.restaurant.tenant_id === tenantId && !ru.restaurant.deleted_at)
    .map((ru) => ({
      id: ru.restaurant.id,
      name: ru.restaurant.name,
      slug: ru.restaurant.slug,
      logo_url: ru.restaurant.logo_url,
      role: ru.role,
    }));
}

// Get all restaurants by tenant (simple version without user filtering)
export async function getUserRestaurantsByTenant(tenantId: string) {
  return prisma.restaurant.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
    },
    orderBy: { name: 'asc' },
  });
}

// ============================================================================
// Table QR Code Repository Functions
// ============================================================================

export async function createTableQRCode(data: {
  table_id: string;
  menu_url: string;
  qr_png_path: string;
  qr_pdf_path: string;
  qr_png_url?: string;
  qr_pdf_url?: string;
}) {
  return prisma.tableQRCode.create({
    data: {
      table_id: data.table_id,
      menu_url: data.menu_url,
      qr_png_path: data.qr_png_path,
      qr_pdf_path: data.qr_pdf_path,
      qr_png_url: data.qr_png_url,
      qr_pdf_url: data.qr_pdf_url,
    },
  });
}

export async function updateTableQRCode(
  tableId: string,
  data: {
    menu_url?: string;
    qr_png_path?: string;
    qr_pdf_path?: string;
    qr_png_url?: string;
    qr_pdf_url?: string;
  }
) {
  return prisma.tableQRCode.update({
    where: { table_id: tableId },
    data: {
      menu_url: data.menu_url,
      qr_png_path: data.qr_png_path,
      qr_pdf_path: data.qr_pdf_path,
      qr_png_url: data.qr_png_url,
      qr_pdf_url: data.qr_pdf_url,
    },
  });
}

export async function getTableQRCode(tableId: string) {
  return prisma.tableQRCode.findUnique({
    where: { table_id: tableId },
  });
}

export async function deleteTableQRCode(tableId: string) {
  return prisma.tableQRCode.delete({
    where: { table_id: tableId },
  });
}

export async function upsertTableQRCode(data: {
  table_id: string;
  menu_url: string;
  qr_png_path: string;
  qr_pdf_path: string;
  qr_png_url?: string;
  qr_pdf_url?: string;
}) {
  return prisma.tableQRCode.upsert({
    where: { table_id: data.table_id },
    create: {
      table_id: data.table_id,
      menu_url: data.menu_url,
      qr_png_path: data.qr_png_path,
      qr_pdf_path: data.qr_pdf_path,
      qr_png_url: data.qr_png_url,
      qr_pdf_url: data.qr_pdf_url,
    },
    update: {
      menu_url: data.menu_url,
      qr_png_path: data.qr_png_path,
      qr_pdf_path: data.qr_pdf_path,
      qr_png_url: data.qr_png_url,
      qr_pdf_url: data.qr_pdf_url,
    },
  });
}
