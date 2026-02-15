import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { AppError } from '../../middlewares/error.middleware';
import { env } from '../../env';
import {
  validateSlugFormat,
  isSlugAvailable,
  makeSlugUnique,
} from '../../utils/slug';
import {
  createAuditLog,
  createRestaurant,
  createHall,
  createRestaurantUser,
  createTable,
  deleteHall,
  deleteRestaurantUser,
  deleteTable,
  getRestaurantById,
  getRestaurantUserById,
  getRestaurantSettings,
  getRestaurantThemeSettings,
  getTableWithHall,
  listHalls,
  listRestaurantUsers,
  listTables,
  countActiveAdmins,
  updateHall,
  updateRestaurantProfile,
  updateRestaurantUser,
  updateTable,
  upsertRestaurantSettings,
  upsertRestaurantThemeSettings,
  getDashboardAnalytics,
  listUserRestaurants,
  getUserRestaurantsByTenant as getUserRestaurantsByTenantRepo,
  upsertTableQRCode,
  getTableQRCode,
} from './repository';
import { createSignedUrl, getPublicUrl, uploadToStorage, STORAGE_BUCKETS } from '../../utils/storage';

const THEME_PRESETS = {
  classic: { primary_color: '#065f46', secondary_color: '#ffffff', accent_color: '#d4af37', font_scale: 'MD' as const },
  modern: { primary_color: '#111827', secondary_color: '#f8fafc', accent_color: '#f97316', font_scale: 'MD' as const },
  minimal: { primary_color: '#111111', secondary_color: '#ffffff', accent_color: '#4b5563', font_scale: 'SM' as const },
  grid: { primary_color: '#1f2937', secondary_color: '#f3f4f6', accent_color: '#10b981', font_scale: 'MD' as const },
  dark: { primary_color: '#09090b', secondary_color: '#18181b', accent_color: '#f59e0b', font_scale: 'MD' as const },
  slider: { primary_color: '#4338ca', secondary_color: '#f8fafc', accent_color: '#06b6d4', font_scale: 'LG' as const },
};

function getThemePreset(themeId: keyof typeof THEME_PRESETS) {
  return THEME_PRESETS[themeId] ?? THEME_PRESETS.classic;
}

export async function setupRestaurant(
  tenantId: string,
  userId: string,
  data: {
    name: string;
    address?: string | null;
    gst_number?: string | null;
  }
) {
  // Create restaurant and assign user as OWNER
  const restaurant = await createRestaurant(tenantId, userId, data);

  // Create audit log
  await createAuditLog(tenantId, userId, 'CREATE', 'RESTAURANT', restaurant.id);

  return restaurant;
}

export async function getProfile(tenantId: string, userId: string, restaurantId: string) {
  const restaurant = await getRestaurantById(tenantId, userId, restaurantId);
  if (!restaurant) {
    throw new AppError('NOT_FOUND', 'Restaurant not found', 404);
  }

  return restaurant;
}

