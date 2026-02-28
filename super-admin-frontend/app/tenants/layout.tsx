import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tenants',
  description: 'Manage all tenants on the EatnBill platform',
};

export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
