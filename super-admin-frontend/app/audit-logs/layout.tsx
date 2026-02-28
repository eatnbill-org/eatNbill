import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Logs',
  description: 'View detailed audit logs for the EatnBill platform',
};

export default function AuditLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
