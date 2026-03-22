import { prisma } from '../../utils/prisma';
import type { Prisma, Role, ReservationStatus } from '@prisma/client';
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
      fssai_license: true,
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
    fssai_license?: string | null;
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
      fssai_license: data.fssai_license ?? undefined,
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
    include: { outlet: true },
    orderBy: { created_at: 'asc' },
  });
}

export async function createHall(
  restaurantId: string,
  data: { name: string; is_ac?: boolean; outlet_id?: string }
) {
  return prisma.restaurantHall.create({
    data: {
      restaurant_id: restaurantId,
      outlet_id: data.outlet_id ?? null,
      name: data.name,
      is_ac: data.is_ac ?? false,
    },
    include: { outlet: true },
  });
}

export async function updateHall(
  hallId: string,
  data: { name?: string; is_ac?: boolean; outlet_id?: string }
) {
  return prisma.restaurantHall.update({
    where: { id: hallId },
    data: {
      name: data.name,
      is_ac: data.is_ac,
      outlet_id: data.outlet_id ?? undefined,
    },
    include: { outlet: true },
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
      outlet: true,
      qr_code: true,
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function createTable(
  restaurantId: string,
  data: { hall_id: string; outlet_id?: string; table_number: string; seats: number; is_active?: boolean }
) {
  return prisma.restaurantTable.create({
    data: {
      restaurant_id: restaurantId,
      hall_id: data.hall_id,
      outlet_id: data.outlet_id ?? null,
      table_number: data.table_number,
      seats: data.seats,
      is_active: data.is_active ?? true,
    },
    include: { hall: true, outlet: true },
  });
}

export async function findExistingTableNumbers(
  restaurantId: string,
  tableNumbers: string[]
) {
  if (tableNumbers.length === 0) {
    return [];
  }

  const rows = await prisma.restaurantTable.findMany({
    where: {
      restaurant_id: restaurantId,
      table_number: { in: tableNumbers },
    },
    select: {
      table_number: true,
    },
  });

  return rows.map((row) => row.table_number);
}

export async function updateTable(
  tableId: string,
  data: { hall_id?: string; outlet_id?: string; table_number?: string; seats?: number; is_active?: boolean }
) {
  return prisma.restaurantTable.update({
    where: { id: tableId },
    data: {
      hall_id: data.hall_id,
      outlet_id: data.outlet_id ?? undefined,
      table_number: data.table_number,
      seats: data.seats,
      is_active: data.is_active,
    },
    include: { hall: true, outlet: true },
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
      status: { in: ['ACTIVE'] },
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
    include: { hall: true, outlet: true, restaurant: true },
  });
}

export async function listTableReservations(params: {
  restaurantId: string;
  from?: Date;
  to?: Date;
  status?: ReservationStatus;
  tableId?: string;
}) {
  return prisma.tableReservation.findMany({
    where: {
      restaurant_id: params.restaurantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tableId ? { table_id: params.tableId } : {}),
      ...((params.from || params.to)
        ? {
            reserved_from: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    },
    include: {
      table: {
        include: {
          hall: true,
          outlet: true,
        },
      },
      outlet: true,
    },
    orderBy: [
      { reserved_from: 'asc' },
      { created_at: 'asc' },
    ],
  });
}

export async function getTableReservationById(restaurantId: string, reservationId: string) {
  return prisma.tableReservation.findFirst({
    where: {
      id: reservationId,
      restaurant_id: restaurantId,
    },
    include: {
      table: {
        include: { hall: true, outlet: true },
      },
      outlet: true,
    },
  });
}

export async function createTableReservation(data: {
  tenant_id: string;
  restaurant_id: string;
  outlet_id?: string | null;
  table_id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  party_size: number;
  reserved_from: Date;
  reserved_to: Date;
  notes?: string | null;
  status?: ReservationStatus;
  created_by_user_id?: string | null;
}) {
  return prisma.tableReservation.create({
    data: {
      tenant_id: data.tenant_id,
      restaurant_id: data.restaurant_id,
      outlet_id: data.outlet_id ?? null,
      table_id: data.table_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone ?? null,
      customer_email: data.customer_email ?? null,
      party_size: data.party_size,
      reserved_from: data.reserved_from,
      reserved_to: data.reserved_to,
      notes: data.notes ?? null,
      status: data.status ?? 'BOOKED',
      created_by_user_id: data.created_by_user_id ?? null,
    },
    include: {
      table: {
        include: { hall: true, outlet: true },
      },
      outlet: true,
    },
  });
}

export async function updateTableReservation(reservationId: string, data: {
  table_id?: string;
  outlet_id?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  party_size?: number;
  reserved_from?: Date;
  reserved_to?: Date;
  notes?: string | null;
  status?: ReservationStatus;
}) {
  return prisma.tableReservation.update({
    where: { id: reservationId },
    data: {
      ...(data.table_id ? { table_id: data.table_id } : {}),
      ...(data.outlet_id !== undefined ? { outlet_id: data.outlet_id } : {}),
      ...(data.customer_name ? { customer_name: data.customer_name } : {}),
      ...(data.customer_phone !== undefined ? { customer_phone: data.customer_phone } : {}),
      ...(data.customer_email !== undefined ? { customer_email: data.customer_email } : {}),
      ...(data.party_size ? { party_size: data.party_size } : {}),
      ...(data.reserved_from ? { reserved_from: data.reserved_from } : {}),
      ...(data.reserved_to ? { reserved_to: data.reserved_to } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.status === 'CANCELLED' ? { cancelled_at: new Date() } : {}),
      ...(data.status && data.status !== 'CANCELLED' ? { cancelled_at: null } : {}),
    },
    include: {
      table: {
        include: { hall: true, outlet: true },
      },
      outlet: true,
    },
  });
}

export async function deleteTableReservation(reservationId: string) {
  return prisma.tableReservation.delete({
    where: { id: reservationId },
  });
}

export async function findReservationConflict(params: {
  restaurantId: string;
  tableId: string;
  reservedFrom: Date;
  reservedTo: Date;
  excludeReservationId?: string;
}) {
  return prisma.tableReservation.findFirst({
    where: {
      restaurant_id: params.restaurantId,
      table_id: params.tableId,
      status: { in: ['BOOKED', 'SEATED'] },
      ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
      reserved_from: { lt: params.reservedTo },
      reserved_to: { gt: params.reservedFrom },
    },
    select: {
      id: true,
      customer_name: true,
      reserved_from: true,
      reserved_to: true,
      status: true,
    },
  });
}

export async function getReservationContextForTables(restaurantId: string, tableIds: string[]) {
  if (tableIds.length === 0) return [];

  const now = new Date();
  return prisma.tableReservation.findMany({
    where: {
      restaurant_id: restaurantId,
      table_id: { in: tableIds },
      status: { in: ['BOOKED', 'SEATED'] },
      reserved_to: { gte: now },
    },
    select: {
      id: true,
      table_id: true,
      outlet_id: true,
      customer_name: true,
      customer_phone: true,
      customer_email: true,
      party_size: true,
      reserved_from: true,
      reserved_to: true,
      notes: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      reserved_from: 'asc',
    },
  });
}

export async function listTableAvailability(restaurantId: string, startAt: Date, endAt: Date) {
  const [tables, conflicts] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: {
        restaurant_id: restaurantId,
        is_active: true,
      },
      include: {
        hall: true,
        outlet: true,
        qr_code: true,
      },
      orderBy: { created_at: 'asc' },
    }),
    prisma.tableReservation.findMany({
      where: {
        restaurant_id: restaurantId,
        status: { in: ['BOOKED', 'SEATED'] },
        reserved_from: { lt: endAt },
        reserved_to: { gt: startAt },
      },
      select: {
        id: true,
        table_id: true,
        outlet_id: true,
        customer_name: true,
        customer_phone: true,
        customer_email: true,
        party_size: true,
        reserved_from: true,
        reserved_to: true,
        status: true,
      },
      orderBy: { reserved_from: 'asc' },
    }),
  ]);

  const conflictsByTable = conflicts.reduce<Record<string, typeof conflicts>>((acc, reservation) => {
    const key = reservation.table_id;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(reservation);
    return acc;
  }, {});

  return tables.map((table) => ({
    ...table,
    is_available: !conflictsByTable[table.id]?.length,
    conflicting_reservations: conflictsByTable[table.id] ?? [],
  }));
}

