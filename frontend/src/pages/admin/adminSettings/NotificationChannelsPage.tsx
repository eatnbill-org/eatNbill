import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Channel {
  id: string;
  type: "SMS" | "WHATSAPP";
  provider: string;
  config: Record<string, string>;
  is_active: boolean;
  events: string[];
}

interface LogEntry {
  id: string;
  event: string;
  recipient: string;
  status: string;
  error: string | null;
  created_at: string;
}

const SMS_PROVIDERS = ["TWILIO", "MSG91"];
const WA_PROVIDERS = ["MSG91", "META_CLOUD", "TWILIO"];
const ALL_EVENTS = [
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "ORDER_READY", label: "Order Ready" },
  { value: "ORDER_COMPLETED", label: "Order Completed" },
  { value: "RESERVATION_REMINDER", label: "Reservation Reminder" },
];

const STATUS_ICON = {
  SENT: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  FAILED: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
  PENDING: <Clock className="h-3.5 w-3.5 text-amber-400" />,
};

function ChannelCard({ type, channel, onSave }: {
  type: "SMS" | "WHATSAPP";
  channel: Channel | null;
  onSave: (type: string, data: Partial<Channel>) => Promise<void>;
}) {
  const providers = type === "SMS" ? SMS_PROVIDERS : WA_PROVIDERS;
  const [provider, setProvider] = React.useState(channel?.provider ?? providers[0]);
  const [config, setConfig] = React.useState<Record<string, string>>(channel?.config ?? {});
  const [isActive, setIsActive] = React.useState(channel?.is_active ?? false);
  const [events, setEvents] = React.useState<string[]>(channel?.events ?? []);
  const [saving, setSaving] = React.useState(false);
  const [showLogs, setShowLogs] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);

  React.useEffect(() => {
    setProvider(channel?.provider ?? providers[0]);
    setConfig(channel?.config ?? {});
    setIsActive(channel?.is_active ?? false);
    setEvents(channel?.events ?? []);
  }, [channel]);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await apiClient.get<{ data: LogEntry[] }>(`/restaurant/notification-channels/${type}/logs`);
      setLogs((res.data as any)?.data ?? []);
    } catch { /* ignore */ } finally { setLogsLoading(false); }
  };

  const toggleLog = () => {
    if (!showLogs) void loadLogs();
    setShowLogs(v => !v);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(type, { provider, config, is_active: isActive, events });
      toast.success(`${type === "SMS" ? "SMS" : "WhatsApp"} channel saved`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const toggleEvent = (ev: string) => {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  const configFields = (): { key: string; label: string; placeholder: string; secret?: boolean }[] => {
    if (provider === "TWILIO") return [
      { key: "account_sid", label: "Account SID", placeholder: "ACxxxxxxx" },
      { key: "auth_token", label: "Auth Token", placeholder: "•••••", secret: true },
      { key: "from_number", label: `From Number${type === "WHATSAPP" ? " (whatsapp:+1xxx)" : ""}`, placeholder: type === "WHATSAPP" ? "whatsapp:+14155238886" : "+14155238886" },
    ];
    if (provider === "MSG91") return [
      { key: "auth_key", label: "Auth Key", placeholder: "•••••", secret: true },
      { key: "sender_id", label: "Sender ID", placeholder: "EATNBL" },
      { key: "template_id", label: "Template ID (optional)", placeholder: "123456" },
    ];
    if (provider === "META_CLOUD") return [
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "123456789" },
      { key: "access_token", label: "Access Token", placeholder: "•••••", secret: true },
      { key: "template_namespace", label: "Template Namespace", placeholder: "abc-123" },
    ];
    return [];
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", type === "SMS" ? "bg-blue-50" : "bg-emerald-50")}>
            <MessageSquare className={cn("h-5 w-5", type === "SMS" ? "text-blue-500" : "text-emerald-500")} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{type === "SMS" ? "SMS Notifications" : "WhatsApp Notifications"}</h3>
            <p className="text-[11px] text-slate-400">{type === "SMS" ? "Twilio, MSG91" : "Meta Cloud API, MSG91, Twilio"}</p>
          </div>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {isActive && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Provider</Label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden h-9">
              {providers.map(p => (
                <button key={p} type="button" onClick={() => setProvider(p)}
                  className={cn("flex-1 text-[11px] font-black transition-all", provider === p ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                  {p.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {configFields().map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{f.label}</Label>
                <Input
                  type={f.secret ? "password" : "text"}
                  value={config[f.key] ?? ""}
                  onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="h-9 rounded-xl text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trigger Events</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                  className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                    events.includes(ev.value) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}>
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-9 text-xs font-bold">
          {saving ? "Saving..." : "Save Channel"}
        </Button>
        {channel && (
          <Button variant="outline" onClick={toggleLog} className="rounded-xl h-9 text-xs font-bold gap-1.5">
            <Bell className="h-3.5 w-3.5" /> {showLogs ? "Hide" : "Logs"}
          </Button>
        )}
      </div>

      {showLogs && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {logsLoading ? (
            <p className="text-slate-400 text-xs text-center py-2">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-2">No logs yet.</p>
          ) : logs.map(l => (
            <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
              <div className="flex items-center gap-2">
                {STATUS_ICON[l.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.PENDING}
                <span className="font-semibold text-slate-700">{l.event}</span>
                <span className="text-slate-400">{l.recipient}</span>
              </div>
              <span className="text-slate-400 text-[10px]">{format(parseISO(l.created_at), "d MMM, hh:mm a")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationChannelsPage() {
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    try {
      const res = await apiClient.get<{ data: Channel[] }>("/restaurant/notification-channels");
      setChannels((res.data as any)?.data ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  React.useEffect(() => { void load(); }, []);

  const handleSave = async (type: string, data: Partial<Channel>) => {
    await apiClient.put(`/restaurant/notification-channels/${type}`, data);
    await load();
  };

  const smsChannel = channels.find(c => c.type === "SMS") ?? null;
  const waChannel = channels.find(c => c.type === "WHATSAPP") ?? null;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-violet-500" />
          Notification Channels
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure SMS and WhatsApp to notify customers on order events and reservation reminders.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChannelCard type="SMS" channel={smsChannel} onSave={handleSave} />
          <ChannelCard type="WHATSAPP" channel={waChannel} onSave={handleSave} />
        </div>
      )}
    </div>
  );
}
