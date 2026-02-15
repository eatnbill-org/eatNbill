import { prisma } from './prisma';

/**
 * Reserved slugs that cannot be used for restaurants
 */
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'public',
  'menu',
  'dashboard',
  'settings',
  'profile',
  'login',
  'signup',
  'logout',
  'register',
  'forgot-password',
  'reset-password',
  'verify',
  'about',
  'contact',
  'help',
  'support',
  'terms',
  'privacy',
  'pricing',
  'features',
  'docs',
  'documentation',
  'blog',
  'news',
]);

/**
 * Convert a string to a URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract up to N words from a string
 */
function extractWords(text: string, maxWords: number): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, maxWords);
  return words.join(' ');
}

/**
 * Generate a slug from restaurant name and optional address
 * @param name - Restaurant name
 * @param address - Optional restaurant address (up to 4 words will be used)
 * @returns Slugified string
 */
export function generateSlugFromNameAndAddress(
  name: string,
  address?: string | null
): string {
  const namePart = slugify(name);

  if (!address || address.trim().length === 0) {
    return namePart;
  }

  // Extract up to 4 words from address
  const addressWords = extractWords(address, 4);
  const addressPart = slugify(addressWords);

  if (!addressPart) {
    return namePart;
  }

  return `${namePart}-${addressPart}`;
}

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Validate slug format
 * @param slug - Slug to validate
 * @returns Error message if invalid, null if valid
 */
export function validateSlugFormat(slug: string): string | null {
  if (!slug || slug.trim().length === 0) {
    return 'Slug cannot be empty';
  }

  if (slug.length < 3) {
    return 'Slug must be at least 3 characters long';
  }

  if (slug.length > 100) {
    return 'Slug cannot exceed 100 characters';
  }

  // Check format: lowercase alphanumeric and hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Slug can only contain lowercase letters, numbers, and hyphens';
  }

  // Check for leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return 'Slug cannot start or end with a hyphen';
  }

  // Check for consecutive hyphens
  if (slug.includes('--')) {
    return 'Slug cannot contain consecutive hyphens';
  }

  if (isReservedSlug(slug)) {
    return 'This slug is reserved and cannot be used';
  }

  return null;
}

/**
 * Check if a slug is available (not used by any restaurant)
 * @param slug - Slug to check
 * @param excludeRestaurantId - Optional restaurant ID to exclude from check (for updates)
 * @returns true if available, false if taken
 */
export async function isSlugAvailable(
  slug: string,
  excludeRestaurantId?: string
): Promise<boolean> {
  const existing = await prisma.restaurant.findFirst({
    where: {
      slug,
      deleted_at: null,
      ...(excludeRestaurantId ? { id: { not: excludeRestaurantId } } : {}),
    },
    select: { id: true },
  });

  return !existing;
}

/**
 * Generate a unique slug by appending a counter if needed
 * @param baseSlug - Base slug to start with
 * @param excludeRestaurantId - Optional restaurant ID to exclude from uniqueness check
 * @returns Unique slug
 */
export async function makeSlugUnique(
  baseSlug: string,
  excludeRestaurantId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  // Check if base slug is available
  while (!(await isSlugAvailable(slug, excludeRestaurantId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety check to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after 1000 attempts');
    }
  }

  return slug;
}

/**
 * Generate a unique, valid slug for a restaurant
 * @param name - Restaurant name
 * @param address - Optional restaurant address
 * @param excludeRestaurantId - Optional restaurant ID to exclude from uniqueness check
 * @returns Unique, validated slug
 */
export async function generateUniqueRestaurantSlug(
  name: string,
  address?: string | null,
  excludeRestaurantId?: string
): Promise<string> {
  // Generate base slug from name and address
  const baseSlug = generateSlugFromNameAndAddress(name, address);

  // Validate format
  const validationError = validateSlugFormat(baseSlug);
  if (validationError) {
    throw new Error(`Invalid slug format: ${validationError}`);
  }

  // Make it unique by appending counter if needed
  const uniqueSlug = await makeSlugUnique(baseSlug, excludeRestaurantId);

  return uniqueSlug;
}
