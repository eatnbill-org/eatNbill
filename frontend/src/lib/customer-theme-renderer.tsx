import type { PublicCategory, PublicMenuSettings, PublicProduct } from '@/types/product';
import { ThemeClassic } from '@/pages/admin/customerSettings/themes/ThemeClassic';
import { ThemeModern } from '@/pages/admin/customerSettings/themes/ThemeModern';
import { ThemeMinimal } from '@/pages/admin/customerSettings/themes/ThemeMinimal';
import { ThemeGrid } from '@/pages/admin/customerSettings/themes/ThemeGrid';
import { ThemeDark } from '@/pages/admin/customerSettings/themes/ThemeDark';
import { ThemeSlider } from '@/pages/admin/customerSettings/themes/ThemeSlider';
import { CustomerThemeName, normalizeCustomerTheme, CUSTOMER_THEME_PRESETS } from './customer-theme-presets';

type ThemeProps = {
  settings: PublicMenuSettings | null;
  products: PublicProduct[];
  categories: PublicCategory[];
  restaurantName: string;
};

export function renderCustomerTheme(themeId: string | null | undefined, props: ThemeProps) {
  const activeTheme = normalizeCustomerTheme(themeId);

  switch (activeTheme) {
    case 'classic':
      return <ThemeClassic {...props} />;
    case 'modern':
      return <ThemeModern {...props} />;
    case 'minimal':
      return <ThemeMinimal {...props} />;
    case 'grid':
      return <ThemeGrid {...props} />;
    case 'dark':
      return <ThemeDark {...props} />;
    case 'slider':
      return <ThemeSlider {...props} />;
    default:
      return <ThemeClassic {...props} />;
  }
}

export function getThemePreset(themeId: string | null | undefined) {
  const normalized = normalizeCustomerTheme(themeId) as CustomerThemeName;
  return CUSTOMER_THEME_PRESETS[normalized];
}
