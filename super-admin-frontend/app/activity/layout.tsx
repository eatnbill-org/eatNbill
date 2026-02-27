import type { Metadata } from 'next';
import AdminLayout from '@/components/admin-layout';

export const metadata: Metadata = {
  title: 'Activity',
  description: 'View platform activity logs',
};

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
