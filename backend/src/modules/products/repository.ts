import { prisma } from '../../utils/prisma';

export async function listProducts(restaurantId: string) {
  return prisma.product.findMany({
    where: {
      restaurant_id: restaurantId,
      deleted_at: null,
    },
    include: {
      category: true,
      images: {
        orderBy: { sort_order: 'asc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function createProduct(
  restaurantId: string,
  data: {
    name: string;
    description?: string;
    price: number;
    costPrice?: number;
    categoryId?: string;

    isAvailable?: boolean;
    isVeg?: boolean | null;
    preparationTimeMinutes?: number;
  }
) {
  const createData = {
    restaurant_id: restaurantId,
    name: data.name,
    description: data.description,
    price: data.price,
    costprice: data.costPrice ?? null,
    category_id: data.categoryId || null,
    is_active: data.isAvailable ?? true,
    is_veg: data.isVeg ?? null,
    preparation_time_minutes: data.preparationTimeMinutes ?? null,
    discount_percent: data.discount_percent ?? 0,
  };

  const product = await prisma.product.create({
    data: createData,
    include: {
      category: true,
      images: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  return product;
}

export async function findProductById(restaurantId: string, productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      restaurant_id: restaurantId,
      deleted_at: null,
    },
    include: {
      category: true,
      images: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });
}

export async function updateProduct(
  productId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    costPrice?: number;
    categoryId?: string;

    isAvailable?: boolean;
    isVeg?: boolean | null;
    preparationTimeMinutes?: number;
  }
) {
  return prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      costprice: data.costPrice,
      category_id: data.categoryId,
      is_active: data.isAvailable,
      is_veg: data.isVeg,
      preparation_time_minutes: data.preparationTimeMinutes,
      discount_percent: data.discount_percent,
    },
    include: {
      category: true,
      images: {
        orderBy: { sort_order: 'asc' },
      },
    },
  });
}

export async function softDeleteProduct(productId: string) {
  return prisma.product.update({
    where: { id: productId },
    data: { deleted_at: new Date() },
  });
}

export async function listPublicMenu(restaurantIdentifier: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantIdentifier);

  return prisma.product.findMany({
    where: {
      restaurant: {
        OR: [
          ...(isUUID ? [{ id: restaurantIdentifier }] : []),
          { slug: restaurantIdentifier }
        ],
        deleted_at: null,
      },
      deleted_at: null,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      discount_percent: true,
      is_active: true,
      category_id: true,
      images: {
        select: {
          id: true,
          storage_path: true,
          public_url: true,
          sort_order: true,
        },
        orderBy: { sort_order: 'asc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getRestaurantMenuMeta(restaurantIdentifier: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantIdentifier);

  return prisma.restaurant.findFirst({
    where: {
      OR: [
        ...(isUUID ? [{ id: restaurantIdentifier }] : []),
        { slug: restaurantIdentifier }
      ],
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      address: true,
      settings: {
        select: {
          opening_hours: true,
          currency: true,
          tax_included: true,
        },
      },
      theme_settings: {
        select: {
          theme_id: true,
          primary_color: true,
          secondary_color: true,
          accent_color: true,
          font_scale: true,
        },
      },
    },
  });
}

export async function createProductImage(
  productId: string,
  data: {
    storage_path: string;
    public_url?: string | null;
    sort_order?: number;
  }
) {
  return prisma.productImage.create({
    data: {
      product_id: productId,
      storage_path: data.storage_path,
      public_url: data.public_url ?? null,
      sort_order: data.sort_order ?? 0,
    },
  });
}

export async function listProductImages(productId: string) {
  return prisma.productImage.findMany({
    where: { product_id: productId },
    orderBy: { sort_order: 'asc' },
  });
}

export async function getProductImageById(imageId: string) {
  return prisma.productImage.findUnique({
    where: { id: imageId },
  });
}

export async function deleteProductImage(imageId: string) {
  return prisma.productImage.delete({
    where: { id: imageId },
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

// Get unique categories for a restaurant
export async function getProductCategories(restaurantId: string) {
  const products = await prisma.product.findMany({
    where: {
      restaurant_id: restaurantId,
      deleted_at: null,
    },
    select: {
      category_id: true,
    },
    distinct: ['category_id'],
    orderBy: {
      category_id: 'asc',
    },
  });

  return products.map((p) => p.category_id).filter(Boolean);
}
