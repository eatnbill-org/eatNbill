// import * as React from "react";
// import type { CampaignSend, Customer } from "@/types/demo";
// import { useDemoStore } from "@/store/demo-store";
// import { cn } from "@/lib/utils";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Calendar } from "@/components/ui/calendar";
// import { toast } from "sonner";
// import { format } from "date-fns";
// import {
//   Camera,
//   Calendar as CalendarIcon,
//   CheckCheck,
//   ChevronRight,
//   Clock,
//   MessageCircle,
//   Send,
//   Sparkles,
//   Users,
//   X,
// } from "lucide-react";
// import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

// type AudienceSegment = "all" | "new" | "repeat" | "udhaar";
// type Template = 1 | 2 | 3;

// const EMOJIS = ["😊", "😂", "👍", "🔥", "⭐", "❤️", "🍗", "🎉", "✨", "👏"] as const;

// function normalizePhone(phone: string) {
//   return phone.replace(/\s+/g, "").trim();
// }

// function segmentLabel(seg: AudienceSegment) {
//   switch (seg) {
//     case "all":
//       return "All";
//     case "new":
//       return "New";
//     case "repeat":
//       return "Repeat";
//     case "udhaar":
//       return "Udhaar";
//   }
// }

// function getCustomersBySegment(customers: Customer[], seg: AudienceSegment) {
//   if (seg === "repeat") return customers.filter((c) => c.totalOrders >= 2);
//   if (seg === "new") return customers.filter((c) => c.totalOrders <= 1);
//   if (seg === "udhaar") return customers.filter((c) => c.creditBalance > 0);
//   return customers;
// }

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// function makeCampaignId() {
//   return `CMP-${Math.floor(Math.random() * 900000 + 100000)}`;
// }

// function formatWhen(iso: string | null) {
//   if (!iso) return "—";
//   try {
//     return new Date(iso).toLocaleString();
//   } catch {
//     return iso;
//   }
// }

// function shortText(s: string, max = 100) {
//   const t = (s ?? "").trim();
//   if (t.length <= max) return t;
//   return `${t.slice(0, max - 1)}…`;
// }

// function generateRecipients(customers: Customer[], selectedIds: string[] | null, seg: AudienceSegment) {
//   const audience =
//     selectedIds && selectedIds.length > 0
//       ? customers.filter((c) => selectedIds.includes(c.id))
//       : getCustomersBySegment(customers, seg);
//   return audience.map((c) => ({
//     customerId: c.id,
//     name: c.name,
//     phone: normalizePhone(c.phone),
//     status: "pending" as const,
//     clickedAt: null,
//   }));
// }

// function simulateMetrics(count: number) {
//   const sent = count;
//   const failed = count === 0 ? 0 : Math.floor(Math.random() * Math.min(2, count));
//   const delivered = clamp(sent - failed, 0, sent);
//   const clicks = delivered === 0 ? 0 : Math.floor(delivered * (0.25 + Math.random() * 0.45));
//   const engaged = clicks === 0 ? 0 : Math.floor(clicks * (0.5 + Math.random() * 0.3));
//   return { sent, delivered, failed, clicks, engaged };
// }

// function applyMetricsToRecipients(
//   recipients: CampaignSend["recipients"],
//   metrics: CampaignSend["metrics"],
//   atIso: string,
// ) {
//   // Deterministically assign statuses for demo.
//   const next = recipients.map((r) => ({ ...r }));
//   const indices = next.map((_, i) => i);
//   for (let i = indices.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [indices[i], indices[j]] = [indices[j], indices[i]];
//   }

//   let cursor = 0;
//   for (let i = 0; i < metrics.failed; i++) {
//     const idx = indices[cursor++];
//     if (idx == null) break;
//     next[idx].status = "failed";
//   }

//   const deliveredCount = metrics.delivered;
//   const clickCount = clamp(metrics.clicks, 0, deliveredCount);

//   for (let i = 0; i < deliveredCount; i++) {
//     const idx = indices[cursor++];
//     if (idx == null) break;
//     next[idx].status = "delivered";
//   }

//   // Promote some delivered to clicked
//   const deliveredIdx = next.map((r, i) => (r.status === "delivered" ? i : -1)).filter((i) => i >= 0);
//   for (let i = deliveredIdx.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [deliveredIdx[i], deliveredIdx[j]] = [deliveredIdx[j], deliveredIdx[i]];
//   }
//   for (let i = 0; i < clickCount; i++) {
//     const idx = deliveredIdx[i];
//     if (idx == null) break;
//     next[idx].status = "clicked";
//     next[idx].clickedAt = atIso;
//   }
//   return next;
// }

