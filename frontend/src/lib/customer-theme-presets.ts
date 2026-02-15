export type CustomerThemeName =
  | 'standard'
  | 'vintage_70s'
  | 'retro_50s'
  | 'urban_hiphop'
  | 'mod_60s'
  | 'alice'
  | 'lotr'
  | 'glamping';

export type ThemePreset = {
  id: CustomerThemeName;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontClass: string;
  fontScale: 'SM' | 'MD' | 'LG';
  // Advanced Styles
  layout: 'list' | 'grid' | 'compact';
  cardStyle: 'flat' | 'elevated' | 'glass' | 'bordered';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  buttonStyle: 'sharp' | 'rounded' | 'pill' | 'outline';
  categoryStyle: 'pill' | 'card';
  showImages: boolean;
  googleFontFamily: string;
  backgroundPattern?: string; // CSS background value
};

export const DEFAULT_CUSTOMER_THEME: CustomerThemeName = 'standard';

export const CUSTOMER_THEME_PRESETS: Record<CustomerThemeName, ThemePreset> = {
  standard: {
    id: 'standard',
    name: 'Standard (Default)',
    description: 'Warm, friendly, and appetizing.',
    primaryColor: '#ea580c', // Orange 600
    secondaryColor: '#ffffff',
    accentColor: '#fbbf24', // Amber 400
    fontClass: 'font-sans',
    googleFontFamily: 'Quicksand',
    fontScale: 'MD',
    layout: 'grid',
    cardStyle: 'flat',
    borderRadius: 'xl',
    buttonStyle: 'pill',
    categoryStyle: 'card',
    showImages: true,
    backgroundPattern: 'none',
  },
  vintage_70s: {
    id: 'vintage_70s',
    name: '1970s: Funky & Boho',
    description: 'Groovy vibes with earth tones and rounded shapes.',
    primaryColor: '#A0522D', // Sienna
    secondaryColor: '#FFF8E7', // Cosmic Latte
    accentColor: '#DAA520', // GoldenRod
    fontClass: 'font-serif', // Fallback
    googleFontFamily: 'Fraunces', // Valid Google Font 70s vibes
    fontScale: 'LG',
    layout: 'list',
    cardStyle: 'flat',
    borderRadius: 'xl',
    buttonStyle: 'rounded',
    categoryStyle: 'card',
    showImages: true,
    backgroundPattern: 'radial-gradient(circle at 50% 50%, #FFF8E7 20%, #FFE4B5 100%)',
  },
  retro_50s: {
    id: 'retro_50s',
    name: '1950s & 60s: Classic Retro',
    description: 'Diner style pastels with bold script fonts.',
    primaryColor: '#FF6F61', // Coral
    secondaryColor: '#E0F7FA', // Cyan Tint
    accentColor: '#00BCD4', // Cyan
    fontClass: 'font-sans',
    googleFontFamily: 'Pacifico',
    fontScale: 'MD',
    layout: 'grid',
    cardStyle: 'elevated',
    borderRadius: 'md',
    buttonStyle: 'pill',
    categoryStyle: 'pill',
    showImages: true,
    backgroundPattern: 'repeating-linear-gradient(45deg, #E0F7FA 0px, #E0F7FA 10px, #B2EBF2 10px, #B2EBF2 20px)',
  },
  urban_hiphop: {
    id: 'urban_hiphop',
    name: 'Old School Hiphop (80s-90s)',
    description: 'Graffiti aesthetics, high contrast, sharp edges.',
    primaryColor: '#000000',
    secondaryColor: '#FFD700', // Gold
    accentColor: '#FF00FF', // Magenta
    fontClass: 'font-mono',
    googleFontFamily: 'Rubik Mono One',
    fontScale: 'LG',
    layout: 'grid',
    cardStyle: 'bordered',
    borderRadius: 'none',
    buttonStyle: 'sharp',
    categoryStyle: 'pill',
    showImages: true,
    backgroundPattern: 'linear-gradient(135deg, #111 25%, #000 25%, #000 50%, #111 50%, #111 75%, #000 75%, #000 100%)',
  },
  mod_60s: {
    id: 'mod_60s',
    name: "Swingin' 60s",
    description: 'Geometric mod style with bold blocks of color.',
    primaryColor: '#D32F2F', // Red
    secondaryColor: '#F5F5F5',
    accentColor: '#1976D2', // Blue
    fontClass: 'font-sans',
    googleFontFamily: 'Righteous',
    fontScale: 'MD',
    layout: 'compact',
    cardStyle: 'flat',
    borderRadius: 'full', // Circles/Pills
    buttonStyle: 'pill',
    categoryStyle: 'pill',
    showImages: false, // Iconographic focus
    backgroundPattern: 'conic-gradient(at 50% 50%, #F5F5F5 25%, #EEEEEE 25%, #EEEEEE 50%, #F5F5F5 50%, #F5F5F5 75%, #EEEEEE 75%)',
  },
  alice: {
    id: 'alice',
    name: 'Alice in Wonderland',
    description: 'Whimsical, magical, and dreamlike glassmorphism.',
    primaryColor: '#6A1B9A', // Purple
    secondaryColor: '#F3E5F5', // Lavender Mist
    accentColor: '#AB47BC', // Light Purple
    fontClass: 'font-serif',
    googleFontFamily: 'Playfair Display',
    fontScale: 'MD',
    layout: 'list',
    cardStyle: 'glass',
    borderRadius: 'xl',
    buttonStyle: 'outline',
    categoryStyle: 'card',
    showImages: true,
    backgroundPattern: 'linear-gradient(120deg, #F3E5F5 0%, #E1BEE7 100%)',
  },
  lotr: {
    id: 'lotr',
    name: 'Lord of the Rings',
    description: 'Rustic parchment, gold accents, and ancient fonts.',
    primaryColor: '#3E2723', // Dark Brown
    secondaryColor: '#FFF3E0', // Parchment
    accentColor: '#FFD700', // Gold
    fontClass: 'font-serif',
    googleFontFamily: 'Cinzel',
    fontScale: 'SM',
    layout: 'list', // Text heavy/scroll
    cardStyle: 'bordered',
    borderRadius: 'sm', // Slight rounding like worn paper
    buttonStyle: 'outline',
    categoryStyle: 'card',
    showImages: false,
    backgroundPattern: 'url("https://www.transparenttextures.com/patterns/aged-paper.png"), #FFF3E0', // Fallback color + texture
  },
  glamping: {
    id: 'glamping',
    name: 'Glamping',
    description: 'Minimal nature-inspired, clean lines, wood tones.',
    primaryColor: '#2E7D32', // Forest Green
    secondaryColor: '#F1F8E9', // Light Green/White
    accentColor: '#8D6E63', // Wood Brown
    fontClass: 'font-sans',
    googleFontFamily: 'Outfit', // Clean modern sans
    fontScale: 'MD',
    layout: 'grid',
    cardStyle: 'flat',
    borderRadius: 'lg',
    buttonStyle: 'rounded',
    categoryStyle: 'card',
    showImages: true,
    backgroundPattern: 'none', // Clean
  },
};

export function normalizeCustomerTheme(themeId?: string | null): CustomerThemeName {
  if (!themeId) return DEFAULT_CUSTOMER_THEME;
  return themeId in CUSTOMER_THEME_PRESETS
    ? (themeId as CustomerThemeName)
    : DEFAULT_CUSTOMER_THEME;
}

export function getThemePreset(name: CustomerThemeName): ThemePreset {
  return CUSTOMER_THEME_PRESETS[name] || CUSTOMER_THEME_PRESETS[DEFAULT_CUSTOMER_THEME];
}
