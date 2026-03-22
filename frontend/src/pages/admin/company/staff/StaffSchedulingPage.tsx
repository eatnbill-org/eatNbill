import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";

interface StaffUser {
  id: string;
  name: string;
  role: string;
  email?: string;
}

interface StaffSchedule {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  role?: string;
  notes?: string;
  user: { name: string; role: string };
}

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  user: { name: string };
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  WAITER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DEFAULT: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function StaffSchedulingPage() {
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedules, setSchedules] = React.useState<StaffSchedule[]>([]);
  const [staff, setStaff] = React.useState<StaffUser[]>([]);
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // New shift form
  const [formDate, setFormDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [formUserId, setFormUserId] = React.useState("");
  const [formStart, setFormStart] = React.useState("09:00");
  const [formEnd, setFormEnd] = React.useState("17:00");
  const [formNotes, setFormNotes] = React.useState("");

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = async () => {
    setLoading(true);
    try {
      const from = format(weekStart, "yyyy-MM-dd");
      const to = format(addDays(weekStart, 6), "yyyy-MM-dd");
      const [schedRes, staffRes, timeRes] = await Promise.all([
        apiClient.get<{ data: StaffSchedule[] }>(`/restaurant/staff-schedules?from_date=${from}&to_date=${to}`),
        apiClient.get<{ data: StaffUser[] }>("/restaurant/staff"),
        apiClient.get<{ data: TimeEntry[] }>(`/restaurant/timesheets?from_date=${from}&to_date=${to}`),
      ]);
      setSchedules((schedRes.data as any)?.data ?? []);
      setStaff((staffRes.data as any)?.data ?? []);
      setTimeEntries((timeRes.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, [weekStart]);

  const getShiftsForDay = (day: Date) =>
    schedules.filter((s) => isSameDay(parseISO(s.date), day));

  const handleAddShift = async () => {
    if (!formUserId || !formDate) { toast.error("Please select a staff member and date"); return; }
    setSaving(true);
    try {
      await apiClient.post("/restaurant/staff-schedules", {
        user_id: formUserId,
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        notes: formNotes || undefined,
      });
      toast.success("Shift added");
      setDialogOpen(false);
      setFormNotes("");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await apiClient.delete(`/restaurant/staff-schedules/${id}`);
      toast.success("Shift removed");
      void load();
    } catch {
      // ignore
    }
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  };

  // Today's clock-ins (ungrouped)
  const todayEntries = timeEntries.filter((t) => isSameDay(parseISO(t.clock_in), new Date()));

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Staff Scheduling
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage shifts and track attendance</p>
        </div>
        <Button onClick={() => { setFormDate(format(new Date(), "yyyy-MM-dd")); setFormUserId(""); setFormStart("09:00"); setFormEnd("17:00"); setFormNotes(""); setDialogOpen(true); }}
          className="rounded-xl gap-2 h-9 text-xs font-bold">
          <Plus className="h-3.5 w-3.5" /> Add Shift
        </Button>
      </div>

      {/* Week navigation */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-slate-700">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
          </span>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const shifts = getShiftsForDay(day);
              return (
                <div key={day.toISOString()} className={cn("min-h-32 p-2", isToday && "bg-blue-50/50")}>
                  <div className={cn("text-center mb-2", isToday ? "text-blue-600" : "text-slate-500")}>
                    <p className="text-[10px] font-bold uppercase tracking-wider">{format(day, "EEE")}</p>
                    <p className={cn("text-lg font-black leading-none mt-0.5", isToday && "bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto text-sm")}>
                      {format(day, "d")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {shifts.map((s) => {
                      const colorClass = ROLE_COLORS[s.user?.role ?? ""] ?? ROLE_COLORS.DEFAULT;
                      return (
                        <div key={s.id} className={cn("px-1.5 py-1 rounded-lg border text-[10px] font-bold group relative", colorClass)}>
                          <p className="truncate">{s.user?.name ?? "Staff"}</p>
                          <p className="font-medium opacity-70">{s.start_time}–{s.end_time}</p>
                          <button
                            onClick={() => void handleDeleteShift(s.id)}
                            className="absolute top-0.5 right-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded bg-white/80 text-rose-500"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                    {shifts.length === 0 && (
                      <p className="text-[10px] text-slate-300 text-center mt-2">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's time entries */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">Today's Attendance</h2>
          <span className="ml-auto text-[10px] text-slate-400">{format(new Date(), "d MMM yyyy")}</span>
        </div>
        {todayEntries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No clock-ins today yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayEntries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{entry.user?.name ?? "Staff"}</p>
                  <p className="text-xs text-slate-400">
                    In: {format(parseISO(entry.clock_in), "hh:mm a")}
                    {entry.clock_out && ` · Out: ${format(parseISO(entry.clock_out), "hh:mm a")}`}
                  </p>
                </div>
                <div className="text-right">
                  {entry.clock_out ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                      {entry.total_minutes ? formatMinutes(entry.total_minutes) : "Done"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold animate-pulse">
                      On Shift
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Shift Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 space-y-4">
          <DialogTitle className="text-base font-black uppercase tracking-tight">Add Shift</DialogTitle>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Staff Member</Label>
            <select
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 text-sm px-3 bg-white"
            >
              <option value="">Select staff...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</Label>
            <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-10 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Start Time</Label>
              <Input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">End Time</Label>
              <Input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes (optional)</Label>
            <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="h-10 rounded-xl" placeholder="e.g. Cover for John" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleAddShift()} disabled={saving}>
              {saving ? "Saving..." : "Add Shift"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