// function WhatsAppBubble({
//   template,
//   campaignName,
//   message,
//   imageUrl,
//   productsText,
// }: {
//   template: Template;
//   campaignName: string;
//   message: string;
//   imageUrl?: string;
//   productsText?: string;
// }) {
//   const parts = {
//     title: (
//       <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
//         <Sparkles className="h-4 w-4 text-accent" />
//         <span className="truncate">{campaignName || "Campaign"}</span>
//       </div>
//     ),
//     text: (
//       <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
//         {message || "Type your message…"}
//       </div>
//     ),
//     image: imageUrl ? (
//       <div className="overflow-hidden rounded-lg border bg-muted">
//         <img src={imageUrl} alt="Campaign attachment" className="h-40 w-full object-cover" loading="lazy" />
//       </div>
//     ) : null,
//     button: productsText ? (
//       <button
//         type="button"
//         className="w-full rounded-lg border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/40"
//       >
//         View product · <span className="font-medium">{productsText}</span>
//         <ChevronRight className="ml-1 inline h-4 w-4 text-muted-foreground" />
//       </button>
//     ) : null,
//   };

//   const content = (() => {
//     if (template === 1) return [parts.title, parts.image, parts.text, parts.button];
//     if (template === 2) return [parts.title, parts.text, parts.image, parts.button];
//     // template 3: side-by-side
//     return [
//       parts.title,
//       <div key="split" className="grid gap-3 sm:grid-cols-2">
//         <div className="space-y-3">{parts.image}</div>
//         <div className="space-y-3">
//           {parts.text}
//           {parts.button}
//         </div>
//       </div>,
//     ];
//   })();

//   return (
//     <div className="rounded-2xl border bg-card p-4 shadow-elev-1">
//       <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
//         <div className="flex items-center gap-2">
//           <MessageCircle className="h-4 w-4" />
//           <span className="font-medium">WhatsApp Preview</span>
//         </div>
//         <span className="rounded-full bg-success/10 px-2 py-1 text-success">+91-9876543210</span>
//       </div>
//       <div className="flex justify-end">
//         <div className="w-[min(360px,100%)] rounded-2xl bg-success/10 p-3">
//           <div className="space-y-3">
//             {content.filter(Boolean).map((node, idx) => (
//               <div key={idx}>{node}</div>
//             ))}
//             <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
//               <span>{format(new Date(), "p")}</span>
//               <CheckCheck className="h-4 w-4 text-info" />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function AdminCampaignPage() {
//   const { state, dispatch } = useDemoStore();

//   const [expandedCampaignId, setExpandedCampaignId] = React.useState<string | null>(null);

//   const [campaignName, setCampaignName] = React.useState("");
//   const [message, setMessage] = React.useState("");
//   const [template, setTemplate] = React.useState<Template>(1);

//   const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
//   const [selectedProductIds, setSelectedProductIds] = React.useState<number[]>([]);

//   const [audienceSeg, setAudienceSeg] = React.useState<AudienceSegment>("all");
//   const [manualSelectedIds, setManualSelectedIds] = React.useState<Set<string>>(new Set());
//   const [showAllContacts, setShowAllContacts] = React.useState(false);

//   const [confirmOpen, setConfirmOpen] = React.useState(false);
//   const [scheduleOpen, setScheduleOpen] = React.useState(false);
//   const [fullPreviewOpen, setFullPreviewOpen] = React.useState(false);
//   const [contactsOpen, setContactsOpen] = React.useState(false);

//   const messageRef = React.useRef<HTMLTextAreaElement | null>(null);
//   const fileInputRef = React.useRef<HTMLInputElement | null>(null);

//   const productsById = React.useMemo(() => new Map(state.products.map((p) => [p.id, p])), [state.products]);
//   const selectedProducts = React.useMemo(
//     () => selectedProductIds.map((id) => productsById.get(id)).filter(Boolean),
//     [selectedProductIds, productsById],
//   );
//   const selectedProductsText = React.useMemo(() => {
//     const names = selectedProducts.map((p) => p!.name);
//     if (names.length === 0) return undefined;
//     if (names.length === 1) return names[0];
//     return `${names[0]} +${names.length - 1}`;
//   }, [selectedProducts]);

//   const segmentCustomers = React.useMemo(
//     () => getCustomersBySegment(state.customers, audienceSeg),
//     [state.customers, audienceSeg],
//   );
//   const manualIdsArr = React.useMemo(() => Array.from(manualSelectedIds), [manualSelectedIds]);
//   const effectiveRecipients = React.useMemo(() => {
//     if (manualSelectedIds.size > 0) return state.customers.filter((c) => manualSelectedIds.has(c.id));
//     return segmentCustomers;
//   }, [manualSelectedIds, segmentCustomers, state.customers]);

//   const recipientsCount = effectiveRecipients.length;
//   const messageCount = message.length;

//   const resetForm = React.useCallback(() => {
//     setCampaignName("");
//     setMessage("");
//     setTemplate(1);
//     setImageUrl(undefined);
//     setSelectedProductIds([]);
//     setAudienceSeg("all");
//     setManualSelectedIds(new Set());
//     setShowAllContacts(false);
//   }, []);

//   const toggleProduct = React.useCallback((id: number) => {
//     setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
//   }, []);

