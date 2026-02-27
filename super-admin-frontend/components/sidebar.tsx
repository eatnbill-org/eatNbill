'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Tenants',
    href: '/tenants',
    icon: Building2,
    badge: 'New',
  },
  {
    title: 'Restaurants',
    href: '/restaurants',
    icon: Store,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Activity',
    href: '/activity',
    icon: Activity,
  },
  {
    title: 'Audit Logs',
    href: '/audit-logs',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className={cn(
          'relative flex h-screen flex-col border-r bg-card/50 backdrop-blur-xl',
          isCollapsed ? 'w-16' : 'w-64'
        )}
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Header */}
        <div className="flex h-14 items-center border-b px-3">
          <Link 
            href="/dashboard" 
            className={cn(
              'flex items-center gap-2 font-semibold transition-all',
              isCollapsed && 'justify-center'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-sm whitespace-nowrap"
                >
                  Super Admin
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent',
                        isActive 
                          ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                          : 'text-muted-foreground',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="flex-1 whitespace-nowrap overflow-hidden"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!isCollapsed && item.badge && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {item.badge}
                        </motion.span>
                      )}
                      {!isCollapsed && isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                          initial={false}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="flex items-center gap-2">
                      {item.title}
                      {item.badge && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {item.badge}
                        </span>
                      )}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* User Section */}
        <div className="border-t p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent',
                isCollapsed && 'justify-center'
              )}>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {admin?.name?.charAt(0) || admin?.email?.charAt(0) || 'A'}
                  </span>
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 min-w-0 overflow-hidden"
                    >
                      <p className="text-sm font-medium truncate">{admin?.name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">{admin?.email}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p className="font-medium">{admin?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{admin?.email}</p>
              </TooltipContent>
            )}
          </Tooltip>

          <Separator className="my-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  'w-full justify-start gap-3 text-muted-foreground hover:text-foreground',
                  isCollapsed && 'justify-center px-2'
                )}
                onClick={logout}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      Logout
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
