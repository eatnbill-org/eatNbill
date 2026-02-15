-- Add image_url column for categories
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
