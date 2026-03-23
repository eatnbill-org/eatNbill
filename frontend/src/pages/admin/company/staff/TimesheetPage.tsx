import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, LogIn, LogOut, Download, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  notes: string | null;
  user: { id: string; name: string; role: string };
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  WAITER: "bg-emerald-100 text-emerald-700",
};

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function fmtTime(iso: string) {
  return format(parseISO(iso), "hh:mm a");
}

function fmtDate(iso: string) {
  return format(parseISO(iso), "dd MMM");
}

export default function TimesheetPage() {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [entries, setEntries] = React.useState<TimeEntry[]>([]);
  const [staff, setStaff] = React.useState<StaffUser[]>([]);
  const [filterUserId, setFilterUserId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [clockingIn, setClockingIn] = React.useState(false);
  const [clockingOut, setClockingOut] = React.useState(false);

  const fromDate = format(month, "yyyy-MM-dd");
  const toDate = format(endOfMonth(month), "yyyy-MM-dd");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (filterUserId) params.set("user_id", filterUserId);
      const [tRes, sRes] = await Promise.all([
        apiClient.get<{ data: TimeEntry[] }>(`/restaurant/timesheets?${params}`),
        apiClient.get<{ data: StaffUser[] }>("/restaurant/staff"),
      ]);
      setEntries((tRes.data as any)?.data ?? []);
      setStaff((sRes.data as any)?.data ?? []);
    } catch {
      toast.error("Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, filterUserId]);

  React.useEffect(() => { load(); }, [load]);

  const clockIn = async () => {
    setClockingIn(true);
    try {
      await apiClient.post("/restaurant/timesheets/clock-in", {});
      toast.success("Clocked in successfully");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Already clocked in");
    } finally {
      setClockingIn(false);
    }
  };

  const clockOut = async () => {
    setClockingOut(true);
    try {
      await apiClient.post("/restaurant/timesheets/clock-out", {});
      toast.success("Clocked out successfully");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No active clock-in found");
    } finally {
      setClockingOut(false);
    }
  };

  // Compute summary stats
  const totalMinutes = entries.reduce((sum, e) => sum + (e.total_minutes ?? 0), 0);
  const activeNow = entries.filter((e) => e.clock_out === null);
  const uniqueStaff = new Set(entries.map((e) => e.user_id)).size;

  // Group entries by user for summary
  const byUser: Record<string, { name: string; role: string; minutes: number; shifts: number }> = {};
  for (const e of entries) {
    if (!byUser[e.user_id]) {
      byUser[e.user_id] = { name: e.user?.name ?? "Unknown", role: e.user?.role ?? "WAITER", minutes: 0, shifts: 0 };
    }
    byUser[e.user_id].minutes += e.total_minutes ?? 0;
    byUser[e.user_id].shifts += 1;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Timesheets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Clock-in/out records and hours worked</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 h-10 rounded-xl border-slate-200"
            onClick={clockIn}
            disabled={clockingIn}
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            Clock In
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-10 rounded-xl border-slate-200"
            onClick={clockOut}
            disabled={clockingOut}
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            Clock Out
          </Button>
        </div>
      </div>

      {/* Month nav + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            className="p-2 hover:bg-slate-50 transition-colors"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="px-3 text-sm font-bold text-slate-800 min-w-[120px] text-center">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            className="p-2 hover:bg-slate-50 transition-colors"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <select
          className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
        >
          <option value="">All Staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Hours", value: formatDuration(totalMinutes), icon: Clock, color: "text-blue-600 bg-blue-50" },
          { label: "Staff Recorded", value: uniqueStaff, icon: Users, color: "text-purple-600 bg-purple-50" },
          { label: "Active Now", value: activeNow.length, icon: LogIn, color: "text-emerald-600 bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{s.label}</p>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff summary table */}
      {Object.keys(byUser).length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Monthly Summary</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Staff</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Shifts</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(byUser).map(([uid, u]) => (
                <tr key={uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600")}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-700">{u.shifts}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{formatDuration(u.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detailed log */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Clock-In / Clock-Out Log</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No entries for {format(month, "MMMM yyyy")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Staff</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Clock In</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Clock Out</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-600 font-medium">{fmtDate(e.clock_in)}</td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900">{e.user?.name ?? "—"}</div>
                    <div className={cn("text-[10px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded-full", ROLE_COLORS[e.user?.role] ?? "bg-slate-100 text-slate-600")}>
                      {e.user?.role ?? ""}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-700">{fmtTime(e.clock_in)}</td>
                  <td className="px-5 py-3 font-mono text-slate-700">{e.clock_out ? fmtTime(e.clock_out) : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{formatDuration(e.total_minutes)}</td>
                  <td className="px-5 py-3 text-right">
                    {e.clock_out === null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Done
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