//   const onPickEmoji = React.useCallback(
//     (emoji: string) => {
//       const el = messageRef.current;
//       setMessage((prev) => {
//         if (!el) return `${prev}${emoji}`;
//         const start = el.selectionStart ?? prev.length;
//         const end = el.selectionEnd ?? prev.length;
//         const next = `${prev.slice(0, start)}${emoji}${prev.slice(end)}`;
//         // restore cursor after react commit
//         queueMicrotask(() => {
//           try {
//             el.focus();
//             const pos = start + emoji.length;
//             el.setSelectionRange(pos, pos);
//           } catch {
//             // ignore
//           }
//         });
//         return next;
//       });
//     },
//     [setMessage],
//   );

//   const onChooseImage = React.useCallback(() => fileInputRef.current?.click(), []);

//   const onImageFile = React.useCallback((file: File | null) => {
//     if (!file) return;
//     const maxBytes = 5 * 1024 * 1024;
//     if (file.size > maxBytes) {
//       toast.error("Image too large (max 5MB)");
//       return;
//     }
//     if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
//       toast.error("Only JPG, PNG, or WebP allowed");
//       return;
//     }
//     const reader = new FileReader();
//     reader.onload = () => {
//       const result = typeof reader.result === "string" ? reader.result : undefined;
//       setImageUrl(result);
//       toast.success("Image uploaded!");
//     };
//     reader.readAsDataURL(file);
//   }, []);

//   const onSendNow = React.useCallback(() => {
//     if (!campaignName.trim()) {
//       toast.error("Campaign name is required");
//       return;
//     }
//     if (!message.trim()) {
//       toast.error("Message is required");
//       return;
//     }
//     setConfirmOpen(true);
//   }, [campaignName, message]);

//   const commitSend = React.useCallback(() => {
//     const now = new Date().toISOString();
//     const recipients = generateRecipients(state.customers, manualIdsArr.length ? manualIdsArr : null, audienceSeg);
//     const metrics = simulateMetrics(recipients.length);
//     const finalRecipients = applyMetricsToRecipients(recipients, metrics, now);

//     const payload: CampaignSend = {
//       id: makeCampaignId(),
//       name: campaignName.trim(),
//       message: message.trim(),
//       template,
//       imageUrl,
//       productIds: selectedProductIds.length ? selectedProductIds : undefined,
//       audience: audienceSeg,
//       selectedContacts: manualIdsArr.length ? manualIdsArr : undefined,
//       sentAt: now,
//       scheduledFor: null,
//       metrics,
//       recipients: finalRecipients,
//       status: metrics.failed > 0 ? "failed" : "completed",
//     };

//     dispatch({ type: "SEND_CAMPAIGN", payload });
//     toast.success("✓ Campaign sent!");
//     setConfirmOpen(false);
//     resetForm();
//   }, [
//     audienceSeg,
//     campaignName,
//     dispatch,
//     imageUrl,
//     manualIdsArr,
//     message,
//     resetForm,
//     selectedProductIds,
//     state.customers,
//     template,
//   ]);

//   const [scheduleDate, setScheduleDate] = React.useState<Date | undefined>(undefined);
//   const [scheduleTime, setScheduleTime] = React.useState("18:00");

//   const commitSchedule = React.useCallback(() => {
//     if (!campaignName.trim()) {
//       toast.error("Campaign name is required");
//       return;
//     }
//     if (!message.trim()) {
//       toast.error("Message is required");
//       return;
//     }
//     if (!scheduleDate) {
//       toast.error("Pick a date");
//       return;
//     }

//     const [hh, mm] = scheduleTime.split(":").map((x) => Number(x));
//     const d = new Date(scheduleDate);
//     d.setHours(clamp(hh || 0, 0, 23), clamp(mm || 0, 0, 59), 0, 0);

//     const scheduledFor = d.toISOString();
//     const recipients = generateRecipients(state.customers, manualIdsArr.length ? manualIdsArr : null, audienceSeg);
//     const metrics = { sent: recipients.length, delivered: 0, failed: 0, clicks: 0, engaged: 0 };

//     const payload: CampaignSend = {
//       id: makeCampaignId(),
//       name: campaignName.trim(),
//       message: message.trim(),
//       template,
//       imageUrl,
//       productIds: selectedProductIds.length ? selectedProductIds : undefined,
//       audience: audienceSeg,
//       selectedContacts: manualIdsArr.length ? manualIdsArr : undefined,
//       sentAt: null,
//       scheduledFor,
//       metrics,
//       recipients,
//       status: "pending",
//     };
//     dispatch({ type: "SEND_CAMPAIGN", payload });
//     toast.success("Campaign scheduled");
//     setScheduleOpen(false);
//     resetForm();
//   }, [
//     audienceSeg,
//     campaignName,
//     dispatch,
//     imageUrl,
//     manualIdsArr,
//     message,
//     resetForm,
//     scheduleDate,
//     scheduleTime,
//     selectedProductIds,
//     state.customers,
//     template,
//   ]);

//   const toggleManual = React.useCallback((id: string) => {
//     setManualSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   }, []);

