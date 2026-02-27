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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ResponsiveTable, PageHeader } from '@/components/responsive-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal,
  Search,
  Users,
  Activity,
  Store,
  Filter,
  RefreshCw,
  UserCircle,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'MANAGER' | 'WAITER';
  is_active: boolean;
  created_at: string;
  tenant: {
    id: string;
    name: string;
  };
  _count: {
    restaurant_users: number;
  };
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const roleColors: Record<string, string> = {
  OWNER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  WAITER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const roleIcons: Record<string, React.ElementType> = {
  OWNER: UserCircle,
  MANAGER: Users,
  WAITER: Store,
};

function UserCard({ user }: { user: User }) {
  const RoleIcon = roleIcons[user.role] || UserCircle;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Link href={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(user.created_at), 'MMM d, yyyy')}
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
                <Link href={`/users/${user.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.id}/activity`}>
                  <Activity className="mr-2 h-4 w-4" />
                  View Activity
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className={cn('font-medium', roleColors[user.role])}>
            <RoleIcon className="h-3 w-3 mr-1" />
            {user.role}
          </Badge>
          <Badge 
            variant={user.is_active ? 'default' : 'destructive'}
            className={cn(user.is_active && 'bg-green-500')}
          >
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <Link 
            href={`/tenants/${user.tenant.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
          >
            <Store className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{user.tenant.name}</span>
          </Link>
          <Badge variant="secondary">{user._count.restaurant_users} restaurants</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-7 sm:h-8 w-48" />
        <Skeleton className="h-3 sm:h-4 w-64 mt-2" />
      </div>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-40" />
          </div>
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

function UsersContent() {
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadUsers = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const response = await apiClient.listUsers({
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
      if (response.success) {
        setUsers(response.data);
        if (showToast) {
          notify.success('Users refreshed', {
            description: `Loaded ${response.data.data.length} users`,
          });
        }
      }
    } catch (error: any) {
      notify.error(messages.users.loadError, {
        description: error.response?.data?.error?.message || messages.general.networkError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, roleFilter, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const handleRefresh = () => {
    loadUsers(true);
  };

  if (isLoading || !users) {
    return <UsersSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      <PageHeader
        title="Users"
        description="Manage all users across tenants"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="WAITER">Waiter</SelectItem>
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
              {users.data.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No users found</p>
                </div>
              ) : (
                users.data.map((user) => (
                  <UserCard key={user.id} user={user} />
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
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold text-center">Restaurants</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="wait">
                    {users.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground font-medium">No users found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.data.map((user, index) => {
                        const RoleIcon = roleIcons[user.role] || UserCircle;
                        return (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <TableCell className="font-medium">
                              <Link href={`/users/${user.id}`} className="flex items-center gap-2 hover:text-primary">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <span className="truncate max-w-[150px] xl:max-w-[200px]">{user.email}</span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('font-medium', roleColors[user.role])}>
                                <RoleIcon className="h-3 w-3 mr-1" />
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.is_active ? 'default' : 'destructive'}
                                className={cn(user.is_active && 'bg-green-500')}
                              >
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link href={`/tenants/${user.tenant.id}`} className="hover:text-primary">
                                {user.tenant.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{user._count.restaurant_users}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(user.created_at), 'MMM d, yyyy')}
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
                                    <Link href={`/users/${user.id}`}>View Details</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/users/${user.id}/activity`}>
                                      <Activity className="mr-2 h-4 w-4" />
                                      View Activity
                                    </Link>
                                  </DropdownMenuItem>
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

          {users.pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-3">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {currentPage} of {users.pagination.totalPages}
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
                  onClick={() => setCurrentPage((p) => Math.min(users.pagination.totalPages, p + 1))}
                  disabled={currentPage === users.pagination.totalPages}
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

export default function UsersPage() {
  return (
    <Suspense fallback={<UsersSkeleton />}>
      <UsersContent />
    </Suspense>
  );
}
