import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Search, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, AudienceSegment } from "@/types/demo";

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

function AllContactsPicker({ customers, selected, onToggle }: { customers: Customer[]; selected: Set<string>; onToggle: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(s) || normalizePhone(c.phone).includes(s));
  }, [customers, q]);

  return (
    <div className="grid gap-6">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search via name or identifier..."
          className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium"
        />
      </div>
      <ScrollArea className="h-[400px] rounded-[2rem] border border-slate-100 bg-slate-50/30">
        <div className="grid gap-1 p-2">
          {filtered.map((c) => {
            const checked = selected.has(c.id);
            return (
              <label key={c.id} className={cn("flex cursor-pointer items-center justify-between px-4 py-3 rounded-2xl hover:bg-white transition-all group", checked && "bg-white shadow-sm ring-1 ring-indigo-50")}>
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(c.id)}
                    className="h-5 w-5 rounded-lg border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 leading-tight">{c.name}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{normalizePhone(c.phone)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.creditBalance > 0 && <Badge className="bg-orange-50 text-orange-600 border-orange-100 font-black text-[10px] h-6 px-2 rounded-lg">₹{c.creditBalance}</Badge>}
                  {checked && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-2">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No nodes found</p>
              <p className="text-xs text-slate-300">Try refining your search parameters.</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="flex justify-between items-center px-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authorized Nodes: <span className="text-indigo-600">{selected.size}</span></p>
      </div>
    </div>
  );
}

interface AudienceSelectorProps {
  customers: Customer[];
  audienceSeg: AudienceSegment;
  setAudienceSeg: (v: AudienceSegment) => void;
  manualSelectedIds: Set<string>;
  setManualSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleManual: (id: string) => void;
  recipientsCount: number;
  segmentCustomersCount: number;
}

export function AudienceSelector({
  customers,
  audienceSeg, setAudienceSeg,
  manualSelectedIds, setManualSelectedIds, toggleManual,
  recipientsCount, segmentCustomersCount
}: AudienceSelectorProps) {
  const [contactsOpen, setContactsOpen] = React.useState(false);
  const quickList = React.useMemo(() => customers.slice(0, 10), [customers]);

  return (
    <>
      <Card className="rounded-[2.5rem] shadow-sm border-none bg-white overflow-hidden h-fit">
        <CardHeader className="p-6 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="text-indigo-500 font-black">3.</span> Audience Matrix
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Define Segment</Label>
            <Select value={audienceSeg} onValueChange={(v: any) => { setAudienceSeg(v); setManualSelectedIds(new Set()); }}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="all" className="rounded-xl mx-1 my-1">All Customers</SelectItem>
                <SelectItem value="new" className="rounded-xl mx-1 my-1">New Customers</SelectItem>
                <SelectItem value="repeat" className="rounded-xl mx-1 my-1">Repeat Customers</SelectItem>
                <SelectItem value="udhaar" className="rounded-xl mx-1 my-1">Pending Udhaar</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-1">
              <span>Segment Density:</span>
              <span className="text-slate-800 tracking-normal">{segmentCustomersCount} Members</span>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Selective Protocol</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/30 overflow-hidden">
              <div className="max-h-[220px] overflow-y-auto no-scrollbar divide-y divide-slate-100 bg-slate-50/30">
                {quickList.map((c) => {
                  const checked = manualSelectedIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white transition-all",
                        checked && "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleManual(c.id)}
                          className="h-4.5 w-4.5 rounded-md border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{c.name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{normalizePhone(c.phone)}</p>
                        </div>
                      </div>
                      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-2" />}
                    </label>
                  );
                })}
              </div>

              <div className="bg-white p-3 text-center border-t border-slate-100">
                <button
                  onClick={() => setContactsOpen(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Access Master Directory
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
              <button
                onClick={() => setManualSelectedIds(new Set())}
                className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 transition-colors"
              >
                Reset List
              </button>
              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">
                Active Nodes: {recipientsCount}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-[3rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Master Directory</DialogTitle>
          </DialogHeader>
          <AllContactsPicker customers={customers} selected={manualSelectedIds} onToggle={toggleManual} />
          <DialogFooter className="mt-6">
            <Button
              onClick={() => setContactsOpen(false)}
              className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest text-[11px] bg-slate-900 text-white shadow-xl shadow-slate-200"
            >
              Verify & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
