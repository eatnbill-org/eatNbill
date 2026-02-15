// import * as React from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";
// import { Separator } from "@/components/ui/separator";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { useDemoStore } from "@/store/demo-store";
// import type { Customer } from "@/types/demo";
// import { formatDateTime, formatINR } from "@/lib/format";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import { MoreVertical, Search, User, X } from "lucide-react";
// import VirtualizedList from "@/components/admin/VirtualizedList";
// import { useDebouncedValue } from "@/hooks/use-debounced-value";

// function loyaltyLabel(totalOrders: number) {
//   if (totalOrders >= 25) return { label: "VIP", variant: "info" as const };
//   if (totalOrders >= 10) return { label: "Loyal", variant: "success" as const };
//   if (totalOrders >= 5) return { label: "Regular", variant: "secondary" as const };
//   return { label: "New", variant: "muted" as const };
// }

// function isCoarsePointer() {
//   try {
//     return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
//   } catch {
//     return false;
//   }
// }

// async function copyToClipboard(text: string) {
//   try {
//     await navigator.clipboard.writeText(text);
//     return true;
//   } catch {
//     return false;
//   }
// }

// export default function AdminCustomersPage() {
//   const { state } = useDemoStore();
//   const [query, setQuery] = React.useState("");
//   const [selected, setSelected] = React.useState<Customer | null>(null);

//   const [quickCredit, setQuickCredit] = React.useState<Customer | null>(null);
//   const [quickDelete, setQuickDelete] = React.useState<Customer | null>(null);

//   const debouncedQuery = useDebouncedValue(query, 300);

//   const customers = React.useMemo(() => {
//     const q = debouncedQuery.trim().toLowerCase();
//     const list = [...state.customers].sort((a, b) => b.totalOrders - a.totalOrders);
//     if (!q) return list;
//     return list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
//   }, [debouncedQuery, state.customers]);

//   return (
//     <div className="container pb-10">
//       <div className="space-y-3">
//         <div>
//           <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
//           <p className="mt-1 text-sm text-muted-foreground">Search by name or phone.</p>
//         </div>

//         <div className="relative w-full max-w-[500px]">
//           <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//           <Input
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             placeholder="Search customer..."
//             className="pl-9 pr-9"
//           />
//           {query.trim().length > 0 ? (
//             <button
//               type="button"
//               aria-label="Clear search"
//               className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted/50"
//               onClick={() => setQuery("")}
//             >
//               <X className="h-4 w-4" />
//             </button>
//           ) : null}
//         </div>
//       </div>

