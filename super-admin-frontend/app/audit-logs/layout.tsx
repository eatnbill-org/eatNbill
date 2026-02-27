import type { Metadata } from 'next';
import AdminLayout from '@/components/admin-layout';

export const metadata: Metadata = {
  title: 'Audit Logs',
  description: 'View detailed audit logs for the EatnBill platform',
};

export default function AuditLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