//   const pieData = React.useCallback((c: CampaignSend) => {
//     const delivered = c.metrics.delivered;
//     const failed = c.metrics.failed;
//     const clicked = c.metrics.clicks;
//     const pending = clamp(c.metrics.sent - delivered - failed, 0, c.metrics.sent);
//     return [
//       { name: "Delivered", value: delivered, color: "hsl(var(--success))" },
//       { name: "Failed", value: failed, color: "hsl(var(--destructive))" },
//       { name: "Clicked", value: clicked, color: "hsl(var(--accent))" },
//       { name: "Pending", value: pending, color: "hsl(var(--muted-foreground))" },
//     ].filter((d) => d.value > 0);
//   }, []);

//   return (
//     <div className="container pb-10">
//       <div className="mb-6">
//         <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
//         <p className="mt-1 text-sm text-muted-foreground">
//           Compose WhatsApp-style campaigns, preview them, and target your audience (demo).
//         </p>
//       </div>

//       {/* 3-column layout (desktop) */}
//       <div className="grid gap-6 lg:grid-cols-[minmax(0,30%)_minmax(0,40%)_minmax(0,30%)]">
//         {/* Compose */}
//         <Card className="rounded-2xl shadow-elev-1">
//           <CardHeader className="p-4">
//             <CardTitle className="flex items-center justify-between text-base">
//               <span className="flex items-center gap-2">
//                 <span className="text-muted-foreground">1️⃣</span> Compose Message
//               </span>
//               <MessageCircle className="h-4 w-4 text-muted-foreground" />
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4 p-4 pt-0">
//             <div className="space-y-2">
//               <Label>Campaign Name</Label>
//               <Input
//                 value={campaignName}
//                 onChange={(e) => setCampaignName(e.target.value.slice(0, 100))}
//                 placeholder="e.g., Ramadan Special 2025"
//               />
//               <p className="text-xs text-muted-foreground">{campaignName.length}/100</p>
//             </div>

//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <Label>Message</Label>
//                 <span className={cn("text-xs", messageCount > 500 ? "text-destructive" : "text-muted-foreground")}>
//                   {clamp(messageCount, 0, 999)}/500
//                 </span>
//               </div>
//               <Textarea
//                 ref={messageRef}
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value.slice(0, 500))}
//                 placeholder="Type your message here..."
//                 className="min-h-[140px]"
//               />
//               <div className="flex flex-wrap gap-2">
//                 {EMOJIS.map((e) => (
//                   <Button
//                     key={e}
//                     type="button"
//                     size="sm"
//                     variant="secondary"
//                     onClick={() => onPickEmoji(e)}
//                     className="px-2"
//                   >
//                     <span className="text-base leading-none">{e}</span>
//                   </Button>
//                 ))}
//               </div>
//             </div>

//             <div className="space-y-2">
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/png,image/jpeg,image/webp"
//                 className="hidden"
//                 onChange={(e) => onImageFile(e.target.files?.[0] ?? null)}
//               />
//               {!imageUrl ? (
//                 <Button type="button" variant="secondary" className="w-full justify-start" onClick={onChooseImage}>
//                   <Camera className="mr-2 h-4 w-4" />
//                   Add image
//                 </Button>
//               ) : (
//                 <div className="rounded-xl border bg-background p-3">
//                   <div className="flex items-start gap-3">
//                     <img
//                       src={imageUrl}
//                       alt="Uploaded"
//                       className="h-16 w-16 rounded-lg border object-cover"
//                       loading="lazy"
//                     />
//                     <div className="min-w-0 flex-1">
//                       <p className="text-sm font-medium">Image attached</p>
//                       <div className="mt-2 flex flex-wrap gap-2">
//                         <Button type="button" size="sm" variant="secondary" onClick={onChooseImage}>
//                           Change
//                         </Button>
//                         <Button type="button" size="sm" variant="ghost" onClick={() => setImageUrl(undefined)}>
//                           Remove
//                         </Button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="space-y-2">
//               <p className="text-sm font-medium">Select product (optional)</p>
//               <div className="grid grid-cols-3 gap-2">
//                 {state.products.slice(0, 9).map((p) => {
//                   const selected = selectedProductIds.includes(p.id);
//                   return (
//                     <button
//                       key={p.id}
//                       type="button"
//                       onClick={() => toggleProduct(p.id)}
//                       className={cn(
//                         "group rounded-xl border bg-background p-2 text-left transition-colors",
//                         selected ? "border-success bg-success/10" : "hover:bg-muted/40",
//                       )}
//                     >
//                       <div className="flex items-center justify-between gap-2">
//                         <div className="min-w-0">
//                           <p className="truncate text-xs font-semibold">{p.name}</p>
//                           <p className="truncate text-[11px] text-muted-foreground">{p.category}</p>
//                         </div>
//                         {selected ? <Badge variant="subtle">✓</Badge> : null}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 Selected: {selectedProducts.length ? selectedProducts.map((p) => p!.name).join(", ") : "None"}
//               </p>
//             </div>

