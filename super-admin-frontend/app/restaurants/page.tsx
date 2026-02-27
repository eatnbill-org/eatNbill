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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable, PageHeader } from '@/components/responsive-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal,
  Search,
  Store,
  ExternalLink,
  Users,
  UtensilsCrossed,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  tenant: {
    id: string;
    name: string;
  };
  _count: {
    orders: number;
    products: number;
  };
}

interface RestaurantsResponse {
  data: Restaurant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Link href={`/restaurants/${restaurant.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{restaurant.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{restaurant.slug}</p>
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
                <Link href={`/restaurants/${restaurant.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`https://eatnbill.com/${restaurant.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Menu
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Link 
          href={`/tenants/${restaurant.tenant.id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 hover:text-primary"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="truncate">{restaurant.tenant.name}</span>
        </Link>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{restaurant._count.orders} orders</Badge>
            <Badge variant="secondary">{restaurant._count.products} products</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(restaurant.created_at), 'MMM d, yyyy')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RestaurantsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-7 sm:h-8 w-48" />
        <Skeleton className="h-3 sm:h-4 w-64 mt-2" />
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

function RestaurantsContent() {
  const [restaurants, setRestaurants] = useState<RestaurantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadRestaurants = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const response = await apiClient.listRestaurants({
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
      });
      if (response.success) {
        setRestaurants(response.data);
        if (showToast) {
          notify.success('Restaurants refreshed', {
            description: `Loaded ${response.data.data.length} restaurants`,
          });
        }
      }
    } catch (error: any) {
      notify.error(messages.restaurants.loadError, {
        description: error.response?.data?.error?.message || messages.general.networkError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadRestaurants();
  };

  const handleRefresh = () => {
    loadRestaurants(true);
  };

  const handleViewMenu = (restaurant: Restaurant) => {
    window.open(`https://eatnbill.com/${restaurant.slug}/menu`, '_blank');
    notify.info('Opening menu...', {
      description: `Viewing ${restaurant.name}'s public menu`,
    });
  };

  if (isLoading || !restaurants) {
    return <RestaurantsSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      <PageHeader
        title="Restaurants"
        description="View all restaurants across tenants"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 w-full"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh} className="shrink-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            <AnimatePresence mode="wait">
              {restaurants.data.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No restaurants found</p>
                </div>
              ) : (
                restaurants.data.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
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
                    <TableHead className="font-semibold">Restaurant</TableHead>
                    <TableHead className="font-semibold">Slug</TableHead>
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold text-center">Orders</TableHead>
                    <TableHead className="font-semibold text-center">Products</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="wait">
                    {restaurants.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Store className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground font-medium">No restaurants found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      restaurants.data.map((restaurant, index) => (
                        <motion.tr
                          key={restaurant.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <TableCell className="font-medium">
                            <Link href={`/restaurants/${restaurant.id}`} className="flex items-center gap-2 hover:text-primary">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <UtensilsCrossed className="h-4 w-4 text-primary" />
                              </div>
                              <span className="truncate max-w-[150px] xl:max-w-[200px]">{restaurant.name}</span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{restaurant.slug}</Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/tenants/${restaurant.tenant.id}`} className="hover:text-primary">
                              {restaurant.tenant.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{restaurant._count.orders}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{restaurant._count.products}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(restaurant.created_at), 'MMM d, yyyy')}
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
                                  <Link href={`/restaurants/${restaurant.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewMenu(restaurant)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Menu
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ResponsiveTable>
          </div>

          {restaurants.pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-3">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {currentPage} of {restaurants.pagination.totalPages}
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
                  onClick={() => setCurrentPage((p) => Math.min(restaurants.pagination.totalPages, p + 1))}
                  disabled={currentPage === restaurants.pagination.totalPages}
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

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<RestaurantsSkeleton />}>
      <RestaurantsContent />
    </Suspense>
  );
}
