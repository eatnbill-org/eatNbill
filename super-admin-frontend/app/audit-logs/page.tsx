import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Logs',
  description: 'View audit logs across the platform',
};

export { default } from '../activity/page';
