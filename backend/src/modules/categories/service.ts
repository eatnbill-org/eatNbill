import { randomUUID } from 'node:crypto';
import { uploadToStorage, createSignedUrl, getPublicUrl, STORAGE_BUCKETS } from '../../utils/storage';
import {
  countProductsInCategory,
  createCategory,
  findCategoryById,
  findCategoryByName,
  listCategories,
  reorderCategories,
  softDeleteCategory,
  updateCategory,
  listPublicCategories,
} from './repository';

export async function getCategories(restaurantId: string) {
  const categories = await listCategories(restaurantId);
  return Promise.all(
    categories.map(async (category) => {
      let imageUrl = category.image_url;
      if (imageUrl && !imageUrl.startsWith('http')) {
        // It's a storage path, get public URL
        imageUrl = await getPublicUrl(STORAGE_BUCKETS.CATEGORY_IMAGES, imageUrl);
      }
      return { ...category, image_url: imageUrl };
    })
  );
}

export async function getCategory(restaurantId: string, categoryId: string) {
  const category = await findCategoryById(restaurantId, categoryId);
  if (!category) return null;

  let imageUrl = category.image_url;
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = await getPublicUrl(STORAGE_BUCKETS.CATEGORY_IMAGES, imageUrl);
  }

  return { ...category, image_url: imageUrl };
}

export async function addCategory(
  restaurantId: string,
  data: {
    name: string;
    description?: string;
    image_url?: string;
    sortOrder?: number;
    isActive?: boolean;
    image?: {
      file_base64: string;
      content_type: string;
    };
  }
) {
  // Check for duplicate name
  const existing = await findCategoryByName(restaurantId, data.name);

  if (existing) {
    throw new Error('A category with this name already exists');
  }

  let imageUrl = data.image_url;

  // Handle image upload if provided
  if (data.image) {
    const buffer = Buffer.from(data.image.file_base64, 'base64');
    const extension = data.image.content_type.split('/')[1];
    const fileName = `cat_${randomUUID()}.${extension}`;
    const storagePath = `restaurant_${restaurantId}/categories/${fileName}`;

    await uploadToStorage(
      STORAGE_BUCKETS.CATEGORY_IMAGES,
      storagePath,
      buffer,
      { contentType: data.image.content_type, upsert: true }
    );

    // Store the relative path, NOT the signed URL
    imageUrl = storagePath;
  }

  try {
    const category = await createCategory(restaurantId, {
      ...data,
      image_url: imageUrl,
    });

    return category;
  } catch (error: any) {
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      throw new Error('A category with this name already exists');
    }
    throw error;
  }
}

export async function editCategory(
  restaurantId: string,
  categoryId: string,
  data: {
    name?: string;
    description?: string;
    image_url?: string;
    sortOrder?: number;
    isActive?: boolean;
    image?: {
      file_base64: string;
      content_type: string;
    };
  }
) {
  // Verify category exists
  const existing = await findCategoryById(restaurantId, categoryId);
  if (!existing) {
    throw new Error('Category not found');
  }

  // If name is changing, check for duplicates
  if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await findCategoryByName(restaurantId, data.name);
    if (duplicate) {
      throw new Error('A category with this name already exists');
    }
  }

  let imageUrl = data.image_url;

  // Handle image upload if provided
  if (data.image) {
    const buffer = Buffer.from(data.image.file_base64, 'base64');
    const extension = data.image.content_type.split('/')[1];
    const fileName = `cat_${randomUUID()}.${extension}`;
    const storagePath = `restaurant_${restaurantId}/categories/${fileName}`;

    await uploadToStorage(
      STORAGE_BUCKETS.CATEGORY_IMAGES,
      storagePath,
      buffer,
      { contentType: data.image.content_type, upsert: true }
    );

    // Store the relative path
    imageUrl = storagePath;
  }

  const category = await updateCategory(categoryId, {
    ...data,
    image_url: imageUrl,
  });

  return category;
}

export async function removeCategory(
  restaurantId: string,
  categoryId: string
) {
  // Verify category exists
  const existing = await findCategoryById(restaurantId, categoryId);
  if (!existing) {
    throw new Error('Category not found');
  }

  // Check if category has products - BLOCK deletion if products exist
  const productCount = await countProductsInCategory(categoryId);
  if (productCount > 0) {
    throw new Error(
      `Cannot delete category with ${productCount} product${productCount > 1 ? 's' : ''}. Please reassign or delete the products first.`
    );
  }

  await softDeleteCategory(categoryId);

  return { success: true };
}

export async function setCategoryOrder(
  restaurantId: string,
  categories: Array<{ id: string; sortOrder: number }>
) {
  await reorderCategories(restaurantId, categories);

  return { success: true };
}

export async function getPublicCategories(restaurantSlug: string) {
  const categories = await listPublicCategories(restaurantSlug);
  return Promise.all(
    categories.map(async (category) => {
      let imageUrl = category.image_url;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = await getPublicUrl(STORAGE_BUCKETS.CATEGORY_IMAGES, imageUrl);
      }
      return { ...category, image_url: imageUrl };
    })
  );
}
