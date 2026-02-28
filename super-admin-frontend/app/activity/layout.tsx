import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity',
  description: 'View platform activity logs',
};

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
