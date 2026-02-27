'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { notify, messages } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable, PageHeader } from '@/components/responsive-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal,
  Plus,
  Search,
  Building2,
  Users,
  Store,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowUpDown,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  created_at: string;
  _count: {
    users: number;
    restaurants: number;
  };
}

interface TenantsResponse {
  data: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const planColors: Record<string, string> = {
  FREE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PRO: 'bg-primary/10 text-primary dark:bg-primary/20',
  ENTERPRISE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const statusConfig: Record<string, { icon: React.ElementType; className: string; bgClass: string }> = {
  ACTIVE: { 
    icon: CheckCircle2, 
    className: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-900/20'
  },
  SUSPENDED: { 
    icon: AlertCircle, 
    className: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20'
  },
  PENDING: { 
    icon: Clock, 
    className: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  CANCELLED: { 
    icon: XCircle, 
    className: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-50 dark:bg-gray-800'
  },
};

function TenantCard({ tenant, onSuspend, onActivate }: { 
  tenant: Tenant; 
  onSuspend: (t: Tenant) => void;
  onActivate: (t: Tenant) => void;
}) {
  const StatusIcon = statusConfig[tenant.status]?.icon || Clock;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Link href={`/tenants/${tenant.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{tenant.name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(tenant.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tenants/${tenant.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/tenants/${tenant.id}/edit`}>Edit Tenant</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.status === 'ACTIVE' ? (
                <DropdownMenuItem onClick={() => onSuspend(tenant)} className="text-red-600">
                  <XCircle className="mr-2 h-4 w-4" /> Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onActivate(tenant)} className="text-green-600">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className={cn('font-medium', planColors[tenant.plan])}>
            {tenant.plan}
          </Badge>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', statusConfig[tenant.status]?.bgClass)}>
            <StatusIcon className={cn('h-3.5 w-3.5', statusConfig[tenant.status]?.className)} />
            <span className={statusConfig[tenant.status]?.className}>{tenant.status}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{tenant._count.users} users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Store className="h-4 w-4" />
            <span>{tenant._count.restaurants} restaurants</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-7 sm:h-8 w-32" />
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-10 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(5).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantsContent() {
  const [tenants, setTenants] = useState<TenantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadTenants = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const response = await apiClient.listTenants({
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (response.success) {
        setTenants(response.data);
        if (showToast) {
          notify.success('Tenants refreshed', {
            description: `Loaded ${response.data.data.length} tenants`,
          });
        }
      }
    } catch (error: any) {
      notify.error(messages.tenants.loadError, {
        description: error.response?.data?.error?.message || messages.general.networkError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadTenants();
  };

  const handleSuspend = async (tenant: Tenant) => {
    const toastId = notify.loading(`Suspending ${tenant.name}...`);
    try {
      await apiClient.suspendTenant(tenant.id, 'Suspended by admin');
      notify.dismiss(toastId);
      notify.success(messages.tenants.suspendSuccess, {
        description: `${tenant.name} has been suspended.`,
      });
      loadTenants();
    } catch (error: any) {
      notify.dismiss(toastId);
      notify.error(messages.tenants.suspendError, {
        description: error.response?.data?.error?.message || messages.general.serverError,
      });
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    const toastId = notify.loading(`Activating ${tenant.name}...`);
    try {
      await apiClient.activateTenant(tenant.id);
      notify.dismiss(toastId);
      notify.success(messages.tenants.activateSuccess, {
        description: `${tenant.name} has been activated.`,
      });
      loadTenants();
    } catch (error: any) {
      notify.dismiss(toastId);
      notify.error(messages.tenants.activateError, {
        description: error.response?.data?.error?.message || messages.general.serverError,
      });
    }
  };

  const handleRefresh = () => {
    loadTenants(true);
  };

  if (isLoading || !tenants) {
    return <TenantsSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      <PageHeader
        title="Tenants"
        description="Manage all tenants on the platform"
      >
        <Button asChild className="w-full sm:w-auto">
          <Link href="/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleRefresh} className="shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            <AnimatePresence mode="wait">
              {tenants.data.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No tenants found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              ) : (
                tenants.data.map((tenant) => (
                  <TenantCard
                    key={tenant.id}
                    tenant={tenant}
                    onSuspend={handleSuspend}
                    onActivate={handleActivate}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Users</TableHead>
                    <TableHead className="font-semibold text-center">Restaurants</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="wait">
                    {tenants.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground font-medium">No tenants found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenants.data.map((tenant, index) => {
                        const StatusIcon = statusConfig[tenant.status]?.icon || Clock;
                        return (
                          <motion.tr
                            key={tenant.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <TableCell className="font-medium">
                              <Link href={`/tenants/${tenant.id}`} className="flex items-center gap-2 hover:text-primary">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                <span className="truncate max-w-[150px] xl:max-w-[200px]">{tenant.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('font-medium', planColors[tenant.plan])}>
                                {tenant.plan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <StatusIcon className={cn('h-4 w-4', statusConfig[tenant.status]?.className)} />
                                <span className={cn('text-sm font-medium', statusConfig[tenant.status]?.className)}>
                                  {tenant.status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{tenant._count.users}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{tenant._count.restaurants}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/tenants/${tenant.id}`}>View Details</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/tenants/${tenant.id}/edit`}>Edit Tenant</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {tenant.status === 'ACTIVE' ? (
                                    <DropdownMenuItem onClick={() => handleSuspend(tenant)} className="text-red-600">
                                      <XCircle className="mr-2 h-4 w-4" /> Suspend
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleActivate(tenant)} className="text-green-600">
                                      <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ResponsiveTable>
          </div>

          {/* Pagination */}
          {tenants.pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-3">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {currentPage} of {tenants.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(tenants.pagination.totalPages, p + 1))}
                  disabled={currentPage === tenants.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<TenantsSkeleton />}>
      <TenantsContent />
    </Suspense>
  );
}
