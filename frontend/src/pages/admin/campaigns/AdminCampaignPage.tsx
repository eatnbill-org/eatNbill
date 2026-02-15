import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image as ImgIcon, AlignLeft, Wallet, TrendingUp, CalendarRange, Send, Sparkles, Megaphone } from "lucide-react";
import type { AudienceSegment, CampaignSend, Customer, Template } from "@/types/demo";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Imports
import { ComposeSection } from "./components/ComposeSection";
import { WhatsAppPreview } from "./components/WhatsAppPreview";
import { CampaignHistory } from "./components/CampaignHistory";
import { AudienceSelector } from "./components/AudienceSelector";

// Helpers
function makeCampaignId() { return `CMP-${Math.floor(Math.random() * 900000 + 100000)}`; }
function shortText(s: string, max = 100) { const t = (s ?? "").trim(); return t.length <= max ? t : `${t.slice(0, max - 1)}…`; }
function getCustomersBySegment(customers: Customer[], seg: AudienceSegment) {
  if (seg === "repeat") return customers.filter((c) => c.totalOrders >= 2);
  if (seg === "new") return customers.filter((c) => c.totalOrders <= 1);
  if (seg === "udhaar") return customers.filter((c) => c.creditBalance > 0);
  return customers;
}
function normalizePhone(phone: string) { return phone.replace(/\s+/g, "").trim(); }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function AdminCampaignPage() {
  const { state, dispatch } = useDemoStore();

  const [expandedCampaignId, setExpandedCampaignId] = React.useState<string | null>(null);
  const [campaignName, setCampaignName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [template, setTemplate] = React.useState<Template>(1);
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
  const [selectedProductIds, setSelectedProductIds] = React.useState<number[]>([]);
  const [audienceSeg, setAudienceSeg] = React.useState<AudienceSegment>("all");
  const [manualSelectedIds, setManualSelectedIds] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = React.useState("18:00");

  const productsById = React.useMemo(() => new Map(state.products.map((p) => [p.id, p])), [state.products]);
  const selectedProducts = React.useMemo(() => selectedProductIds.map((id) => productsById.get(id)).filter(Boolean), [selectedProductIds, productsById]);
  const selectedProductsText = React.useMemo(() => {
    const names = selectedProducts.map((p) => p.name);
    if (names.length === 0) return undefined;
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  }, [selectedProducts]);

  const segmentCustomers = React.useMemo(() => getCustomersBySegment(state.customers, audienceSeg), [state.customers, audienceSeg]);
  const manualIdsArr = React.useMemo(() => Array.from(manualSelectedIds), [manualSelectedIds]);
  const effectiveRecipients = React.useMemo(() => {
    if (manualSelectedIds.size > 0) return state.customers.filter((c) => manualSelectedIds.has(c.id));
    return segmentCustomers;
  }, [manualSelectedIds, segmentCustomers, state.customers]);

  // Cost Calculation
  const estimatedCost = effectiveRecipients.length * 0.50;

  const resetForm = () => {
    setCampaignName(""); setMessage(""); setTemplate(1); setImageUrl(undefined);
    setSelectedProductIds([]); setAudienceSeg("all"); setManualSelectedIds(new Set());
  };

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleManual = (id: string) => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const generateRecipients = (customers: Customer[], manualIds: string[] | null, seg: AudienceSegment) => {
    const list = manualIds ? customers.filter((c) => manualIds.includes(c.id)) : getCustomersBySegment(customers, seg);
    return list.map((c) => ({
      customerId: c.id,
      name: c.name,
      phone: normalizePhone(c.phone),
      status: "pending" as const
    }));
  };

  const commitSend = () => {
    const now = new Date().toISOString();
    const recipients = generateRecipients(state.customers, manualIdsArr.length ? manualIdsArr : null, audienceSeg);
    const metrics = simulateMetrics(recipients.length);
    const finalRecipients = applyMetricsToRecipients(recipients, metrics, now);

    const payload: CampaignSend = {
      id: makeCampaignId(), name: campaignName.trim(), message: message.trim(), template, imageUrl,
      productIds: selectedProductIds.length ? selectedProductIds : undefined,
      audience: audienceSeg, selectedContacts: manualIdsArr.length ? manualIdsArr : undefined,
      sentAt: now, scheduledFor: null, metrics, recipients: finalRecipients,
      status: metrics.failed > 0 ? "failed" : "completed",
      cost: recipients.length * 0.50 // Store cost
    };
    dispatch({ type: "SEND_CAMPAIGN", payload });
    toast.success("✓ Campaign sent!");
    setConfirmOpen(false); resetForm();
  };

  const commitSchedule = () => {
    if (!scheduleDate) return toast.error("Pick a date");
    const [hh, mm] = scheduleTime.split(":").map(Number);
    const d = new Date(scheduleDate);
    d.setHours(clamp(hh || 0, 0, 23), clamp(mm || 0, 0, 59), 0, 0);
    const scheduledFor = d.toISOString();
    const recipients = generateRecipients(state.customers, manualIdsArr.length ? manualIdsArr : null, audienceSeg);
    const metrics = { sent: recipients.length, delivered: 0, failed: 0, clicks: 0, engaged: 0 };
    const payload: CampaignSend = {
      id: makeCampaignId(), name: campaignName.trim(), message: message.trim(), template, imageUrl,
      productIds: selectedProductIds.length ? selectedProductIds : undefined,
      audience: audienceSeg, selectedContacts: manualIdsArr.length ? manualIdsArr : undefined,
      sentAt: null, scheduledFor, metrics, recipients, status: "pending",
      cost: recipients.length * 0.50 // Store cost
    };
    dispatch({ type: "SEND_CAMPAIGN", payload });
    toast.success("Campaign scheduled");
    resetForm();
  };

  const onSendNow = () => {
    if (!campaignName.trim()) return toast.error("Name required");
    if (!message.trim()) return toast.error("Message required");
    setConfirmOpen(true);
  };

  function simulateMetrics(count: number) {
    const sent = count; const failed = count === 0 ? 0 : Math.floor(Math.random() * Math.min(2, count));
    const delivered = clamp(sent - failed, 0, sent);
    const clicks = delivered === 0 ? 0 : Math.floor(delivered * (0.25 + Math.random() * 0.45));
    const engaged = clicks === 0 ? 0 : Math.floor(clicks * (0.5 + Math.random() * 0.3));
    return { sent, delivered, failed, clicks, engaged };
  }
  function applyMetricsToRecipients(recipients: CampaignSend["recipients"], metrics: CampaignSend["metrics"], atIso: string) {
    const next = recipients.map((r) => ({ ...r }));
    let d = 0; let c = 0; let f = 0;
    for (let i = 0; i < next.length; i++) {
      if (f < metrics.failed) { next[i].status = "failed"; f++; }
      else if (d < metrics.delivered) {
        next[i].status = "delivered"; d++;
        if (c < metrics.clicks) { next[i].status = "clicked"; next[i].clickedAt = atIso; c++; }
      }
    }
    return next;
  }

  return (
    <div className="min-h-full bg-slate-50/50">
      <motion.div
        className="container py-8 space-y-8 no-scrollbar max-w-7xl mx-auto px-4 md:px-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2.5 mb-1.5 px-0.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                <Megaphone className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Campaign Console</h1>
            </div>
            <p className="text-[13px] font-medium text-slate-400 max-w-lg leading-snug px-0.5">
              Target your audience with high-impact WhatsApp marketing protocols and real-time conversion tracking.
            </p>
          </motion.div>

          {/* Business Health Matrix style Stats */}
          <motion.div variants={itemVariants} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {[
              { label: "Available Credits", value: "₹2,450", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Monthly Burn", value: "₹450", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Reach Potential", value: "5.2k", icon: CalendarRange, color: "text-slate-600", bg: "bg-slate-100" },
            ].map((stat, i) => (
              <div key={i} className="flex-none min-w-[140px] bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="text-lg font-black text-slate-800 tabular-nums">{stat.value}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">

          {/* 1. Compose Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <ComposeSection
              campaignName={campaignName} setCampaignName={setCampaignName}
              message={message} setMessage={setMessage}
              imageUrl={imageUrl} setImageUrl={setImageUrl}
              products={state.products} selectedProductIds={selectedProductIds} toggleProduct={toggleProduct} selectedProductsText={selectedProductsText}
              onSendNow={onSendNow}
              scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} scheduleTime={scheduleTime} setScheduleTime={setScheduleTime} onCommitSchedule={commitSchedule}
            />
          </motion.div>

          {/* 2. Preview Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="rounded-[2.5rem] shadow-sm border-none bg-white overflow-hidden h-fit">
              <CardHeader className="p-6 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-indigo-500 font-black">2.</span> Real-time Preview
                  </CardTitle>

                  {/* Template Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <ToggleGroup type="single" value={String(template)} onValueChange={(v) => { if (v) setTemplate(Number(v) as Template) }}>
                      <ToggleGroupItem value="1" className="h-7 w-7 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-indigo-600">
                        <div className="flex flex-col items-center gap-[2px]">
                          <ImgIcon className="w-3.5 h-[6px]" />
                          <AlignLeft className="w-3.5 h-[6px]" />
                        </div>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="2" className="h-7 w-7 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-indigo-600">
                        <div className="flex flex-col items-center gap-[2px]">
                          <AlignLeft className="w-3.5 h-[6px]" />
                          <ImgIcon className="w-3.5 h-[6px]" />
                        </div>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-slate-50/30">
                <div className="rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
                  <WhatsAppPreview template={template} campaignName={campaignName} message={message} imageUrl={imageUrl} productsText={selectedProductsText} />
                </div>
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-white transition-all"
                  onClick={() => setFullPreviewOpen(true)}
                >
                  Launch Interactive Preview
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* 3. Audience Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <AudienceSelector
              customers={state.customers}
              audienceSeg={audienceSeg} setAudienceSeg={setAudienceSeg}
              manualSelectedIds={manualSelectedIds} setManualSelectedIds={setManualSelectedIds} toggleManual={toggleManual}
              recipientsCount={effectiveRecipients.length} segmentCustomersCount={segmentCustomers.length}
            />

            {/* Cost Summary Card */}
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Execution Cost</p>
                  </div>
                  <p className="text-[11px] text-indigo-200 font-medium">{effectiveRecipients.length} recipients × ₹0.50</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black tabular-nums">₹{estimatedCost.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* --- HISTORY SECTION --- */}
        <motion.div variants={itemVariants} className="pt-4">
          <CampaignHistory campaigns={state.campaigns} expandedId={expandedCampaignId} setExpandedId={setExpandedCampaignId} productsById={productsById} />
        </motion.div>
      </motion.div>

      {/* Confirm Send Alert */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Initiate Broadcast?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
              You are about to authorize a campaign dispatch to <span className="text-slate-800 font-bold">{effectiveRecipients.length} nodes</span>.
              Estimated fiscal impact: <span className="text-indigo-600 font-black">₹{estimatedCost.toFixed(2)}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-6 p-5 border border-slate-100 rounded-3xl bg-slate-50/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Manifest:</p>
            <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-3">\"{shortText(message, 150)}\"</p>
          </div>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl font-bold uppercase tracking-widest text-[11px] border-slate-200">Decline</AlertDialogCancel>
            <AlertDialogAction
              onClick={commitSend}
              className="h-12 rounded-2xl font-bold uppercase tracking-widest text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100"
            >
              Authorize Dispatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Preview Modal */}
      <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-widest text-center">Protocol Preview</DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8 pt-2">
            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100">
              <WhatsAppPreview template={template} campaignName={campaignName} message={message} imageUrl={imageUrl} productsText={selectedProductsText} />
            </div>
          </div>
          <div className="p-8 pt-0 pb-10">
            <Button
              onClick={() => setFullPreviewOpen(false)}
              className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest text-[11px] bg-slate-900 text-white"
            >
              Close Terminal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
