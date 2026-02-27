'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, Search, Building2 } from 'lucide-react';

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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadTenants();
  }, [currentPage, searchQuery]);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.listTenants({
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
      });
      if (response.success) {
        setTenants(response.data);
      }
    } catch (error) {
      toast.error('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async (tenantId: string) => {
    try {
      await apiClient.suspendTenant(tenantId, 'Suspended by admin');
      toast.success('Tenant suspended successfully');
      loadTenants();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivate = async (tenantId: string) => {
    try {
      await apiClient.activateTenant(tenantId);
      toast.success('Tenant activated successfully');
      loadTenants();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'SUSPENDED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      case 'CANCELLED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'secondary';
      case 'PRO':
        return 'default';
      case 'ENTERPRISE':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage all tenants on the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array(5).fill(null).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Restaurants</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No tenants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenants?.data.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <Link href={`/tenants/${tenant.id}`} className="hover:underline">
                              {tenant.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{tenant._count.users}</TableCell>
                        <TableCell>{tenant._count.restaurants}</TableCell>
                        <TableCell>
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/tenants/${tenant.id}`}>View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/tenants/${tenant.id}/edit`}>Edit</Link>
                              </DropdownMenuItem>
                              {tenant.status === 'ACTIVE' ? (
                                <DropdownMenuItem
                                  onClick={() => handleSuspend(tenant.id)}
                                  className="text-destructive"
                                >
                                  Suspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleActivate(tenant.id)}
                                  className="text-green-600"
                                >
                                  Activate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {tenants && tenants.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to{' '}
                    {Math.min(currentPage * 20, tenants.pagination.total)} of{' '}
                    {tenants.pagination.total} tenants
                  </p>
                  <div className="flex items-center gap-2">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
