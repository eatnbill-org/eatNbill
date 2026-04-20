/**
 * Banquet / Event Hall Booking Management
 * Book entire halls for events (weddings, birthdays, corporate), manage deposits, track status
 */
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  Users,
  Building2,
  IndianRupee,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDateTime } from "@/lib/format";

interface Hall { id: string; name: string; }

interface EventBooking {
  id: string;
  hall_id: string;
  event_type: string;
  event_name: string | null;
  event_date: string;
  event_end_date: string | null;
  guest_count: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  menu_notes: string | null;
  special_requests: string | null;
  advance_amount: string | null;
  total_amount: string | null;
  status: string;
  notes: string | null;
  hall?: { id: string; name: string };
  created_at: string;
}

const EVENT_TYPES = ["WEDDING", "BIRTHDAY", "CORPORATE", "ANNIVERSARY", "OTHER"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ENQUIRY: { label: "Enquiry", color: "border-slate-200 bg-slate-50 text-slate-600", icon: <Clock className="h-3 w-3" /> },
  CONFIRMED: { label: "Confirmed", color: "border-blue-200 bg-blue-50 text-blue-700", icon: <CheckCircle className="h-3 w-3" /> },
  DEPOSIT_PAID: { label: "Deposit Paid", color: "border-violet-200 bg-violet-50 text-violet-700", icon: <IndianRupee className="h-3 w-3" /> },
  IN_PROGRESS: { label: "In Progress", color: "border-amber-200 bg-amber-50 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  COMPLETED: { label: "Completed", color: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED: { label: "Cancelled", color: "border-rose-200 bg-rose-50 text-rose-600", icon: <XCircle className="h-3 w-3" /> },
};

const EMPTY_FORM = {
  hall_id: "",
  event_type: "WEDDING",
  event_name: "",
  event_date: "",
  event_end_date: "",
  guest_count: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  menu_notes: "",
  special_requests: "",
  advance_amount: "",
  total_amount: "",
  notes: "",
};

export default function BanquetPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editBooking, setEditBooking] = React.useState<EventBooking | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const { data: hallsRes } = useQuery<{ data: Hall[] }>({
    queryKey: ["halls"],
    queryFn: () => apiClient.get<any>("/restaurant/halls").then(r => r.data),
  });
  const halls = (hallsRes as any)?.data ?? [];

  const { data: bookingsRes, isLoading } = useQuery<{ data: EventBooking[]; total: number }>({
    queryKey: ["event-bookings", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      return apiClient.get<any>(`/restaurant/event-bookings?${params}`).then(r => r.data);
    },
    refetchInterval: 30000,
  });

  const bookings = bookingsRes?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/restaurant/event-bookings/${id}`),
    onSuccess: () => { toast.success("Booking deleted"); queryClient.invalidateQueries({ queryKey: ["event-bookings"] }); },
    onError: () => toast.error("Failed to delete booking"),
  });

  const openCreate = () => {
    setEditBooking(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (booking: EventBooking) => {
    setEditBooking(booking);
    setForm({
      hall_id: booking.hall_id,
      event_type: booking.event_type,
      event_name: booking.event_name ?? "",
      event_date: booking.event_date.slice(0, 16),
      event_end_date: booking.event_end_date?.slice(0, 16) ?? "",
      guest_count: String(booking.guest_count),
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone ?? "",
      customer_email: booking.customer_email ?? "",
      menu_notes: booking.menu_notes ?? "",
      special_requests: booking.special_requests ?? "",
      advance_amount: booking.advance_amount ?? "",
      total_amount: booking.total_amount ?? "",
      notes: booking.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hall_id || !form.event_date || !form.customer_name || !form.guest_count) {
      toast.error("Hall, date, guest name and count are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        guest_count: parseInt(form.guest_count),
        advance_amount: form.advance_amount ? parseFloat(form.advance_amount) : undefined,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : undefined,
        event_end_date: form.event_end_date || undefined,
        event_name: form.event_name || undefined,
        customer_phone: form.customer_phone || undefined,
        customer_email: form.customer_email || undefined,
        menu_notes: form.menu_notes || undefined,
        special_requests: form.special_requests || undefined,
        notes: form.notes || undefined,
      };
      if (editBooking) {
        await apiClient.patch(`/restaurant/event-bookings/${editBooking.id}`, payload);
        toast.success("Booking updated");
      } else {
        await apiClient.post("/restaurant/event-bookings", payload);
        toast.success("Event booking created");
      }
      queryClient.invalidateQueries({ queryKey: ["event-bookings"] });
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save booking");
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/restaurant/event-bookings/${id}`, { status });
      queryClient.invalidateQueries({ queryKey: ["event-bookings"] });
      toast.success("Status updated");
    } catch { toast.error("Failed to update status"); }
  };

  const f = (field: keyof typeof form, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const upcomingCount = bookings.filter(b => new Date(b.event_date) >= new Date() && b.status !== "CANCELLED").length;
  const totalRevenue = bookings.reduce((s, b) => s + parseFloat(b.total_amount ?? "0"), 0);
  const pendingDeposits = bookings.filter(b => b.advance_amount && b.status === "CONFIRMED").length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-violet-500" /> Banquet & Events
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage hall bookings for weddings, birthdays, corporate events
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl shadow-md">
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-violet-100 rounded-xl"><CalendarDays className="h-5 w-5 text-violet-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Upcoming Events</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{upcomingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl"><IndianRupee className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatINR(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Deposits</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{pendingDeposits}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", ...Object.keys(STATUS_CONFIG)].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${statusFilter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"}`}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Bookings Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-slate-200" />
          <p className="font-bold text-slate-500">No event bookings found</p>
          <Button variant="link" onClick={openCreate} className="mt-2">Create the first booking</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map(booking => {
            const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.ENQUIRY;
            const isUpcoming = new Date(booking.event_date) >= new Date();
            return (
              <Card key={booking.id} className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-black flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-violet-500 shrink-0" />
                        {booking.hall?.name ?? "Unknown Hall"}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {booking.event_name || booking.event_type} · {booking.customer_name}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold shrink-0 flex items-center gap-1 ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      <span className="font-medium">{new Date(booking.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">{booking.guest_count} guests</span>
                    </div>
                    {booking.total_amount && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <IndianRupee className="h-3 w-3" />
                        <span className="font-medium">{formatINR(parseFloat(booking.total_amount))}</span>
                      </div>
                    )}
                    {booking.advance_amount && (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-medium">Adv: {formatINR(parseFloat(booking.advance_amount))}</span>
                      </div>
                    )}
                  </div>

                  {/* Status change buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                    {booking.status === "ENQUIRY" && (
                      <button type="button" onClick={() => updateStatus(booking.id, "CONFIRMED")} className="text-[10px] font-bold text-blue-600 hover:underline">→ Confirm</button>
                    )}
                    {booking.status === "CONFIRMED" && (
                      <button type="button" onClick={() => updateStatus(booking.id, "DEPOSIT_PAID")} className="text-[10px] font-bold text-violet-600 hover:underline">→ Deposit Paid</button>
                    )}
                    {(booking.status === "CONFIRMED" || booking.status === "DEPOSIT_PAID") && (
                      <button type="button" onClick={() => updateStatus(booking.id, "IN_PROGRESS")} className="text-[10px] font-bold text-amber-600 hover:underline">→ Start Event</button>
                    )}
                    {booking.status === "IN_PROGRESS" && (
                      <button type="button" onClick={() => updateStatus(booking.id, "COMPLETED")} className="text-[10px] font-bold text-emerald-600 hover:underline">→ Complete</button>
                    )}
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(booking)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {booking.status === "ENQUIRY" && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => { if (confirm("Delete this booking?")) deleteMutation.mutate(booking.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-violet-500" />
              {editBooking ? "Edit Event Booking" : "New Event Booking"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Hall */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hall *</label>
                  <select
                    value={form.hall_id}
                    onChange={e => f("hall_id", e.target.value)}
                    className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white text-sm px-3"
                    required
                  >
                    <option value="">Select hall...</option>
                    {halls.map((h: Hall) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Type *</label>
                  <select
                    value={form.event_type}
                    onChange={e => f("event_type", e.target.value)}
                    className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white text-sm px-3"
                  >
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Event Name */}
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Name</label>
                <Input value={form.event_name} onChange={e => f("event_name", e.target.value)} placeholder="e.g. Sharma Wedding Reception" className="mt-1" />
              </div>

              {/* Dates */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Date & Time *</label>
                <Input type="datetime-local" value={form.event_date} onChange={e => f("event_date", e.target.value)} className="mt-1" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date & Time</label>
                <Input type="datetime-local" value={form.event_end_date} onChange={e => f("event_end_date", e.target.value)} className="mt-1" />
              </div>

              {/* Customer Info */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name *</label>
                <Input value={form.customer_name} onChange={e => f("customer_name", e.target.value)} placeholder="Full name" className="mt-1" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guest Count *</label>
                <Input type="number" min="1" value={form.guest_count} onChange={e => f("guest_count", e.target.value)} placeholder="200" className="mt-1" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                <Input value={form.customer_phone} onChange={e => f("customer_phone", e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <Input type="email" value={form.customer_email} onChange={e => f("customer_email", e.target.value)} placeholder="customer@email.com" className="mt-1" />
              </div>

              {/* Financials */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</label>
                <Input type="number" step="0.01" value={form.total_amount} onChange={e => f("total_amount", e.target.value)} placeholder="250000" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advance / Deposit</label>
                <Input type="number" step="0.01" value={form.advance_amount} onChange={e => f("advance_amount", e.target.value)} placeholder="50000" className="mt-1" />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Menu Notes</label>
                <textarea
                  value={form.menu_notes}
                  onChange={e => f("menu_notes", e.target.value)}
                  placeholder="Special dietary requirements, menu preferences..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm min-h-[60px] resize-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Special Requests</label>
                <textarea
                  value={form.special_requests}
                  onChange={e => f("special_requests", e.target.value)}
                  placeholder="Decoration, AV setup, parking..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm min-h-[60px] resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                {editBooking ? "Save Changes" : "Create Booking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
