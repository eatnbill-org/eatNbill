import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import CustomerLayout from "./CustomerLayout";
import type { PublicProduct } from "@/types/product";
import { renderCustomerTheme } from "@/lib/customer-theme-renderer";
import { normalizeCustomerTheme } from "@/lib/customer-theme-presets";
import { CustomerLayoutSkeleton } from "@/components/ui/skeleton";

export default function CustomerEntry() {
  const { state } = useDemoStore();
  const { restaurant, loading } = useRestaurantStore();

  const activeTheme = normalizeCustomerTheme(restaurant?.theme_settings?.theme_id);

  const previewProducts = React.useMemo<PublicProduct[]>(
    () =>
      state.products.map((product) => ({
        id: String(product.id),
        name: product.name,
        description: null,
        price: String(product.price),
        is_active: !product.outOfStock,
        category_id: product.category || 'preview',
        images: product.imageUrl
          ? [{ id: `preview-${product.id}`, storage_path: '', public_url: product.imageUrl, sort_order: 0 }]
          : [],
        discount_percent: product.discount_percent ? String(product.discount_percent) : undefined,
      })),
    [state.products]
  );

  const previewCategories = React.useMemo(
    () =>
      Array.from(new Set(state.products.map((product) => product.category))).map((category) => ({
        id: category || 'preview',
        name: category || 'Preview',
        description: null,
        sort_order: 0,
        image_url: null,
      })),
    [state.products]
  );

  // Show loading state while restaurant data is being fetched
  if (loading) {
    return (
      <CustomerLayout>
        <CustomerLayoutSkeleton />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {renderCustomerTheme(activeTheme, {
        settings: null,
        products: previewProducts,
        categories: previewCategories,
        restaurantName: restaurant?.name || state.customerSettings.storeName,
      })}
    </CustomerLayout>
  );
}