export async function updateProfile(
  tenantId: string,
  userId: string,
  userRole: string,
  restaurantId: string,
  data: {
    name?: string;
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
  const restaurant = await updateRestaurantProfile(restaurantId, tenantId, userId, userRole, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT', restaurantId);
  return restaurant;
}

export async function updateSlug(
  tenantId: string,
  userId: string,
  restaurantId: string,
  newSlug: string
) {
  // Validate slug format
  const validationError = validateSlugFormat(newSlug);
  if (validationError) {
    throw new AppError('VALIDATION_ERROR', validationError, 400);
  }

  // Check if slug is available (excluding current restaurant)
  const available = await isSlugAvailable(newSlug, restaurantId);
  if (!available) {
    throw new AppError('VALIDATION_ERROR', 'This slug is already in use by another restaurant', 400);
  }

  // Update the slug
  const restaurant = await updateRestaurantProfile(restaurantId, { slug: newSlug });
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_SLUG', restaurantId, { new_slug: newSlug });

  return restaurant;
}

export async function getSettings(restaurantId: string) {
  return getRestaurantSettings(restaurantId);
}

export async function updateSettings(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: {
    opening_hours?: any;
    currency?: string;
    tax_included?: boolean;
  }
) {
  const settings = await upsertRestaurantSettings(restaurantId, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_SETTINGS', restaurantId);
  return settings;
}

export async function getThemeSettings(restaurantId: string) {
  const existing = await getRestaurantThemeSettings(restaurantId);
  if (existing) return existing;

  const fallback = getThemePreset('classic');
  return {
    restaurant_id: restaurantId,
    theme_id: 'classic',
    ...fallback,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export async function updateThemeSettings(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: {
    theme_id: keyof typeof THEME_PRESETS;
  }
) {
  const preset = getThemePreset(data.theme_id);
  const theme = await upsertRestaurantThemeSettings(restaurantId, {
    theme_id: data.theme_id,
    ...preset,
  });
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_THEME', restaurantId);
  return theme;
}

export async function listUsers(restaurantId: string) {
  return listRestaurantUsers(restaurantId);
}

export async function addUser(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: {
    user_id: string;
    role: 'OWNER' | 'MANAGER' | 'WAITER';
    is_active?: boolean;
  }
) {
  if (data.role === 'OWNER') {
    const adminCount = await countActiveAdmins(restaurantId);
    if (adminCount >= 2) {
      throw new AppError('VALIDATION_ERROR', 'Maximum of 2 OWNER users allowed', 400);
    }
  }

  const assignment = await createRestaurantUser(restaurantId, data);
  await createAuditLog(tenantId, userId, 'CREATE', 'RESTAURANT_USER', assignment.id, {
    assigned_user_id: data.user_id,
    role: data.role,
  });
  return assignment;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  restaurantId: string,
  restaurantUserId: string,
  data: {
    role?: 'OWNER' | 'MANAGER' | 'WAITER';
    is_active?: boolean;
  }
) {
  const current = await getRestaurantUserById(restaurantUserId);
  if (!current || current.restaurant_id !== restaurantId) {
    throw new AppError('NOT_FOUND', 'Restaurant user not found', 404);
  }

  if (data.role === 'OWNER') {
    const adminCount = await countActiveAdmins(restaurantId);
    if (adminCount >= 2) {
      throw new AppError('VALIDATION_ERROR', 'Maximum of 2 OWNER users allowed', 400);
    }
  }

  const assignment = await updateRestaurantUser(restaurantUserId, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_USER', restaurantUserId, data);
  return assignment;
}

export async function removeUser(
  tenantId: string,
  userId: string,
  restaurantId: string,
  restaurantUserId: string
) {
  const current = await getRestaurantUserById(restaurantUserId);
  if (!current || current.restaurant_id !== restaurantId) {
    throw new AppError('NOT_FOUND', 'Restaurant user not found', 404);
  }

  await deleteRestaurantUser(restaurantUserId);
  await createAuditLog(tenantId, userId, 'DELETE', 'RESTAURANT_USER', restaurantUserId);
  return { success: true };
}

export async function listAllHalls(restaurantId: string) {
  return listHalls(restaurantId);
}

export async function addHall(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: { name: string; is_ac?: boolean }
) {
  const hall = await createHall(restaurantId, data);
  await createAuditLog(tenantId, userId, 'CREATE', 'RESTAURANT_HALL', hall.id);
  return hall;
}

export async function updateHallInfo(
  tenantId: string,
  userId: string,
  hallId: string,
  data: { name?: string; is_ac?: boolean }
) {
  const hall = await updateHall(hallId, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_HALL', hallId);
  return hall;
}

export async function removeHall(
  tenantId: string,
  userId: string,
  hallId: string
) {
  await deleteHall(hallId);
  await createAuditLog(tenantId, userId, 'DELETE', 'RESTAURANT_HALL', hallId);
  return { success: true };
}

export async function listAllTables(restaurantId: string) {
  const tables = await listTables(restaurantId);

  // Refresh signed URLs for all tables that have a QR code
  const tablesWithRefreshedQrs = await Promise.all(
    tables.map(async (table) => {
      if (table.qr_code) {
        try {
          const [pngUrl, pdfUrl] = await Promise.all([
            createSignedUrl(STORAGE_BUCKETS.TABLE_QRCODES, table.qr_code.qr_png_path, 3600),
            createSignedUrl(STORAGE_BUCKETS.TABLE_QRCODES, table.qr_code.qr_pdf_path, 3600),
          ]);
          return {
            ...table,
            qr_code: {
              ...table.qr_code,
              qr_png_url: pngUrl,
              qr_pdf_url: pdfUrl,
            },
          };
        } catch (error) {
          console.error(`[QR_REFRESH] Failed to refresh URLs for table ${table.id}:`, error);
          // Return table with existing (possibly expired) URLs if refresh fails
          return table;
        }
      }
      return table;
    })
  );

  return tablesWithRefreshedQrs;
}

export async function addTable(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: { hall_id: string; table_number: string; seats: number; is_active?: boolean }
) {
  const table = await createTable(restaurantId, data);
  await createAuditLog(tenantId, userId, 'CREATE', 'RESTAURANT_TABLE', table.id);

  // Automatically generate QR code for the new table
  try {
    console.log(`[QR_GEN] Starting QR generation for table ${table.id}`);
    await generateTableQrAssets(tenantId, userId, restaurantId, table.id);
    console.log(`[QR_GEN] Successfully generated QR code for table ${table.id}`);
  } catch (error) {
    console.error(`[QR_GEN] Failed to generate QR code for table ${table.id}:`, error);
    // We throw the error now so the user knows something went wrong with the QR part
    // but the table is already created in DB.
    throw new AppError('INTERNAL_ERROR', `Table created, but QR code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if 'table_qrcodes' bucket exists in Supabase.`, 500);
  }

  return table;
}

export async function bulkAddTables(
  tenantId: string,
  userId: string,
  restaurantId: string,
  tablesData: Array<{ hall_id: string; table_number: string; seats: number; is_active?: boolean }>
) {
  const createdTables = [];
  const errors = [];

  for (const data of tablesData) {
    try {
      const table = await createTable(restaurantId, data);
      await createAuditLog(tenantId, userId, 'CREATE', 'RESTAURANT_TABLE', table.id);

      // Automatically generate QR code for the new table
      try {
        console.log(`[QR_GEN] Starting QR generation for table ${table.id}`);
        await generateTableQrAssets(tenantId, userId, restaurantId, table.id);
        console.log(`[QR_GEN] Successfully generated QR code for table ${table.id}`);
        createdTables.push(table);
      } catch (error) {
        console.error(`[QR_GEN] Failed to generate QR code for table ${table.id}:`, error);
        errors.push({
          table_number: data.table_number,
          error: 'QR code generation failed'
        });
        // Still add the table to createdTables as it was created, just without QR
        createdTables.push(table);
      }
    } catch (error) {
      console.error(`Failed to create table ${data.table_number}:`, error);
      errors.push({
        table_number: data.table_number,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    created: createdTables,
    errors,
    success: createdTables.length > 0
  };
}

export async function updateTableInfo(
  tenantId: string,
  userId: string,
  tableId: string,
  data: { hall_id?: string; table_number?: string; seats?: number; is_active?: boolean }
) {
  const table = await updateTable(tableId, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_TABLE', tableId);
  return table;
}

export async function removeTable(
  tenantId: string,
  userId: string,
  tableId: string
) {
  await deleteTable(tableId);
  await createAuditLog(tenantId, userId, 'DELETE', 'RESTAURANT_TABLE', tableId);
  return { success: true };
}

function createPdfBuffer(
  payload: { restaurant: string; hall: string; table: string; qrPng: Buffer }
) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => {
      console.error('[PDF_GEN] PDF creation error:', err);
      reject(err);
    });

    doc.fontSize(22).text(payload.restaurant, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`Hall: ${payload.hall}`, { align: 'center' });
    doc.text(`Table: ${payload.table}`, { align: 'center' });
    doc.moveDown(1);

    const imageSize = 300;
    const x = (doc.page.width - imageSize) / 2;
    const y = doc.y;
    doc.image(payload.qrPng, x, y, { width: imageSize, height: imageSize });

    doc.end();
  });
}

export async function generateTableQrAssets(
  tenantId: string,
  userId: string,
  restaurantId: string,
  tableId: string
) {
  const table = await getTableWithHall(restaurantId, tableId);
  if (!table || !table.hall || !table.restaurant) {
    throw new AppError('NOT_FOUND', 'Table or Hall or Restaurant details not found for QR generation', 404);
  }

  if (!env.FRONTEND_URL) {
    throw new AppError('INTERNAL_ERROR', 'FRONTEND_URL is not configured in environment variables', 500);
  }

  // Use restaurant slug instead of ID for user-friendly URLs
  const menuUrl = `${env.FRONTEND_URL}/${table.restaurant.slug}/menu?table=${table.table_number}`;
  console.log(`[QR_GEN] Generating QR for URL: ${menuUrl}`);

  let qrPng: Buffer;
  try {
    qrPng = await QRCode.toBuffer(menuUrl, {
      type: 'png',
      width: 512,
      margin: 2,
    });
  } catch (error) {
    throw new Error(`Failed to generate QR Buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const pngPath = `restaurant_${restaurantId}/table_${tableId}.png`;
  console.log(`[QR_GEN] Uploading PNG to storage: ${pngPath}`);
  await uploadToStorage(STORAGE_BUCKETS.TABLE_QRCODES, pngPath, qrPng, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: true,
  });

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await createPdfBuffer({
      restaurant: table.restaurant.name,
      hall: table.hall.name,
      table: table.table_number,
      qrPng,
    });
  } catch (error) {
    throw new Error(`Failed to create PDF buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const pdfPath = `restaurant_${restaurantId}/table_${tableId}.pdf`;
  console.log(`[QR_GEN] Uploading PDF to storage: ${pdfPath}`);
  await uploadToStorage(STORAGE_BUCKETS.TABLE_QRCODES, pdfPath, pdfBuffer, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true,
  });

  console.log(`[QR_GEN] Creating signed URLs`);
  const [pngUrl, pdfUrl] = await Promise.all([
    createSignedUrl(STORAGE_BUCKETS.TABLE_QRCODES, pngPath, 3600),
    createSignedUrl(STORAGE_BUCKETS.TABLE_QRCODES, pdfPath, 3600),
  ]);

  // Save QR code metadata to database
  console.log(`[QR_GEN] Saving QR metadata to database for table ${tableId}`);
  await upsertTableQRCode({
    table_id: tableId,
    menu_url: menuUrl,
    qr_png_path: pngPath,
    qr_pdf_path: pdfPath,
    qr_png_url: pngUrl,
    qr_pdf_url: pdfUrl,
  });

  await createAuditLog(tenantId, userId, 'UPDATE', 'TABLE_QR', tableId, {
    png_path: pngPath,
    pdf_path: pdfPath,
  });

  return {
    menu_url: menuUrl,
    qr_png_url: pngUrl,
    qr_pdf_url: pdfUrl,
    storage_paths: {
      png: pngPath,
      pdf: pdfPath,
    },
  };
}

export async function generateAllTableQrAssets(
  tenantId: string,
  userId: string,
  restaurantId: string
) {
  const tables = await listTables(restaurantId);
  if (!tables.length) {
    return { regenerated: 0, items: [] as any[] };
  }

  const items = [] as Array<{
    table_id: string;
    table_number: string;
    hall_name: string;
    menu_url: string;
    qr_png_url: string;
    qr_pdf_url: string;
  }>;

  for (const table of tables) {
    const result = await generateTableQrAssets(
      tenantId,
      userId,
      restaurantId,
      table.id
    );

    items.push({
      table_id: table.id,
      table_number: table.table_number,
      hall_name: table.hall.name,
      menu_url: result.menu_url,
      qr_png_url: result.qr_png_url,
      qr_pdf_url: result.qr_pdf_url,
    });
  }

  return { regenerated: items.length, items };
}

// Get QR code for a table (fetch from database and refresh URLs if needed)
export async function getTableQrCodeData(
  tenantId: string,
  restaurantId: string,
  tableId: string
) {
  // Verify table belongs to restaurant
  const table = await getTableWithHall(restaurantId, tableId);
  if (!table) {
    throw new AppError('NOT_FOUND', 'Table not found', 404);
  }

  // Get QR code from database
  const qrCode = await getTableQRCode(tableId);
  if (!qrCode) {
    throw new AppError('NOT_FOUND', 'QR code not found. Please generate QR code first.', 404);
  }

  // Refresh signed URLs (they expire after 1 hour)
  const [pngUrl, pdfUrl] = await Promise.all([
    createSignedUrl(STORAGE_BUCKETS.TABLE_QRCODES, qrCode.qr_png_path, 3600),
    createSignedUrl(STORAGE_BUCKETS.TABLE_QRCODES, qrCode.qr_pdf_path, 3600),
  ]);

  return {
    id: qrCode.id,
    table_id: qrCode.table_id,
    menu_url: qrCode.menu_url,
    qr_png_url: pngUrl,
    qr_pdf_url: pdfUrl,
    created_at: qrCode.created_at,
    updated_at: qrCode.updated_at,
  };
}

// Dashboard Analytics
export async function getDashboard(tenantId: string, restaurantId: string) {
  const analytics = await getDashboardAnalytics(tenantId, restaurantId);
  return analytics;
}

// List User's Restaurants (for multi-restaurant switcher)
export async function getUserRestaurants(
  tenantId: string,
  userId: string,
  userRole: string
) {
  return listUserRestaurants(tenantId, userId, userRole);
}

// Simple version - get all restaurants by tenant
export async function getUserRestaurantsByTenant(tenantId: string) {
  return getUserRestaurantsByTenantRepo(tenantId);
}

export async function uploadRestaurantLogo(
  tenantId: string,
  userId: string,
  restaurantId: string,
  fileBuffer: Buffer,
  mimeType: string
) {
  const path = `logos/${restaurantId}_${Date.now()}`;

  await uploadToStorage(STORAGE_BUCKETS.PROFILE_IMAGES, path, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  const publicUrl = await getPublicUrl(STORAGE_BUCKETS.PROFILE_IMAGES, path);

  // Update restaurant profile with new logo URL
  // Fetch user role for repository sync
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  await updateRestaurantProfile(restaurantId, tenantId, userId, user?.role || 'OWNER', { logo_url: publicUrl });

  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_LOGO', restaurantId);

  return publicUrl;
}

