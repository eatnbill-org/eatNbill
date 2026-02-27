'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { notify, messages } from '@/lib/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveTable, PageHeader, StatCardsGrid } from '@/components/responsive-layout';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Building2,
  Users,
  Store,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  stats: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    activeUsers: number;
    totalRestaurants: number;
    totalOrders: number;
    totalRevenue: string;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    created_at: string;
    admin?: { name: string; email: string } | null;
  }>;
  planDistribution: Array<{
    plan: string;
    count: number;
  }>;
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  trendValue,
  href 
}: { 
  title: string; 
  value: string | number; 
  description: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  href?: string;
}) {
  const content = (
    <Card className="relative overflow-hidden group cursor-pointer transition-all hover:shadow-lg hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {trend && (
            <Badge 
              variant={trend === 'up' ? 'default' : 'destructive'} 
              className="text-xs h-5"
            >
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {trendValue}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-7 sm:h-8 w-48" />
        <Skeleton className="h-3 sm:h-4 w-64 mt-2" />
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <Skeleton key={i} className="h-28 sm:h-32" />
        ))}
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <Skeleton className="h-64 sm:h-80 lg:col-span-4" />
        <Skeleton className="h-64 sm:h-80 lg:col-span-3" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const response = await apiClient.getDashboardOverview();
      if (response.success) {
        setData(response.data);
        if (showToast) {
          notify.success('Dashboard refreshed', {
            description: 'Latest data loaded successfully',
          });
        }
      }
    } catch (error: any) {
      notify.error('Failed to load dashboard', {
        description: error.response?.data?.error?.message || messages.general.networkError,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const timer = setTimeout(() => {
      notify.success('Welcome to Super Admin!', {
        description: 'Your dashboard is ready.',
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const { stats, recentActivity, planDistribution } = data;

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <motion.div 
      className="space-y-6 sm:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <Badge variant="outline" className="font-normal text-xs">
            <Zap className="h-3 w-3 mr-1 text-yellow-500" />
            Live
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </motion.div>

      <motion.p variants={itemVariants} className="text-sm sm:text-base text-muted-foreground">
        Welcome back! Here's what's happening across your platform.
      </motion.p>

      <motion.div variants={itemVariants}>
        <StatCardsGrid>
          <StatCard
            title="Total Tenants"
            value={stats.totalTenants}
            description={`${stats.activeTenants} active`}
            icon={Building2}
            trend="up"
            trendValue="12%"
            href="/tenants"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            description={`${stats.activeUsers} active`}
            icon={Users}
            trend="up"
            trendValue="8%"
            href="/users"
          />
          <StatCard
            title="Restaurants"
            value={stats.totalRestaurants}
            description="Across all tenants"
            icon={Store}
            href="/restaurants"
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(stats.totalRevenue)}
            description={`${stats.totalOrders} orders`}
            icon={TrendingUp}
            trend="up"
            trendValue="23%"
          />
        </StatCardsGrid>
      </motion.div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-sm">Latest actions</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href="/audit-logs">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.slice(0, 5).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.action} {activity.entity}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          by {activity.admin?.name || activity.admin?.email || 'System'}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(activity.created_at), 'MMM d')}
                      </time>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Plan Distribution</CardTitle>
              <CardDescription className="text-sm">Tenants by subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                {planDistribution.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No plan data</p>
                  </div>
                ) : (
                  planDistribution.map((plan, index) => {
                    const percentage = (plan.count / stats.totalTenants) * 100;
                    const colors: Record<string, string> = {
                      FREE: 'bg-slate-500',
                      PRO: 'bg-primary',
                      ENTERPRISE: 'bg-amber-500',
                    };
                    
                    return (
                      <motion.div
                        key={plan.plan}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge 
                              variant="secondary" 
                              className="font-medium text-xs shrink-0"
                            >
                              {plan.plan}
                            </Badge>
                            <span className="text-xs sm:text-sm text-muted-foreground truncate">
                              {plan.count} tenants
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm font-medium">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${colors[plan.plan] || 'bg-primary'}`}
                          />
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