//             <div className="grid grid-cols-2 gap-3">
//               <Button type="button" variant="success" onClick={onSendNow} className="w-full">
//                 <Send className="mr-2 h-4 w-4" />
//                 Send now
//               </Button>
//               <Button type="button" variant="secondary" onClick={() => setScheduleOpen(true)} className="w-full">
//                 <Clock className="mr-2 h-4 w-4" />
//                 Schedule
//               </Button>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Preview */}
//         <Card className="rounded-2xl shadow-elev-1">
//           <CardHeader className="p-4">
//             <CardTitle className="flex items-center justify-between text-base">
//               <span className="flex items-center gap-2">
//                 <span className="text-muted-foreground">2️⃣</span> Preview
//               </span>
//               <Badge variant="subtle" className="gap-2">
//                 Template
//                 <Select value={String(template)} onValueChange={(v) => setTemplate(Number(v) as Template)}>
//                   <SelectTrigger className="h-8 w-[120px] bg-background">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent className="z-50 bg-popover">
//                     <SelectItem value="1">1</SelectItem>
//                     <SelectItem value="2">2</SelectItem>
//                     <SelectItem value="3">3</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </Badge>
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4 p-4 pt-0">
//             <WhatsAppBubble
//               template={template}
//               campaignName={campaignName}
//               message={message}
//               imageUrl={imageUrl}
//               productsText={selectedProductsText}
//             />

//             {/* <div className="space-y-2">
//               <p className="text-sm font-medium">Template selection</p>
//               <RadioGroup value={String(template)} onValueChange={(v) => setTemplate(Number(v) as Template)} className="grid gap-2">
//                 <div className="flex items-center gap-2 rounded-xl border bg-background p-3">
//                   <RadioGroupItem id="tpl1" value="1" />
//                   <Label htmlFor="tpl1" className="text-sm">Template 1: Image top</Label>
//                 </div>
//                 <div className="flex items-center gap-2 rounded-xl border bg-background p-3">
//                   <RadioGroupItem id="tpl2" value="2" />
//                   <Label htmlFor="tpl2" className="text-sm">Template 2: Text top</Label>
//                 </div>
//                 <div className="flex items-center gap-2 rounded-xl border bg-background p-3">
//                   <RadioGroupItem id="tpl3" value="3" />
//                   <Label htmlFor="tpl3" className="text-sm">Template 3: Side-by-side</Label>
//                 </div>
//               </RadioGroup>
//             </div> */}

//             <div className="grid grid-cols-2 gap-3">
//               <Button type="button" variant="secondary" className="w-full" onClick={() => setFullPreviewOpen(true)}>
//                 View full preview
//               </Button>
//               <Button
//                 type="button"
//                 variant="outline"
//                 className="w-full"
//                 onClick={() => toast.success("Test message sent! (demo)")}
//               >
//                 Test send
//               </Button>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Audience */}
//         <Card className="rounded-2xl shadow-elev-1">
//           <CardHeader className="p-4">
//             <CardTitle className="flex items-center justify-between text-base">
//               <span className="flex items-center gap-2">
//                 <span className="text-muted-foreground">3️⃣</span> Audience
//               </span>
//               <Users className="h-4 w-4 text-muted-foreground" />
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4 p-4 pt-0">
//             <div className="space-y-2">
//               <Label>Select audience</Label>
//               <Select
//                 value={audienceSeg}
//                 onValueChange={(v) => {
//                   setAudienceSeg(v as AudienceSegment);
//                   setManualSelectedIds(new Set());
//                 }}
//               >
//                 <SelectTrigger className="bg-background">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent className="z-50 bg-popover">
//                   <SelectItem value="all">All</SelectItem>
//                   <SelectItem value="new">New</SelectItem>
//                   <SelectItem value="repeat">Repeat</SelectItem>
//                   <SelectItem value="udhaar">Udhaar</SelectItem>
//                 </SelectContent>
//               </Select>
//               <p className="text-xs text-muted-foreground">
//                 Selected: {segmentLabel(audienceSeg)} ({segmentCustomers.length} customers)
//               </p>
//             </div>

//             <div className="space-y-2">
//               <p className="text-sm font-medium">Or select manually</p>
//               <div className="grid gap-2">
//                 {(showAllContacts ? state.customers : state.customers.slice(0, 5)).map((c) => {
//                   const checked = manualSelectedIds.has(c.id);
//                   return (
//                     <label
//                       key={c.id}
//                       className={cn(
//                         "flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-3 transition-colors",
//                         checked ? "border-success bg-success/10" : "hover:bg-muted/40",
//                       )}
//                     >
//                       <Checkbox checked={checked} onCheckedChange={() => toggleManual(c.id)} className="mt-1" />
//                       <div className="min-w-0">
//                         <p className="truncate text-sm font-semibold">{c.name}</p>
//                         <p className="truncate text-xs text-muted-foreground">{normalizePhone(c.phone)}</p>
//                       </div>
//                       {c.creditBalance > 0 ? (
//                         <Badge variant="warning" className="ml-auto">
//                           ₹{c.creditBalance}
//                         </Badge>
//                       ) : null}
//                     </label>
//                   );
//                 })}
//               </div>

