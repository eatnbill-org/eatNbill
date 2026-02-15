import {
  createProduct,
  createProductImage,
  deleteProductImage,
  findProductById,
  getProductImageById,
  getRestaurantMenuMeta,
  listProductImages,
  listProducts,
  listPublicMenu,
  softDeleteProduct,
  updateProduct,
  getProductCategories,
} from './repository';
import { listPublicCategories } from '../categories/repository';
import { createSignedUrl, getPublicUrl, removeFromStorage, uploadToStorage, STORAGE_BUCKETS } from '../../utils/storage';
import { AppError } from '../../middlewares/error.middleware';
import { randomUUID } from 'node:crypto';

export async function listRestaurantProducts(restaurantId: string) {
  const products = await listProducts(restaurantId);

  // Generate signed URLs for all images
  return Promise.all(
    products.map(async (product) => {
      const imagesWithUrls = await Promise.all(
        product.images.map(async (image) => ({
          ...image,
          public_url: await getPublicUrl(
            STORAGE_BUCKETS.PRODUCT_IMAGES,
            image.storage_path
          ),
        }))
      );

      return { ...product, images: imagesWithUrls };
    })
  );
}

export async function createRestaurantProduct(
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
  return createProduct(restaurantId, data);
}

export async function getRestaurantProduct(
  restaurantId: string,
  productId: string
) {
  const product = await findProductById(restaurantId, productId);
  if (!product) {
    throw new AppError('NOT_FOUND', 'Product not found', 404);
  }

  const imagesWithUrls = await Promise.all(
    product.images.map(async (image) => ({
      ...image,
      public_url: await getPublicUrl(
        STORAGE_BUCKETS.PRODUCT_IMAGES,
        image.storage_path
      ),
    }))
  );

  return { ...product, images: imagesWithUrls };
}

export async function updateRestaurantProduct(
  restaurantId: string,
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
  const existing = await findProductById(restaurantId, productId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Product not found', 404);
  }

  return updateProduct(productId, data);
}

export async function deleteRestaurantProduct(
  restaurantId: string,
  productId: string
) {
  const existing = await findProductById(restaurantId, productId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Product not found', 404);
  }

  await softDeleteProduct(productId);

  return { success: true };
}

export async function getPublicMenu(restaurantIdentifier: string) {
  const [restaurant, products, categories] = await Promise.all([
    getRestaurantMenuMeta(restaurantIdentifier),
    listPublicMenu(restaurantIdentifier),
    listPublicCategories(restaurantIdentifier),
  ]);

  if (!restaurant) {
    throw new AppError('NOT_FOUND', 'Restaurant not found', 404);
  }

  const productsWithImages = await Promise.all(
    products.map(async (product) => {
      const images = await Promise.all(
        product.images.map(async (image) => ({
          id: image.id,
          sort_order: image.sort_order,
          storage_path: image.storage_path,
          public_url: await getPublicUrl(
            STORAGE_BUCKETS.PRODUCT_IMAGES,
            image.storage_path
          ),
        }))
      );

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount_percent: product.discount_percent,
        is_active: product.is_active,
        category_id: product.category_id,
        images,
      };
    })
  );

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logo_url: restaurant.logo_url,
      address: restaurant.address,
    },
    settings: restaurant.settings ?? {
      opening_hours: null,
      currency: 'INR',
      tax_included: true,
    },
    theme: restaurant.theme_settings ?? {
      theme_id: 'classic',
      primary_color: '#065f46',
      secondary_color: '#ffffff',
      accent_color: '#d4af37',
      font_scale: 'MD',
    },
    products: productsWithImages,
    categories,
  };
}

export async function addProductImage(
  restaurantId: string,
  productId: string,
  data: {
    file_base64: string;
    content_type: string;
    sort_order?: number;
  }
) {
  const product = await findProductById(restaurantId, productId);
  if (!product) {
    throw new AppError('NOT_FOUND', 'Product not found', 404);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(data.content_type)) {
    throw new AppError('VALIDATION_ERROR', 'Unsupported image type', 400);
  }

  const buffer = Buffer.from(data.file_base64, 'base64');
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (buffer.length > maxBytes) {
    throw new AppError('VALIDATION_ERROR', 'Image size exceeds 5MB', 400);
  }

  const extension = data.content_type.split('/')[1];
  const fileName = `image_${randomUUID()}.${extension}`;
  const storagePath = `restaurant_${restaurantId}/product_${productId}/${fileName}`;

  await uploadToStorage(
    STORAGE_BUCKETS.PRODUCT_IMAGES,
    storagePath,
    buffer,
    { contentType: data.content_type, cacheControl: '3600', upsert: true }
  );

  const signedUrl = await getPublicUrl(
    STORAGE_BUCKETS.PRODUCT_IMAGES,
    storagePath
  );

  const image = await createProductImage(productId, {
    storage_path: storagePath,
    public_url: signedUrl,
    sort_order: data.sort_order ?? 0,
  });

  return {
    id: image.id,
    storage_path: image.storage_path,
    url: signedUrl,
    sort_order: image.sort_order,
  };
}

export async function getProductImages(
  restaurantId: string,
  productId: string
) {
  const product = await findProductById(restaurantId, productId);
  if (!product) {
    throw new AppError('NOT_FOUND', 'Product not found', 404);
  }

  const images = await listProductImages(productId);
  return Promise.all(
    images.map(async (image) => ({
      id: image.id,
      storage_path: image.storage_path,
      sort_order: image.sort_order,
      url: await getPublicUrl(
        STORAGE_BUCKETS.PRODUCT_IMAGES,
        image.storage_path
      ),
    }))
  );
}

export async function removeProductImage(
  restaurantId: string,
  productId: string,
  imageId: string
) {
  const product = await findProductById(restaurantId, productId);
  if (!product) {
    throw new AppError('NOT_FOUND', 'Product not found', 404);
  }

  const image = await getProductImageById(imageId);
  if (!image || image.product_id !== productId) {
    throw new AppError('NOT_FOUND', 'Product image not found', 404);
  }

  await removeFromStorage(STORAGE_BUCKETS.PRODUCT_IMAGES, [image.storage_path]);
  await deleteProductImage(imageId);

  return { success: true };
}

// Get product categories
export async function getRestaurantProductCategories(
  restaurantId: string
) {
  return getProductCategories(restaurantId);
}
