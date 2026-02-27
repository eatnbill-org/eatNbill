import type { Metadata } from 'next';
import AdminLayout from '@/components/admin-layout';

export const metadata: Metadata = {
  title: 'Restaurants',
  description: 'Manage all restaurants on the EatnBill platform',
};

export default function RestaurantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