//               {state.customers.length > 5 ? (
//                 <div className="flex items-center justify-between">
//                   <Button
//                     type="button"
//                     variant="link"
//                     className="px-0"
//                     onClick={() => {
//                       if (showAllContacts) setShowAllContacts(false);
//                       else setContactsOpen(true);
//                     }}
//                   >
//                     {showAllContacts ? "Show less" : "Show all contacts"}
//                   </Button>
//                   <Button type="button" variant="ghost" onClick={() => setManualSelectedIds(new Set())}>
//                     Clear
//                   </Button>
//                 </div>
//               ) : null}
//             </div>

//             <div className="rounded-xl border bg-muted/40 p-3">
//               <p className="text-sm font-medium">Total recipients: {recipientsCount}</p>
//               <p className="mt-1 text-xs text-muted-foreground">
//                 {manualSelectedIds.size > 0 ? "Manual selection overrides segment" : "Uses selected segment"}
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* History */}
//       <div className="mt-8">
//         <div className="mb-3 flex items-end justify-between gap-4">
//           <div>
//             <h2 className="text-base font-semibold">Campaign history</h2>
//             <p className="text-sm text-muted-foreground">Click a row to expand analytics and recipient breakdown.</p>
//           </div>
//           <Badge variant="subtle">{state.campaigns.length} total</Badge>
//         </div>

//         <Card className="rounded-2xl shadow-elev-1">
//           <CardContent className="p-0">
//             {/* Desktop/tablet table */}
//             <div className="hidden md:block">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Audience</TableHead>
//                     <TableHead className="text-center">Sent</TableHead>
//                     <TableHead className="text-center">Delivered</TableHead>
//                     <TableHead className="text-center">Clicks</TableHead>
//                     <TableHead>Status</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {state.campaigns.map((c) => {
//                     const isExpanded = expandedCampaignId === c.id;
//                     return (
//                       <React.Fragment key={c.id}>
//                         <TableRow
//                           className="cursor-pointer"
//                           onClick={() => setExpandedCampaignId((prev) => (prev === c.id ? null : c.id))}
//                         >
//                           <TableCell>
//                             <div className="min-w-0">
//                               <p className="truncate text-sm font-semibold">{c.name}</p>
//                               <p className="text-xs text-muted-foreground">
//                                 {c.sentAt
//                                   ? formatWhen(c.sentAt)
//                                   : c.scheduledFor
//                                     ? `Scheduled · ${formatWhen(c.scheduledFor)}`
//                                     : "—"}
//                               </p>
//                             </div>
//                           </TableCell>
//                           <TableCell className="text-sm text-muted-foreground">
//                             {segmentLabel(c.audience)} ({c.metrics.sent})
//                           </TableCell>
//                           <TableCell className="text-center font-semibold">{c.metrics.sent}</TableCell>
//                           <TableCell className="text-center">{c.metrics.delivered}</TableCell>
//                           <TableCell className="text-center">{c.metrics.clicks}</TableCell>
//                           <TableCell>
//                             {c.status === "completed" ? (
//                               <Badge variant="subtle">✓ Done</Badge>
//                             ) : c.status === "pending" ? (
//                               <Badge variant="warning">⏱ Pending</Badge>
//                             ) : c.status === "sending" ? (
//                               <Badge variant="info">📤 Sending</Badge>
//                             ) : (
//                               <Badge variant="destructive">⚠ Failed</Badge>
//                             )}
//                           </TableCell>
//                         </TableRow>
//                         {/* Expanded details */}
//                         {isExpanded ? (
//                           <TableRow className="bg-muted/20">
//                             <TableCell colSpan={6} className="p-0">
//                               <CampaignExpandedRow
//                                 campaign={c}
//                                 pieData={pieData(c)}
//                                 productsById={productsById}
//                                 defaultOpen
//                               />
//                             </TableCell>
//                           </TableRow>
//                         ) : null}
//                       </React.Fragment>
//                     );
//                   })}
//                   {state.campaigns.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
//                         No campaigns yet.
//                       </TableCell>
//                     </TableRow>
//                   ) : null}
//                 </TableBody>
//               </Table>
//             </div>

