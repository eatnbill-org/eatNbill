import { supabaseAdmin } from './supabase';

export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product_img',
  CATEGORY_IMAGES: 'category_img',
  TABLE_QRCODES: 'table_qrcodes',
  PROFILE_IMAGES: 'profile_img',
} as const;

export interface UploadOptions {
  contentType: string;
  cacheControl?: string;
  upsert?: boolean;
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  data: Uint8Array | ArrayBuffer,
  options: UploadOptions
) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, data, {
      contentType: options.contentType,
      cacheControl: options.cacheControl ?? '3600',
      upsert: options.upsert ?? true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return { bucket, path };
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}

export async function getPublicUrl(bucket: string, path: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeFromStorage(bucket: string, paths: string[]) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}