//       <div className="mt-6 grid gap-6">
//         <VirtualizedList
//           items={customers}
//           itemHeight={140}
//           className="max-h-[70vh] rounded-2xl"
//           renderItem={(c) => {
//             const loyalty = loyaltyLabel(c.totalOrders);
//             return (
//               <Card
//                 key={c.id}
//                 className="group cursor-pointer rounded-xl border shadow-elev-1 transition-colors hover:bg-muted/20"
//                 onClick={() => setSelected(c)}
//               >
//                 <CardContent className="p-5 sm:p-6">
//                   <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
//                     <div className="min-w-0">
//                       <div className="flex flex-wrap items-center gap-2">
//                         <div className="flex items-center gap-2">
//                           <User className="h-4 w-4 text-muted-foreground" />
//                           <p className="truncate text-lg font-semibold text-foreground">{c.name}</p>
//                         </div>
//                         <Badge variant={loyalty.variant}>{loyalty.label}</Badge>
//                         {c.creditBalance > 0 ? (
//                           <button
//                             type="button"
//                             className="rounded-full"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               setQuickCredit(c);
//                             }}
//                             title="Click to manage credit"
//                           >
//                             <Badge variant="warning">Credit {formatINR(c.creditBalance)}</Badge>
//                           </button>
//                         ) : null}
//                         <div className="ml-auto flex items-center gap-2">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button
//                                 variant="ghost"
//                                 size="icon"
//                                 onClick={(e) => e.stopPropagation()}
//                                 aria-label="Quick actions"
//                               >
//                                 <MoreVertical className="h-5 w-5" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end" className="bg-popover">
//                               <DropdownMenuItem
//                                 onSelect={(e) => {
//                                   e.preventDefault();
//                                   setSelected(c);
//                                 }}
//                               >
//                                 View profile
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 onSelect={(e) => {
//                                   e.preventDefault();
//                                   setQuickCredit(c);
//                                 }}
//                               >
//                                 Add credit
//                               </DropdownMenuItem>
//                               <DropdownMenuSeparator />
//                               <DropdownMenuItem
//                                 className="text-destructive"
//                                 onSelect={(e) => {
//                                   e.preventDefault();
//                                   setQuickDelete(c);
//                                 }}
//                               >
//                                 Delete user
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>
//                       </div>

//                       <button
//                         type="button"
//                         className="mt-2 inline-flex text-sm text-muted-foreground hover:underline"
//                         onClick={async (e) => {
//                           e.stopPropagation();
//                           if (isCoarsePointer()) {
//                             window.location.href = `tel:${c.phone}`;
//                             return;
//                           }
//                           const ok = await copyToClipboard(c.phone);
//                           if (ok) toast.success("Phone copied");
//                           else toast.error("Could not copy phone");
//                         }}
//                         title={isCoarsePointer() ? "Tap to call" : "Click to copy"}
//                       >
//                         {c.phone}
//                       </button>

//                       <p className="mt-1 text-xs text-muted-foreground">Last visit: {formatDateTime(c.lastVisit)}</p>
//                     </div>

//                     <div className="grid grid-cols-2 gap-6 sm:flex sm:items-center sm:gap-8">
//                       <div className="text-left sm:text-right">
//                         <p className="text-xs text-muted-foreground">Orders</p>
//                         <p className="text-lg font-semibold text-foreground">{c.totalOrders}</p>
//                       </div>
//                       <div className="text-left sm:text-right">
//                         <p className="text-xs text-muted-foreground">Spent</p>
//                         <p className="text-lg font-semibold text-foreground">{formatINR(c.totalSpent)}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             );
//           }}
//         />
//       </div>

//       <CustomerProfileModal customer={selected} onClose={() => setSelected(null)} />

//       {/* Quick action: Add Credit (UI-only) */}
//       <Dialog open={Boolean(quickCredit)} onOpenChange={(o) => !o && setQuickCredit(null)}>
//         <DialogContent className="max-w-md">
//           <DialogHeader>
//             <DialogTitle>Add credit</DialogTitle>
//             <DialogDescription>
//               {quickCredit ? (
//                 <span>
//                   Customer: <span className="font-medium">{quickCredit.name}</span>
//                 </span>
//               ) : null}
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-3">
//             <div className="rounded-xl border bg-muted/30 p-3 text-sm">
//               Current credit: <span className="font-semibold">{quickCredit ? formatINR(quickCredit.creditBalance) : "—"}</span>
//             </div>
//             <Input placeholder="₹ Amount (demo)" inputMode="numeric" />
//             <Textarea placeholder="Reason (optional)…" className="min-h-[90px]" />
//             <p className="text-xs text-muted-foreground">Demo UI only (does not change stored balance).</p>
//           </div>
//           <DialogFooter>
//             <Button variant="secondary" onClick={() => setQuickCredit(null)}>
//               Cancel
//             </Button>
//             <Button
//               variant="success"
//               onClick={() => {
//                 toast.success("Credit added! (demo)");
//                 setQuickCredit(null);
//               }}
//             >
//               Add credit
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Quick action: Delete (UI-only) */}
//       <AlertDialog open={Boolean(quickDelete)} onOpenChange={(o) => !o && setQuickDelete(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Delete customer</AlertDialogTitle>
//             <AlertDialogDescription>
//               This is a demo-only action. Customer will not be removed.
//               {quickDelete ? (
//                 <span className="mt-2 block">
//                   Are you sure you want to delete <span className="font-medium">{quickDelete.name}</span>?
//                 </span>
//               ) : null}
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
//               onClick={() => {
//                 toast.success("Deleted (demo)");
//                 setQuickDelete(null);
//               }}
//             >
//               Delete
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }

// function CustomerProfileModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
//   const { state, dispatch } = useDemoStore();
//   const [notes, setNotes] = React.useState("");

//   const [sendMsgOpen, setSendMsgOpen] = React.useState(false);
//   const [addCreditOpen, setAddCreditOpen] = React.useState(false);
//   const [deleteOpen, setDeleteOpen] = React.useState(false);
//   const [msgText, setMsgText] = React.useState("");

//   React.useEffect(() => {
//     setNotes(customer?.notes ?? "");
//   }, [customer]);

//   const orders = React.useMemo(() => {
//     if (!customer) return [];
//     return state.orders
//       .filter((o) => o.customerPhone.replace(/\s+/g, "") === customer.phone.replace(/\s+/g, ""))
//       .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
//   }, [customer, state.orders]);

//   const loyalty = customer ? loyaltyLabel(customer.totalOrders) : null;

