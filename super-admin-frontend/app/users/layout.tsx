import type { Metadata } from 'next';
<<<<<<< HEAD
import AdminLayout from '@/components/admin-layout';
=======
>>>>>>> 2342221b164b9ed1048923ff5b31597650889d5f

export const metadata: Metadata = {
  title: 'Users',
  description: 'Manage all users on the EatnBill platform',
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
<<<<<<< HEAD
  return <AdminLayout>{children}</AdminLayout>;
=======
  return <>{children}</>;
>>>>>>> 2342221b164b9ed1048923ff5b31597650889d5f
}
