import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restaurants',
  description: 'Manage all restaurants on the EatnBill platform',
};

export default function RestaurantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
