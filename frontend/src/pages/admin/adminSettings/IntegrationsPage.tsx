/**
 * IntegrationsPage — manage Zomato / Swiggy integration configs and push menu sync.
 */
import * as React from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Utensils,
  ListOrdered,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface IntegrationConfig {
  id: string;
  platform: "ZOMATO" | "SWIGGY";
  external_restaurant_id: string;
  is_enabled: boolean;
  auto_accept: boolean;
  created_at: string;
  restaurant?: { name: string; slug: string };
}

interface MenuSyncLog {
  id: string;
  status: string;
  items_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  ZOMATO: "Zomato",
  SWIGGY: "Swiggy",
};

const PLATFORM_COLORS: Record<string, string> = {
  ZOMATO: "text-red-600 bg-red-50 border-red-200",
  SWIGGY: "text-orange-600 bg-orange-50 border-orange-200",
};

export default function IntegrationsPage() {
  const [configs, setConfigs] = React.useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState<string | null>(null);
  const [logsOpen, setLogsOpen] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<MenuSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);

  const loadConfigs = async () => {
    try {
      const res = await apiClient.get("/integrations/config");
      setConfigs((res.data as any)?.data ?? []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void loadConfigs(); }, []);

  const handleSync = async (configId: string) => {
    setSyncing(configId);
    try {
      const res = await apiClient.post(`/integrations/config/${configId}/menu-sync`);
      const d = (res.data as any);
      toast.success(d.message || "Menu synced");
      if (logsOpen === configId) void loadSyncLogs(configId);
    } catch (e: any) {
      toast.error(e.message || "Menu sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const loadSyncLogs = async (configId: string) => {
    setLogsLoading(true);
    try {
      const res = await apiClient.get(`/integrations/config/${configId}/menu-sync/logs`);
      setLogs((res.data as any)?.data ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleLogs = (configId: string) => {
    if (logsOpen === configId) {
      setLogsOpen(null);
      setLogs([]);
    } else {
      setLogsOpen(configId);
      void loadSyncLogs(configId);
    }
  };

  const handleToggleEnabled = async (config: IntegrationConfig) => {
    try {
      await apiClient.patch(`/integrations/config/${config.id}`, {
        is_enabled: !config.is_enabled,
      });
      setConfigs(prev =>
        prev.map(c => c.id === config.id ? { ...c, is_enabled: !c.is_enabled } : c)
      );
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading integrations…</div>;
  }

  return (
    <div className="container max-w-4xl py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aggregator Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage Zomato & Swiggy integrations, menu mappings, and outbound menu sync.
        </p>
      </div>

      {configs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Utensils className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500 font-medium">No integrations configured</p>
          <p className="text-xs text-slate-400 mt-1">
            Contact support to set up Zomato or Swiggy integration credentials.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map(config => (
            <div
              key={config.id}
              className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-4 p-5">
                <div className={cn(
                  "px-3 py-1 rounded-full border text-xs font-black uppercase tracking-widest",
                  PLATFORM_COLORS[config.platform] ?? "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  {PLATFORM_LABELS[config.platform] ?? config.platform}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    Restaurant ID: <span className="font-mono">{config.external_restaurant_id}</span>
                  </p>
                  {config.restaurant && (
                    <p className="text-xs text-muted-foreground">{config.restaurant.name}</p>
                  )}
                </div>

                <Badge variant={config.is_enabled ? "default" : "secondary"}>
                  {config.is_enabled ? "Active" : "Disabled"}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleToggleEnabled(config)}
                  >
                    {config.is_enabled ? "Disable" : "Enable"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLogs(config.id)}
                  >
                    <ListOrdered className="h-4 w-4 mr-1.5" />
                    Sync History
                  </Button>

                  <Button
                    size="sm"
                    disabled={syncing === config.id}
                    onClick={() => void handleSync(config.id)}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1.5", syncing === config.id && "animate-spin")} />
                    Push Menu
                  </Button>
                </div>
              </div>

              {/* Sync Logs Panel */}
              {logsOpen === config.id && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
                    Recent Menu Sync History
                  </p>
                  {logsLoading ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : logs.length === 0 ? (
                    <p className="text-xs text-slate-400">No sync history yet. Click "Push Menu" to start.</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.map(log => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 text-xs bg-background rounded-xl px-3 py-2 border border-border"
                        >
                          {log.status === "SUCCESS" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : log.status === "FAILED" ? (
                            <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                          )}

                          <span className={cn(
                            "font-bold",
                            log.status === "SUCCESS" && "text-emerald-700",
                            log.status === "FAILED" && "text-rose-700",
                            log.status === "PENDING" && "text-amber-700"
                          )}>
                            {log.status}
                          </span>

                          <span className="text-muted-foreground">
                            {log.items_synced} items
                          </span>

                          {log.error_message && (
                            <span className="text-rose-500 truncate flex-1">{log.error_message}</span>
                          )}

                          <span className="ml-auto text-muted-foreground shrink-0">
                            {format(new Date(log.started_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Menu Sync — How it works</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-700">
          <li>Click <strong>Push Menu</strong> to push your mapped items to the aggregator.</li>
          <li>Only items with an active menu mapping are synced.</li>
          <li>Set up menu mappings first via <strong>Integrations → Menu Map</strong>.</li>
          <li>Zomato and Swiggy require Partner API access — contact support to enable live sync.</li>
        </ul>
      </div>
    </div>
  );
}
