import { prisma } from '../../utils/prisma';

export async function listCategories(restaurantId: string) {
  return prisma.category.findMany({
    where: {
      restaurant_id: restaurantId,
      deleted_at: null,
    },
    include: {
      _count: {
        select: { products: { where: { deleted_at: null } } },
      },
    },
    orderBy: [{ name: 'asc' }],
  });
}

export async function findCategoryById(restaurantId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: {
      id: categoryId,
      restaurant_id: restaurantId,
      deleted_at: null,
    },
    include: {
      _count: {
        select: { products: { where: { deleted_at: null } } },
      },
    },
  });
}

export async function findCategoryByName(restaurantId: string, name: string) {
  return prisma.category.findFirst({
    where: {
      restaurant_id: restaurantId,
      name: name, // Case-sensitive to match DB unique constraint
      deleted_at: null,
    },
  });
}

export async function createCategory(
  restaurantId: string,
  data: {
    name: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    image_url?: string;
  }
) {
  const category = await prisma.category.create({
    data: {
      restaurant_id: restaurantId,
      name: data.name,
      description: data.description,
      image_url: data.image_url,
      is_active: data.isActive ?? true,
    },
    include: {
      _count: {
        select: { products: { where: { deleted_at: null } } },
      },
    },
  });

  return category;
}

export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    image_url?: string;
  }
) {
  return prisma.category.update({
    where: { id: categoryId },
    data: {
      name: data.name,
      description: data.description,
      image_url: data.image_url,
      is_active: data.isActive,
    },
    include: {
      _count: {
        select: { products: { where: { deleted_at: null } } },
      },
    },
  });
}

export async function softDeleteCategory(categoryId: string) {
  return prisma.category.update({
    where: { id: categoryId },
    data: { deleted_at: new Date() },
  });
}

export async function countProductsInCategory(categoryId: string) {
  return prisma.product.count({
    where: {
      category_id: categoryId,
      deleted_at: null,
    },
  });
}

export async function reorderCategories(
  restaurantId: string,
  categories: Array<{ id: string; sortOrder: number }>
) {
  // Functionality disabled as sort_order column does not exist in DB
  return [];
}

export async function listPublicCategories(restaurantIdentifier: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantIdentifier);

  return prisma.category.findMany({
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
      products: {
        some: {
          deleted_at: null,
          is_active: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      image_url: true,
    },
    orderBy: [{ name: 'asc' }],
  });
}
