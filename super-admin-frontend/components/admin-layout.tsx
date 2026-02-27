'use client';

import { Sidebar } from '@/components/sidebar';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile and tablet */}
      <aside className="hidden lg:block">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </aside>

      {/* Mobile Header - Visible only on mobile and tablet */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center gap-3 px-3 sm:px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2 font-semibold min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm truncate">Super Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 overflow-auto w-full min-w-0',
          'pt-14 lg:pt-0' // Padding for mobile header
        )}
      >
        <div className="container mx-auto p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