//             {/* Mobile cards */}
//             <div className="md:hidden">
//               <div className="grid gap-3 p-4">
//                 {state.campaigns.map((c) => (
//                   <Card key={c.id} className="rounded-2xl">
//                     <CardContent className="space-y-3 p-4">
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="min-w-0">
//                           <p className="truncate text-sm font-semibold">{c.name}</p>
//                           <p className="text-xs text-muted-foreground">
//                             {c.sentAt
//                               ? formatWhen(c.sentAt)
//                               : c.scheduledFor
//                                 ? `Scheduled · ${formatWhen(c.scheduledFor)}`
//                                 : "—"}
//                           </p>
//                         </div>
//                         <Badge variant="subtle">
//                           {segmentLabel(c.audience)} ({c.metrics.sent})
//                         </Badge>
//                       </div>
//                       <div className="grid grid-cols-3 gap-2 text-center">
//                         <div className="rounded-xl border bg-background p-2">
//                           <p className="text-xs text-muted-foreground">Sent</p>
//                           <p className="text-sm font-semibold">{c.metrics.sent}</p>
//                         </div>
//                         <div className="rounded-xl border bg-background p-2">
//                           <p className="text-xs text-muted-foreground">Delivered</p>
//                           <p className="text-sm font-semibold">{c.metrics.delivered}</p>
//                         </div>
//                         <div className="rounded-xl border bg-background p-2">
//                           <p className="text-xs text-muted-foreground">Clicks</p>
//                           <p className="text-sm font-semibold">{c.metrics.clicks}</p>
//                         </div>
//                       </div>
//                       <CampaignExpandedRow campaign={c} pieData={pieData(c)} productsById={productsById} defaultOpen />
//                     </CardContent>
//                   </Card>
//                 ))}
//                 {state.campaigns.length === 0 ? (
//                   <p className="py-6 text-center text-sm text-muted-foreground">No campaigns yet.</p>
//                 ) : null}
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Confirm Send */}
//       <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
//         <AlertDialogTrigger asChild>
//           <span />
//         </AlertDialogTrigger>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Confirm send</AlertDialogTitle>
//             <AlertDialogDescription>
//               Send <span className="font-medium">{campaignName || "this campaign"}</span> to{" "}
//               <span className="font-medium">{recipientsCount}</span> customers?
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <div className="rounded-xl border bg-muted/30 p-3 text-sm">
//             <p className="font-medium">Message preview</p>
//             <p className="mt-1 text-muted-foreground">{shortText(message, 140)}</p>
//           </div>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={commitSend}>✓ Send</AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Schedule */}
//       <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
//         <DialogContent className="sm:max-w-[520px]">
//           <DialogHeader>
//             <DialogTitle>Schedule campaign</DialogTitle>
//             <DialogDescription>Pick a date and time. The campaign will be saved as pending (demo).</DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-4">
//             <div className="space-y-2">
//               <Label>Date</Label>
//               <Popover>
//                 <PopoverTrigger asChild>
//                   <Button
//                     variant="outline"
//                     className={cn("w-full justify-start text-left", !scheduleDate && "text-muted-foreground")}
//                   >
//                     <CalendarIcon className="mr-2 h-4 w-4" />
//                     {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-auto p-0" align="start">
//                   <Calendar
//                     mode="single"
//                     selected={scheduleDate}
//                     onSelect={setScheduleDate}
//                     initialFocus
//                     className={cn("p-3 pointer-events-auto")}
//                   />
//                 </PopoverContent>
//               </Popover>
//             </div>
//             <div className="space-y-2">
//               <Label>Time</Label>
//               <Input value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} placeholder="18:00" />
//               <p className="text-xs text-muted-foreground">Use 24h format (HH:MM)</p>
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="secondary" onClick={() => setScheduleOpen(false)}>
//               Close
//             </Button>
//             <Button variant="success" onClick={commitSchedule}>
//               Save
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Full Preview */}
//       <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
//         <DialogContent className="sm:max-w-[760px]">
//           <DialogHeader>
//             <DialogTitle>Full preview</DialogTitle>
//             <DialogDescription>Phone-style preview of your campaign (demo).</DialogDescription>
//           </DialogHeader>
//           <div className="grid place-items-center">
//             <div className="w-[min(420px,100%)] rounded-[2.2rem] border bg-background p-4 shadow-elev-2">
//               <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-2">
//                 <p className="text-sm font-semibold">WhatsApp</p>
//                 <Button size="icon" variant="ghost" onClick={() => setFullPreviewOpen(false)}>
//                   <X className="h-4 w-4" />
//                 </Button>
//               </div>
//               <div className="mt-4">
//                 <WhatsAppBubble
//                   template={template}
//                   campaignName={campaignName}
//                   message={message}
//                   imageUrl={imageUrl}
//                   productsText={selectedProductsText}
//                 />
//               </div>
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="secondary" onClick={() => setFullPreviewOpen(false)}>
//               Close
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Contacts picker */}
//       <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
//         <DialogContent className="sm:max-w-[560px]">
//           <DialogHeader>
//             <DialogTitle>All contacts</DialogTitle>
//             <DialogDescription>Select customers manually (demo).</DialogDescription>
//           </DialogHeader>
//           <AllContactsPicker customers={state.customers} selected={manualSelectedIds} onToggle={toggleManual} />
//           <DialogFooter>
//             <Button variant="secondary" onClick={() => setContactsOpen(false)}>
//               Done
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

// function CampaignExpandedRow({
//   campaign,
//   pieData,
//   productsById,
//   defaultOpen,
// }: {
//   campaign: CampaignSend;
//   pieData: Array<{ name: string; value: number; color: string }>;
//   productsById: Map<number, any>;
//   defaultOpen?: boolean;
// }) {
//   const [open, setOpen] = React.useState(Boolean(defaultOpen));

//   const productNames = React.useMemo(() => {
//     const ids = campaign.productIds ?? [];
//     const names = ids.map((id) => productsById.get(id)?.name).filter(Boolean);
//     return names.length ? names.join(", ") : null;
//   }, [campaign.productIds, productsById]);

