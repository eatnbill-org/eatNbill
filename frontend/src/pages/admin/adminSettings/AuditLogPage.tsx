import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user: { id: string; email: string } | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
  DELETE: "bg-rose-100 text-rose-700 border-rose-200",
  LOGIN: "bg-violet-100 text-violet-700 border-violet-200",
  LOGOUT: "bg-slate-100 text-slate-600 border-slate-200",
};

function getActionColor(action: string) {
  const prefix = action.split("_")[0];
  return ACTION_COLORS[prefix] ?? ACTION_COLORS[action] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AuditLogPage() {
  const [page, setPage] = React.useState(1);
  const [entityFilter, setEntityFilter] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: "50",
    ...(entityFilter && { entity: entityFilter }),
    ...(actionFilter && { action: actionFilter }),
  }).toString();

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ["audit-logs", page, entityFilter, actionFilter],
    queryFn: async () => {
      const res = await apiClient.get<AuditLogResponse>(`/restaurant/audit-logs?${queryParams}`);
      return res.data;
    },
  });

  const logs = data?.data ?? [];
  const filteredLogs = debouncedSearch
    ? logs.filter(l =>
        l.entity.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        l.action.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (l.user?.email ?? "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (l.entity_id ?? "").includes(debouncedSearch)
      )
    : logs;

  // Collect unique entities and actions for filter dropdowns
  const uniqueEntities = React.useMemo(() => Array.from(new Set(logs.map(l => l.entity))).sort(), [logs]);
  const uniqueActions = React.useMemo(() => Array.from(new Set(logs.map(l => l.action))).sort(), [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Audit Log</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track all admin actions — creates, updates, deletes
          </p>
        </div>
        {data && (
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {data.total.toLocaleString()} entries
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entity, action, user..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={entityFilter}
                onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-3 pr-8 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="">All Entities</option>
                {uniqueEntities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-3 pr-8 font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="">All Actions</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {(entityFilter || actionFilter || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500"
                  onClick={() => { setEntityFilter(""); setActionFilter(""); setSearch(""); setPage(1); }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardHeader className="py-3 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
          <CardTitle className="text-base flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <ScrollText className="w-4 h-4" /> Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm font-medium">No audit entries found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredLogs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${getActionColor(log.action)}`}
                  >
                    {log.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {log.entity.replace(/_/g, " ")}
                      </span>
                      {log.entity_id && (
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                          {log.entity_id}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">{formatDateTime(log.created_at)}</span>
                      {log.user && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          by {log.user.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="text-[10px] text-slate-400 cursor-pointer shrink-0">
                      <summary className="select-none hover:text-slate-600">details</summary>
                      <pre className="mt-1 bg-slate-50 dark:bg-slate-900 rounded p-1 max-w-[200px] overflow-auto text-[9px]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {data.page} of {data.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage(p => p + 1)}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