export async function listReservationAlerts(restaurantId: string, from: Date, to: Date) {
  const alerts = await prisma.tableReservation.findMany({
    where: {
      restaurant_id: restaurantId,
      status: { in: ['BOOKED', 'SEATED'] },
      OR: [
        {
          reserved_from: {
            gte: from,
            lte: to,
          },
        },
        {
          reserved_from: {
            gte: new Date(from.getTime() + 10 * 60 * 1000),
            lte: new Date(to.getTime() + 10 * 60 * 1000),
          },
        },
      ],
    },
    include: {
      table: {
        include: { hall: true, outlet: true },
      },
      outlet: true,
    },
    orderBy: { reserved_from: 'asc' },
  });

  const dueAlerts: Array<{
    event_type: 'T_MINUS_10' | 'START';
    reservation: typeof alerts[number];
    event_at: Date;
  }> = [];

  for (const reservation of alerts) {
    const startAt = reservation.reserved_from;
    const tMinus10At = new Date(startAt.getTime() - 10 * 60 * 1000);

    if (tMinus10At >= from && tMinus10At <= to) {
      dueAlerts.push({
        event_type: 'T_MINUS_10',
        reservation,
        event_at: tMinus10At,
      });
    }

    if (startAt >= from && startAt <= to) {
      dueAlerts.push({
        event_type: 'START',
        reservation,
        event_at: startAt,
      });
    }
  }

  return dueAlerts.sort((a, b) => a.event_at.getTime() - b.event_at.getTime());
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

export async function getStaffPerformanceAnalytics(
  restaurantId: string,
  filters: { from_date?: string; to_date?: string; outlet_id?: string }
) {
  const where: any = {
    restaurant_id: restaurantId,
    waiter_id: { not: null },
    status: 'COMPLETED',
    payment_status: 'PAID',
  };

  if (filters.from_date) {
    where.placed_at = { ...(where.placed_at || {}), gte: new Date(filters.from_date) };
  }
  if (filters.to_date) {
    const toDate = new Date(filters.to_date);
    toDate.setDate(toDate.getDate() + 1);
    where.placed_at = { ...(where.placed_at || {}), lt: toDate };
  }
  if (filters.outlet_id) {
    where.outlet_id = filters.outlet_id;
  }

  const orders = await prisma.order.groupBy({
    by: ['waiter_id'],
    where,
    _count: { id: true },
    _sum: { total_amount: true, discount_amount: true },
    _avg: { total_amount: true },
  });

  if (orders.length === 0) return [];

  const waiterIds = orders.map((o) => o.waiter_id as string);
  const waiters = await prisma.restaurantUser.findMany({
    where: { id: { in: waiterIds } },
    select: { id: true, name: true, email: true, role: true, shift_detail: true, is_active: true },
  });

  const waiterMap = new Map(waiters.map((w) => [w.id, w]));

  return orders.map((row) => {
    const waiter = waiterMap.get(row.waiter_id as string);
    return {
      waiter_id: row.waiter_id,
      name: waiter?.name || waiter?.email || 'Unknown',
      role: waiter?.role,
      shift_detail: waiter?.shift_detail,
      is_active: waiter?.is_active,
      order_count: row._count.id,
      total_revenue: Number(row._sum.total_amount ?? 0),
      total_discount: Number(row._sum.discount_amount ?? 0),
      avg_order_value: Number(row._avg.total_amount ?? 0),
    };
  });
}
