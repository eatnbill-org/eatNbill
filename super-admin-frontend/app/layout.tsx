import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'EatnBill Super Admin',
    template: '%s | EatnBill Super Admin',
  },
  description: 'Super Admin Dashboard for managing EatnBill platform - tenants, restaurants, users, and analytics.',
  keywords: ['EatnBill', 'Super Admin', 'Dashboard', 'Restaurant Management', 'SaaS'],
  authors: [{ name: 'EatnBill' }],
  creator: 'EatnBill',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'EatnBill Super Admin',
    title: 'EatnBill Super Admin',
    description: 'Super Admin Dashboard for managing EatnBill platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EatnBill Super Admin',
    description: 'Super Admin Dashboard for managing EatnBill platform',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster 
              position="top-right" 
              richColors 
              closeButton
              toastOptions={{
                duration: 5000,
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
