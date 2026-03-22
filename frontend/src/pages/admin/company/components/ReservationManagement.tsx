import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, Pencil, Plus, Trash2, CreditCard } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTableStore } from "@/stores/tables";
import type { TableReservation, ReservationStatus } from "@/types/reservation";

const STATUS_OPTIONS: ReservationStatus[] = ["BOOKED", "SEATED", "CANCELLED", "COMPLETED"];

function getStatusBadgeClass(status: ReservationStatus) {
  if (status === "BOOKED") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "SEATED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function toDatetimeLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocalInput(value: string) {
  return new Date(value).toISOString();
}

function formatDateDayTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "EEE, dd MMM yyyy • hh:mm a");
}

export function ReservationManagement({
  openNewDialog = false,
  onOpenNewHandled,
}: {
  openNewDialog?: boolean;
  onOpenNewHandled?: () => void;
}) {
  const {
    tables,
    reservations,
    loading,
    fetchTables,
    fetchReservations,
    addReservation,
    updateReservation,
    deleteReservation,
    fetchTableAvailability,
  } = useTableStore();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TableReservation | null>(null);

  // Deposit dialog
  interface DepositRecord { id: string; amount: string; status: string; payment_ref: string | null; provider: string | null; notes: string | null; created_at: string; }
  const [depositDialogOpen, setDepositDialogOpen] = React.useState(false);
  const [depositReservation, setDepositReservation] = React.useState<TableReservation | null>(null);
  const [deposits, setDeposits] = React.useState<DepositRecord[]>([]);
  const [depositsLoading, setDepositsLoading] = React.useState(false);
  const [newDepositAmount, setNewDepositAmount] = React.useState("");
  const [newDepositRef, setNewDepositRef] = React.useState("");
  const [newDepositNotes, setNewDepositNotes] = React.useState("");
  const [savingDeposit, setSavingDeposit] = React.useState(false);

  const openDepositDialog = async (res: TableReservation) => {
    setDepositReservation(res);
    setDeposits([]);
    setNewDepositAmount(""); setNewDepositRef(""); setNewDepositNotes("");
    setDepositDialogOpen(true);
    setDepositsLoading(true);
    try {
      const r = await apiClient.get<{ data: DepositRecord[] }>(`/restaurant/table-reservations/${res.id}/deposits`);
      setDeposits((r.data as any)?.data ?? []);
    } catch { /* ignore */ } finally { setDepositsLoading(false); }
  };

  const handleAddDeposit = async () => {
    if (!depositReservation || !newDepositAmount) return;
    setSavingDeposit(true);
    try {
      await apiClient.post(`/restaurant/table-reservations/${depositReservation.id}/deposit`, {
        amount: parseFloat(newDepositAmount), payment_ref: newDepositRef || undefined, provider: "MANUAL", notes: newDepositNotes || undefined,
      });
      toast.success("Deposit recorded");
      const r = await apiClient.get<{ data: DepositRecord[] }>(`/restaurant/table-reservations/${depositReservation.id}/deposits`);
      setDeposits((r.data as any)?.data ?? []);
      setNewDepositAmount(""); setNewDepositRef(""); setNewDepositNotes("");
    } catch (e: any) { toast.error(e.message || "Failed to record deposit"); }
    finally { setSavingDeposit(false); }
  };

  const updateDepositStatus = async (depositId: string, status: string) => {
    if (!depositReservation) return;
    try {
      await apiClient.patch(`/restaurant/table-reservations/${depositReservation.id}/deposit/${depositId}`, { status });
      const r = await apiClient.get<{ data: DepositRecord[] }>(`/restaurant/table-reservations/${depositReservation.id}/deposits`);
      setDeposits((r.data as any)?.data ?? []);
      toast.success("Deposit updated");
    } catch (e: any) { toast.error(e.message || "Failed to update"); }
  };

  const DEPOSIT_STATUS_COLORS: Record<string, string> = { HELD: "text-amber-700 bg-amber-50", CAPTURED: "text-emerald-700 bg-emerald-50", RELEASED: "text-slate-600 bg-slate-100", REFUNDED: "text-rose-700 bg-rose-50" };
  const [availability, setAvailability] = React.useState<Record<string, boolean>>({});

  const [tableId, setTableId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [partySize, setPartySize] = React.useState("2");
  const [reservedFrom, setReservedFrom] = React.useState("");
  const [reservedTo, setReservedTo] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [status, setStatus] = React.useState<ReservationStatus>("BOOKED");

  React.useEffect(() => {
    void fetchTables();
    void fetchReservations();
  }, [fetchTables, fetchReservations]);

  React.useEffect(() => {
    if (!openNewDialog) return;
    handleOpenCreate();
    onOpenNewHandled?.();
  }, [openNewDialog, onOpenNewHandled]);

  React.useEffect(() => {
    if (!reservedFrom || !reservedTo) return;
    let cancelled = false;

    (async () => {
      const response = await fetchTableAvailability(
        fromDatetimeLocalInput(reservedFrom),
        fromDatetimeLocalInput(reservedTo)
      );
      if (cancelled) return;

      const map: Record<string, boolean> = {};
      for (const table of response) {
        map[table.id] = table.is_available;
      }
      setAvailability(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [reservedFrom, reservedTo, fetchTableAvailability]);

  const rows = React.useMemo(() => {
    return reservations
      .slice()
      .sort((a, b) => new Date(a.reserved_from).getTime() - new Date(b.reserved_from).getTime());
  }, [reservations]);

  const clearForm = React.useCallback(() => {
    const start = new Date(Date.now() + 30 * 60_000);
    const plus90 = new Date(start.getTime() + 90 * 60_000);
    setTableId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setPartySize("2");
    setReservedFrom(toDatetimeLocalInput(start.toISOString()));
    setReservedTo(toDatetimeLocalInput(plus90.toISOString()));
    setNotes("");
    setStatus("BOOKED");
  }, []);

  const handleOpenCreate = React.useCallback(() => {
    setEditing(null);
    clearForm();
    setDialogOpen(true);
  }, [clearForm]);

  const handleOpenEdit = (reservation: TableReservation) => {
    setEditing(reservation);
    setTableId(reservation.table_id);
    setCustomerName(reservation.customer_name);
    setCustomerPhone(reservation.customer_phone ?? "");
    setCustomerEmail(reservation.customer_email ?? "");
    setPartySize(String(reservation.party_size));
    setReservedFrom(toDatetimeLocalInput(reservation.reserved_from));
    setReservedTo(toDatetimeLocalInput(reservation.reserved_to));
    setNotes(reservation.notes ?? "");
    setStatus(reservation.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tableId) {
      toast.error("Please select a table");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Mobile number is required");
      return;
    }
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      toast.error("Enter a valid email");
      return;
    }
    if (!reservedFrom || !reservedTo) {
      toast.error("Reservation time is required");
      return;
    }
    if (new Date(reservedTo) <= new Date(reservedFrom)) {
      toast.error("End time must be after start time");
      return;
    }

    const payload = {
      table_id: tableId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim() || null,
      party_size: Number(partySize),
      reserved_from: fromDatetimeLocalInput(reservedFrom),
      reserved_to: fromDatetimeLocalInput(reservedTo),
      notes: notes.trim() || null,
      status,
    };

    if (editing) {
      const updated = await updateReservation(editing.id, payload);
      if (!updated) {
        toast.error("Failed to update reservation");
        return;
      }
      toast.success("Reservation updated");
    } else {
      const created = await addReservation(payload);
      if (!created) {
        toast.error("Failed to create reservation");
        return;
      }
      toast.success("Reservation created");
    }

    await fetchReservations();
    setDialogOpen(false);
  };

  const handleDelete = async (reservation: TableReservation) => {
    if (!window.confirm("Delete this reservation?")) return;
    const success = await deleteReservation(reservation.id);
    if (!success) {
      toast.error("Failed to delete reservation");
      return;
    }
    toast.success("Reservation deleted");
    await fetchReservations();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Reservations</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              {rows.length} total
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="rounded-xl w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Reservation
        </Button>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((reservation) => (
          <div key={reservation.id} className="rounded-xl border border-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-sm">Table {reservation.table?.table_number || reservation.table_id}</p>
              <Badge variant="outline" className={getStatusBadgeClass(reservation.status)}>
                {reservation.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">{reservation.customer_name}</p>
              {reservation.customer_phone && (
                <p className="text-xs text-muted-foreground">{reservation.customer_phone}</p>
              )}
              {reservation.customer_email && (
                <p className="text-xs text-muted-foreground">{reservation.customer_email}</p>
              )}
              <p className="text-xs text-muted-foreground">Party size: {reservation.party_size}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">From</p>
                <p>{format(new Date(reservation.reserved_from), "dd MMM, hh:mm a")}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">To</p>
                <p>{format(new Date(reservation.reserved_to), "dd MMM, hh:mm a")}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button size="icon" variant="ghost" title="Manage Deposit" onClick={() => void openDepositDialog(reservation)}>
                <CreditCard className="h-4 w-4 text-violet-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(reservation)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(reservation)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            No reservations found
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-hidden border border-border rounded-2xl bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-bold">
                  {reservation.table?.table_number || reservation.table_id}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium">{reservation.customer_name}</p>
                    {reservation.customer_phone && (
                      <p className="text-xs text-muted-foreground">{reservation.customer_phone}</p>
                    )}
                    {reservation.customer_email && (
                      <p className="text-xs text-muted-foreground">{reservation.customer_email}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{reservation.party_size}</TableCell>
                <TableCell>{format(new Date(reservation.reserved_from), "dd MMM, hh:mm a")}</TableCell>
                <TableCell>{format(new Date(reservation.reserved_to), "dd MMM, hh:mm a")}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadgeClass(reservation.status)}>
                    {reservation.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button size="icon" variant="ghost" title="Manage Deposit" onClick={() => void openDepositDialog(reservation)}>
                      <CreditCard className="h-4 w-4 text-violet-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(reservation)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(reservation)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No reservations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Deposit Management Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-violet-500" />
              Deposit — {depositReservation?.customer_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing deposits */}
            {depositsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-2">Loading...</p>
            ) : deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No deposits yet.</p>
            ) : (
              <div className="space-y-2">
                {deposits.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <div>
                      <p className="font-bold">₹{Number(d.amount).toFixed(2)}</p>
                      {d.payment_ref && <p className="text-xs text-muted-foreground">Ref: {d.payment_ref}</p>}
                      {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${DEPOSIT_STATUS_COLORS[d.status] ?? "bg-slate-100 text-slate-600"}`}>{d.status}</span>
                      <select value={d.status}
                        onChange={e => void updateDepositStatus(d.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white h-8">
                        {["HELD", "CAPTURED", "RELEASED", "REFUNDED"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new deposit */}
            <div className="border-t border-border pt-3 space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Record New Deposit</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input type="number" value={newDepositAmount} onChange={e => setNewDepositAmount(e.target.value)} className="rounded-xl h-9" placeholder="500" min={1} step={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Ref (optional)</Label>
                  <Input value={newDepositRef} onChange={e => setNewDepositRef(e.target.value)} className="rounded-xl h-9" placeholder="Txn ID / Cheque #" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Input value={newDepositNotes} onChange={e => setNewDepositNotes(e.target.value)} className="rounded-xl h-9" placeholder="e.g. Cash received at front desk" />
              </div>
              <Button onClick={() => void handleAddDeposit()} disabled={savingDeposit || !newDepositAmount} className="w-full rounded-xl">
                {savingDeposit ? "Saving..." : "Record Deposit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Reservation" : "New Reservation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter((table) => table.is_active)
                    .map((table) => {
                      const available = availability[table.id];
                      const isUnavailable = available === false && editing?.table_id !== table.id;
                      return (
                        <SelectItem key={table.id} value={table.id} disabled={isUnavailable}>
                          Table {table.table_number} {isUnavailable ? "• Unavailable" : ""}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input className="rounded-xl" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input className="rounded-xl" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input
                className="rounded-xl"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reservation Start (date & time)</Label>
                <Input className="rounded-xl" type="datetime-local" value={reservedFrom} onChange={(e) => setReservedFrom(e.target.value)} />
                {reservedFrom && (
                  <p className="text-xs text-muted-foreground">{formatDateDayTime(reservedFrom)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reservation End (date & time)</Label>
                <Input className="rounded-xl" type="datetime-local" value={reservedTo} onChange={(e) => setReservedTo(e.target.value)} />
                {reservedTo && (
                  <p className="text-xs text-muted-foreground">{formatDateDayTime(reservedTo)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Party Size</Label>
                <Input className="rounded-xl" type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ReservationStatus)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea className="rounded-xl min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Save Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