//   return (
//     <Dialog open={Boolean(customer)} onOpenChange={(o) => !o && onClose()}>
//       <DialogContent className="max-w-3xl">
//         <DialogHeader>
//           <DialogTitle>Customer Profile</DialogTitle>
//           <DialogDescription>
//             {customer ? (
//               <div className="mt-2 space-y-1">
//                 <div className="flex flex-wrap items-center gap-2">
//                   <p className="text-lg font-semibold text-foreground">{customer.name}</p>
//                   {loyalty ? <Badge variant={loyalty.variant}>{loyalty.label}</Badge> : null}
//                   {customer.creditBalance > 0 ? <Badge variant="warning">Credit {formatINR(customer.creditBalance)}</Badge> : null}
//                 </div>
//                 <button
//                   type="button"
//                   className="text-sm text-info hover:underline"
//                   onClick={async () => {
//                     if (isCoarsePointer()) {
//                       window.location.href = `tel:${customer.phone}`;
//                       return;
//                     }
//                     const ok = await copyToClipboard(customer.phone);
//                     if (ok) toast.success("Phone copied");
//                     else toast.error("Could not copy phone");
//                   }}
//                 >
//                   {customer.phone}
//                 </button>
//               </div>
//             ) : null}
//           </DialogDescription>
//         </DialogHeader>

//         {customer ? (
//           <div className="mt-4 grid gap-4">
//             {/* Overview stats */}
//             <div className="grid gap-4 md:grid-cols-2">
//               <Card className="rounded-2xl shadow-elev-1">
//                 <CardContent className="p-4">
//                   <p className="text-xs text-muted-foreground">First visit</p>
//                   <p className="mt-1 text-base font-semibold">{formatDateTime(customer.firstVisit)}</p>
//                 </CardContent>
//               </Card>
//               <Card className="rounded-2xl shadow-elev-1">
//                 <CardContent className="p-4">
//                   <p className="text-xs text-muted-foreground">Last visit</p>
//                   <p className="mt-1 text-base font-semibold">{formatDateTime(customer.lastVisit)}</p>
//                 </CardContent>
//               </Card>
//               <Card className="rounded-2xl shadow-elev-1">
//                 <CardContent className="p-4">
//                   <p className="text-xs text-muted-foreground">Credit</p>
//                   <p className={cn("mt-1 text-base font-semibold", customer.creditBalance > 0 ? "text-warning" : "text-success")}>
//                     {customer.creditBalance > 0 ? formatINR(customer.creditBalance) : formatINR(0)}
//                   </p>
//                 </CardContent>
//               </Card>
//               <Card className="rounded-2xl shadow-elev-1">
//                 <CardContent className="p-4">
//                   <p className="text-xs text-muted-foreground">Spent</p>
//                   <p className="mt-1 text-base font-semibold">{formatINR(customer.totalSpent)}</p>
//                 </CardContent>
//               </Card>
//             </div>

//             {/* Visit statistics */}
//             <Card className="rounded-2xl shadow-elev-1">
//               <CardHeader className="p-4">
//                 <CardTitle className="text-sm">Visit statistics</CardTitle>
//               </CardHeader>
//               <CardContent className="grid gap-3 p-4 pt-0 text-sm">
//                 <div className="flex items-center justify-between gap-3">
//                   <span className="text-muted-foreground">Total visits</span>
//                   <span className="font-semibold">{customer.totalOrders}</span>
//                 </div>
//                 <div className="flex items-center justify-between gap-3">
//                   <span className="text-muted-foreground">Average order value</span>
//                   <span className="font-semibold">{formatINR(Math.round(customer.totalSpent / Math.max(1, customer.totalOrders)))}</span>
//                 </div>
//                 <div className="flex items-center justify-between gap-3">
//                   <span className="text-muted-foreground">Favorite item</span>
//                   <span className="font-semibold">{customer.favoriteItem}</span>
//                 </div>
//                 <div className="flex items-center justify-between gap-3">
//                   <span className="text-muted-foreground">Status</span>
//                   <span className="font-semibold">{loyalty?.label}</span>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Order history */}
//             <Card className="rounded-2xl shadow-elev-1">
//               <CardHeader className="p-4">
//                 <CardTitle className="text-sm">Order history</CardTitle>
//               </CardHeader>
//               <CardContent className="p-0">
//                 {orders.length === 0 ? (
//                   <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>
//                 ) : (
//                   <div className="max-h-[400px] overflow-auto">
//                     <Table>
//                       <TableHeader>
//                         <TableRow>
//                           <TableHead>Date</TableHead>
//                           <TableHead>Order ID</TableHead>
//                           <TableHead>Items</TableHead>
//                           <TableHead className="text-right">Amount</TableHead>
//                         </TableRow>
//                       </TableHeader>
//                       <TableBody>
//                         {orders.map((o) => (
//                           <TableRow key={o.id} className="hover:bg-muted/30">
//                             <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(o.receivedAt)}</TableCell>
//                             <TableCell className="font-medium">{o.id}</TableCell>
//                             <TableCell className="text-sm">{o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</TableCell>
//                             <TableCell className="text-right font-semibold">{formatINR(o.total)}</TableCell>
//                           </TableRow>
//                         ))}
//                       </TableBody>
//                     </Table>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Notes */}
//             <Card className="rounded-2xl shadow-elev-1">
//               <CardHeader className="p-4">
//                 <CardTitle className="text-sm">Notes</CardTitle>
//               </CardHeader>
//               <CardContent className="p-4 pt-0">
//                 <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (e.g., allergies, preferences)…" className="min-h-[140px]" />
//                 <Separator className="my-4" />
//                 <div className="flex justify-end gap-2">
//                   <Button variant="secondary" onClick={onClose}>
//                     Close
//                   </Button>
//                   <Button
//                     variant="default"
//                     onClick={() => {
//                       dispatch({ type: "UPSERT_CUSTOMER_NOTE", phone: customer.phone, notes: notes.trim() });
//                       toast.success("Saved");
//                       onClose();
//                     }}
//                   >
//                     Save notes
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         ) : null}