//   return (
//     <div className="border-t">
//       <button
//         type="button"
//         onClick={() => setOpen((v) => !v)}
//         className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
//       >
//         <span className="text-sm font-medium">{open ? "Hide details" : "View details"}</span>
//         <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
//       </button>
//       {open ? (
//         <div className="grid gap-4 px-4 pb-4">
//           <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
//             <div className="rounded-2xl border bg-background p-4">
//               <p className="text-sm font-semibold">Message preview</p>
//               <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{campaign.message}</p>
//               {campaign.imageUrl ? (
//                 <img
//                   src={campaign.imageUrl}
//                   alt="Campaign image"
//                   className="mt-3 h-40 w-full rounded-xl border object-cover"
//                   loading="lazy"
//                 />
//               ) : null}
//               {productNames ? (
//                 <p className="mt-3 text-xs text-muted-foreground">
//                   Selected product(s): <span className="font-medium text-foreground">{productNames}</span>
//                 </p>
//               ) : null}
//             </div>

//             <div className="rounded-2xl border bg-background p-4">
//               <p className="text-sm font-semibold">Analytics</p>
//               <div className="mt-3 grid grid-cols-2 gap-2">
//                 <Metric label="Sent" value={campaign.metrics.sent} />
//                 <Metric
//                   label="Delivered"
//                   value={`${campaign.metrics.delivered} (${campaign.metrics.sent ? Math.round((campaign.metrics.delivered / campaign.metrics.sent) * 100) : 0}%)`}
//                 />
//                 <Metric label="Clicks" value={campaign.metrics.clicks} />
//                 <Metric label="Failed" value={campaign.metrics.failed} />
//               </div>
//               <div className="mt-4 h-40">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <RechartsTooltip />
//                     <Pie
//                       data={pieData}
//                       dataKey="value"
//                       nameKey="name"
//                       innerRadius={40}
//                       outerRadius={60}
//                       stroke="transparent"
//                     >
//                       {pieData.map((d, i) => (
//                         <Cell key={i} fill={d.color} />
//                       ))}
//                     </Pie>
//                   </PieChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           </div>

//           <div className="rounded-2xl border bg-background">
//             <div className="flex items-center justify-between px-4 py-3">
//               <p className="text-sm font-semibold">Recipient breakdown</p>
//               <Badge variant="subtle">{campaign.recipients.length}</Badge>
//             </div>
//             <ScrollArea className="h-[260px]">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Phone</TableHead>
//                     <TableHead>Status</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {campaign.recipients.map((r) => (
//                     <TableRow key={`${campaign.id}-${r.customerId}`}>
//                       <TableCell className="font-medium">{r.name}</TableCell>
//                       <TableCell className="text-muted-foreground">{r.phone}</TableCell>
//                       <TableCell>
//                         {r.status === "clicked" ? (
//                           <Badge variant="info">✓ Clicked</Badge>
//                         ) : r.status === "delivered" ? (
//                           <Badge variant="subtle">✓ Delivered</Badge>
//                         ) : r.status === "failed" ? (
//                           <Badge variant="destructive">⚠ Failed</Badge>
//                         ) : (
//                           <Badge variant="warning">⏳ Pending</Badge>
//                         )}
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </ScrollArea>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function Metric({ label, value }: { label: string; value: React.ReactNode }) {
//   return (
//     <div className="rounded-xl border bg-muted/30 p-3">
//       <p className="text-xs text-muted-foreground">{label}</p>
//       <p className="mt-1 text-sm font-semibold">{value}</p>
//     </div>
//   );
// }

// function AllContactsPicker({
//   customers,
//   selected,
//   onToggle,
// }: {
//   customers: Customer[];
//   selected: Set<string>;
//   onToggle: (id: string) => void;
// }) {
//   const [q, setQ] = React.useState("");
//   const filtered = React.useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return customers;
//     return customers.filter((c) => c.name.toLowerCase().includes(s) || normalizePhone(c.phone).includes(s));
//   }, [customers, q]);

//   return (
//     <div className="grid gap-3">
//       <div className="space-y-2">
//         <Label>Search</Label>
//         <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts..." />
//       </div>
//       <ScrollArea className="h-[360px] rounded-xl border">
//         <div className="grid gap-2 p-3">
//           {filtered.map((c) => {
//             const checked = selected.has(c.id);
//             return (
//               <label
//                 key={c.id}
//                 className={cn(
//                   "flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-3 transition-colors",
//                   checked ? "border-success bg-success/10" : "hover:bg-muted/40",
//                 )}
//               >
//                 <Checkbox checked={checked} onCheckedChange={() => onToggle(c.id)} className="mt-1" />
//                 <div className="min-w-0">
//                   <p className="truncate text-sm font-semibold">{c.name}</p>
//                   <p className="truncate text-xs text-muted-foreground">{normalizePhone(c.phone)}</p>
//                 </div>
//                 {c.creditBalance > 0 ? (
//                   <Badge variant="warning" className="ml-auto">
//                     ₹{c.creditBalance}
//                   </Badge>
//                 ) : null}
//               </label>
//             );
//           })}
//           {filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No matches.</p> : null}
//         </div>
//       </ScrollArea>
//       <p className="text-xs text-muted-foreground">Selected: {selected.size}</p>
//     </div>
//   );
// }
