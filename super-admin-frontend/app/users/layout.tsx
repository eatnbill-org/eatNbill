import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users',
  description: 'Manage all users on the EatnBill platform',
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
