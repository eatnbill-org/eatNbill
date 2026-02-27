'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveTable, PageHeader } from '@/components/responsive-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Calendar,
  Clock,
  User,
  Filter,
  RefreshCw,
  Activity,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  tenant_id: string | null;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin: {
    name: string | null;
    email: string;
  } | null;
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'USER', label: 'User' },
  { value: 'ADMIN_USER', label: 'Admin' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'SUSPEND', label: 'Suspend' },
  { value: 'ACTIVATE', label: 'Activate' },
  { value: 'IMPERSONATE', label: 'Impersonate' },
];

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUSPEND: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ACTIVATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  IMPERSONATE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function LogCard({ log }: { log: AuditLog }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Badge 
            variant="secondary" 
            className={actionColors[log.action] || 'bg-gray-100 text-gray-700'}
          >
            {log.action}
          </Badge>
          <time className="text-xs text-muted-foreground">
            {format(new Date(log.created_at), 'MMM d, HH:mm')}
          </time>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{log.entity}</span>
            {log.entity_id && (
              <span className="text-xs text-muted-foreground font-mono">
                ({log.entity_id.slice(0, 8)}...)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{log.admin ? log.admin.name || log.admin.email : 'System'}</span>
          </div>
          
          {log.ip_address && (
            <div className="text-xs font-mono text-muted-foreground">
              IP: {log.ip_address}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-7 sm:h-8 w-48" />
        <Skeleton className="h-3 sm:h-4 w-64 mt-2" />
      </div>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 w-full max-w-sm" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(5).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityContent() {
  const [logs, setLogs] = useState<AuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadAuditLogs = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const response = await apiClient.listAuditLogs({
        page: currentPage,
        limit: 25,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
      });
      if (response.success) {
        setLogs(response.data);
        if (showToast) {
          notify.success('Audit logs refreshed', {
            description: `Loaded ${response.data.data.length} logs`,
          });
        }
      }
    } catch (error: any) {
      notify.error(messages.audit.loadError, {
        description: error.response?.data?.error?.message || messages.general.networkError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, entityFilter, actionFilter]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleRefresh = () => {
    loadAuditLogs(true);
  };

  const handleExport = () => {
    notify.info('Export feature coming soon', {
      description: 'This feature will be available in a future update.',
    });
  };

  if (isLoading || !logs) {
    return <ActivitySkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      <PageHeader
        title="Activity Logs"
        description="Track all admin actions across the platform"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="h-4 w-4 mr-2 shrink-0" />
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Activity className="h-4 w-4 mr-2 shrink-0" />
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleRefresh} className="shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Mobile Card View */}
          <div className="space-y-3 lg:hidden">
            <AnimatePresence mode="wait">
              {logs.data.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No audit logs found</p>
                </div>
              ) : (
                logs.data.map((log) => (
                  <LogCard key={log.id} log={log} />
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
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Entity</TableHead>
                    <TableHead className="font-semibold">Admin</TableHead>
                    <TableHead className="font-semibold">IP Address</TableHead>
                    <TableHead className="font-semibold">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="wait">
                    {logs.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground font-medium">No audit logs found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.data.map((log, index) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className={actionColors[log.action] || 'bg-gray-100 text-gray-700'}
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>{log.entity}</span>
                              {log.entity_id && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  ({log.entity_id.slice(0, 8)}...)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{log.admin ? log.admin.name || log.admin.email : 'System'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.ip_address || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <time className="text-sm">
                                {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                              </time>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ResponsiveTable>
          </div>

          {logs.pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-3">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {currentPage} of {logs.pagination.totalPages}
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
                  onClick={() => setCurrentPage((p) => Math.min(logs.pagination.totalPages, p + 1))}
                  disabled={currentPage === logs.pagination.totalPages}
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

export default function ActivityPage() {
  return (
    <Suspense fallback={<ActivitySkeleton />}>
      <ActivityContent />
    </Suspense>
  );
}
