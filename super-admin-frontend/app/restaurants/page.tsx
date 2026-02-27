'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
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
import { toast } from 'sonner';
import { MoreHorizontal, Search, Store, ExternalLink } from 'lucide-react';

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

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadRestaurants();
  }, [currentPage, searchQuery]);

  const loadRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.listRestaurants({
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
      });
      if (response.success) {
        setRestaurants(response.data);
      }
    } catch (error) {
      toast.error('Failed to load restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Restaurants</h1>
          <p className="text-muted-foreground">
            View all restaurants across tenants
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
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
                    <TableHead>Slug</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No restaurants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    restaurants?.data.map((restaurant) => (
                      <TableRow key={restaurant.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <Link href={`/restaurants/${restaurant.id}`} className="hover:underline">
                              {restaurant.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{restaurant.slug}</Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/tenants/${restaurant.tenant.id}`} className="hover:underline">
                            {restaurant.tenant.name}
                          </Link>
                        </TableCell>
                        <TableCell>{restaurant._count.orders}</TableCell>
                        <TableCell>{restaurant._count.products}</TableCell>
                        <TableCell>
                          {new Date(restaurant.created_at).toLocaleDateString()}
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
                                <Link href={`/restaurants/${restaurant.id}`}>
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a
                                  href={`https://eatnbill.com/${restaurant.slug}/menu`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  View Menu
                                  <ExternalLink className="ml-2 h-3 w-3" />
                                </a>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {restaurants && restaurants.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to{' '}
                    {Math.min(currentPage * 20, restaurants.pagination.total)} of{' '}
                    {restaurants.pagination.total} restaurants
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
                      onClick={() => setCurrentPage((p) => Math.min(restaurants.pagination.totalPages, p + 1))}
                      disabled={currentPage === restaurants.pagination.totalPages}
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