//         <DialogFooter>
//           <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
//             <div className="flex flex-col gap-2 sm:flex-row">
//               <Button variant="success" onClick={() => setAddCreditOpen(true)}>
//                 Add credit
//               </Button>
//               <Button variant="secondary" onClick={() => setSendMsgOpen(true)}>
//                 Send message
//               </Button>
//               <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
//                 Delete
//               </Button>
//             </div>
//             <Button variant="secondary" onClick={onClose}>
//               Close
//             </Button>
//           </div>
//         </DialogFooter>

//         {/* Add Credit (UI-only) */}
//         <Dialog open={addCreditOpen} onOpenChange={setAddCreditOpen}>
//           <DialogContent className="max-w-md">
//             <DialogHeader>
//               <DialogTitle>Add credit</DialogTitle>
//               <DialogDescription>
//                 {customer ? (
//                   <span>
//                     Customer: <span className="font-medium">{customer.name}</span>
//                   </span>
//                 ) : null}
//               </DialogDescription>
//             </DialogHeader>
//             <div className="grid gap-3">
//               <div className="rounded-xl border bg-muted/30 p-3 text-sm">
//                 Current credit: <span className="font-semibold">{customer ? formatINR(customer.creditBalance) : "—"}</span>
//               </div>
//               <Input placeholder="₹ Amount (demo)" inputMode="numeric" />
//               <Textarea placeholder="Reason (optional)…" className="min-h-[90px]" />
//               <p className="text-xs text-muted-foreground">Demo UI only (does not change stored balance).</p>
//             </div>
//             <DialogFooter>
//               <Button variant="secondary" onClick={() => setAddCreditOpen(false)}>
//                 Cancel
//               </Button>
//               <Button
//                 variant="success"
//                 onClick={() => {
//                   toast.success("Credit added! (demo)");
//                   setAddCreditOpen(false);
//                 }}
//               >
//                 Add credit
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Send Message (UI-only) */}
//         <Dialog open={sendMsgOpen} onOpenChange={setSendMsgOpen}>
//           <DialogContent className="max-w-lg">
//             <DialogHeader>
//               <DialogTitle>Send message</DialogTitle>
//               <DialogDescription>
//                 {customer ? (
//                   <span>
//                     To: <span className="font-medium">{customer.name}</span> ({customer.phone})
//                   </span>
//                 ) : null}
//               </DialogDescription>
//             </DialogHeader>
//             <div className="grid gap-3">
//               <Textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Type message..." className="min-h-[140px]" />
//               <p className="text-xs text-muted-foreground">Demo UI only.</p>
//             </div>
//             <DialogFooter>
//               <Button variant="secondary" onClick={() => setSendMsgOpen(false)}>
//                 Cancel
//               </Button>
//               <Button
//                 variant="success"
//                 onClick={() => {
//                   toast.success("Message sent! (demo)");
//                   setMsgText("");
//                   setSendMsgOpen(false);
//                 }}
//               >
//                 Send
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Delete (UI-only) */}
//         <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
//           <AlertDialogContent>
//             <AlertDialogHeader>
//               <AlertDialogTitle>Delete customer</AlertDialogTitle>
//               <AlertDialogDescription>
//                 This is a demo-only action. Customer will not be removed.
//                 {customer ? (
//                   <span className="mt-2 block">
//                     Are you sure you want to delete <span className="font-medium">{customer.name}</span>?
//                   </span>
//                 ) : null}
//               </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//               <AlertDialogCancel>Cancel</AlertDialogCancel>
//               <AlertDialogAction
//                 className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
//                 onClick={() => {
//                   toast.success("Deleted (demo)");
//                   setDeleteOpen(false);
//                 }}
//               >
//                 Delete
//               </AlertDialogAction>
//             </AlertDialogFooter>
//           </AlertDialogContent>
//         </AlertDialog>
//       </DialogContent>
//     </Dialog>
//   );
// }
