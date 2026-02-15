import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Armchair, Plus, QrCode, Trash2, Printer, Edit, Loader2, Filter, Hash, MapPin, Users as UsersIcon } from "lucide-react";
import { useTableStore } from "@/stores/tables";
import { useRestaurantStore } from "@/stores/restaurant";
import { toast } from "sonner";
import { QRCodesSheet } from "./QRCodesSheet";
import type { RestaurantTable } from "@/types/table";
import { cn } from "@/lib/utils";

interface TableManagementProps {
    slug?: string;
}

export function TableManagement({ slug = "demo" }: TableManagementProps) {
    const {
        tables,
        halls,
        loading,
        fetchTables,
        fetchHalls,
        addTable,
        updateTable,
        deleteTable,
        addHall
    } = useTableStore();

    const { restaurant } = useRestaurantStore();

    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [isPrintOpen, setIsPrintOpen] = React.useState(false);

    // State for "Print" (Single or All)
    const [tablesToPrint, setTablesToPrint] = React.useState<any[]>([]);

    // State for "Edit"
    const [editingId, setEditingId] = React.useState<string | null>(null);

    // Form Data
    const [name, setName] = React.useState("");
    const [capacity, setCapacity] = React.useState("4");
    const [hallId, setHallId] = React.useState("");

    // Initial Fetch
    React.useEffect(() => {
        fetchTables();
        fetchHalls();
    }, [fetchTables, fetchHalls]);

    // Ensure at least one hall exists
    React.useEffect(() => {
        if (!loading && halls.length === 0) {
            console.log("No halls found, creating default...");
            addHall({ name: "Main Hall", is_ac: true });
        }
    }, [halls, loading, addHall]);

    // Set default hallId when halls load
    React.useEffect(() => {
        if (halls.length > 0 && !hallId) {
            setHallId(halls[0].id);
        }
    }, [halls, hallId]);

    // --- HANDLERS ---

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        setCapacity("4");
        if (halls.length > 0) setHallId(halls[0].id);
        setIsAddOpen(true);
    };

    const handleOpenEdit = (t: RestaurantTable) => {
        setEditingId(t.id);
        setName(t.table_number);
        setCapacity(t.seats.toString());
        setHallId(t.hall_id);
        setIsAddOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return toast.error("Table Name is required");
        if (!hallId) return toast.error("Hall is required");

        let targetHallId = hallId;

        // Handle Dynamic Hall Creation
        if (hallId.startsWith('create:')) {
            let newHallName = "";
            let isAc = false;

            if (hallId === 'create:AC') { newHallName = "AC Hall"; isAc = true; }
            else if (hallId === 'create:Non-AC') { newHallName = "Non AC Hall"; isAc = false; }
            else if (hallId === 'create:Outdoor') { newHallName = "Outdoor"; isAc = false; }
            else if (hallId === 'create:Custom') {
                const input = document.getElementById('custom-hall-input') as HTMLInputElement;
                newHallName = input?.value || "";
                if (!newHallName) return toast.error("Please enter a name for the hall");
            }

            // check if already exists
            const existing = halls.find(h => h.name.toLowerCase() === newHallName.toLowerCase());
            if (existing) {
                targetHallId = existing.id;
            } else {
                try {
                    const newHall = await addHall({ name: newHallName, is_ac: isAc });
                    if (!newHall) return toast.error("Failed to create hall");
                    targetHallId = newHall.id;
                } catch (e) {
                    return toast.error("Failed to create hall");
                }
            }
        }

        let success = false;
        if (editingId) {
            success = await updateTable(editingId, {
                table_number: name,
                seats: parseInt(capacity),
                hall_id: targetHallId
            });
            if (success) toast.success("Table Updated Successfully");
        } else {
            success = await addTable({
                table_number: name,
                seats: parseInt(capacity),
                hall_id: targetHallId
            });
            if (success) {
                toast.success("Table Added Successfully");
                fetchTables();
            }
        }

        if (success) setIsAddOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Remove this table?")) {
            const success = await deleteTable(id);
            if (success) toast.success("Table Removed");
        }
    };

    const handlePrintAll = () => {
        setTablesToPrint(tables.map(t => ({ id: t.id, name: t.table_number })));
        setIsPrintOpen(true);
    };

    const handlePrintSingle = (t: RestaurantTable) => {
        setTablesToPrint([{ id: t.id, name: t.table_number }]);
        setIsPrintOpen(true);
    };

    const getHallBadgeStyle = (hallName: string) => {
        if (hallName.toLowerCase().includes('ac')) return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        if (hallName.toLowerCase().includes('outdoor')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                        <Armchair className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Dining Architecture</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inventory: {tables.length} Strategic Nodes</span>
                            {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handlePrintAll}
                        disabled={tables.length === 0}
                        className="h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[11px] border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <QrCode className="w-4 h-4 mr-2 text-indigo-500" /> Batch Print QRs
                    </Button>

                    <Button
                        className="bg-slate-900 hover:bg-black h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white transition-all shadow-xl shadow-slate-200"
                        onClick={handleOpenAdd}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Deployment
                    </Button>

                    {/* Dialog for Add/Edit */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                                    {editingId ? "Refine Node Specs" : "Deploy New Node"}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                                            <Hash className="h-3 w-3" />
                                        </div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Structural ID / Number</Label>
                                    </div>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="T-101"
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-indigo-100 font-bold text-slate-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400 border border-orange-200 shadow-sm">
                                                <UsersIcon className="h-3 w-3" />
                                            </div>
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Pax Capacity</Label>
                                        </div>
                                        <Input
                                            type="number"
                                            value={capacity}
                                            onChange={e => setCapacity(e.target.value)}
                                            className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-indigo-100 font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400 border border-indigo-200 shadow-sm">
                                                <MapPin className="h-3 w-3" />
                                            </div>
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Sector Hall</Label>
                                        </div>
                                        <Select value={hallId} onValueChange={setHallId}>
                                            <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl focus:ring-indigo-100 font-bold text-slate-700">
                                                <SelectValue placeholder="Select Zone" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl shadow-2xl">
                                                <SelectItem value="create:AC" className="font-bold py-3 uppercase text-[10px] tracking-widest">AC Hall</SelectItem>
                                                <SelectItem value="create:Non-AC" className="font-bold py-3 uppercase text-[10px] tracking-widest">Non AC Hall</SelectItem>
                                                <SelectItem value="create:Outdoor" className="font-bold py-3 uppercase text-[10px] tracking-widest">Outdoor</SelectItem>
                                                <SelectItem value="create:Custom" className="font-bold py-3 uppercase text-[10px] tracking-widest">Custom Expansion...</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {hallId === 'create:Custom' && (
                                            <Input
                                                placeholder="Zone Name"
                                                className="mt-2 h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-indigo-100 font-bold text-slate-700 uppercase tracking-widest text-[10px]"
                                                id="custom-hall-input"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-8 gap-3 sm:gap-0">
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-slate-900 hover:bg-black h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white shadow-xl shadow-slate-200"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingId ? "Commit Spec" : "Execute Deployment"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsAddOpen(false)}
                                    className="w-full sm:w-auto h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] text-slate-400"
                                >
                                    Abort
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-[2rem] bg-slate-50/30">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-100">
                            <TableHead className="py-6 pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Matrix QR</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Node Identifier</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Deployment Sector</TableHead>
                            <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Occupancy</TableHead>
                            <TableHead className="py-6 pr-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Operations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white">
                        {tables.map(t => (
                            <TableRow key={t.id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none">
                                <TableCell className="py-5 pl-8">
                                    <div className="relative w-14 h-14 border-4 border-slate-50 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                                        {t.qr_code?.qr_png_url ? (
                                            <img src={t.qr_code.qr_png_url} className="w-full h-full object-cover" alt="QR" />
                                        ) : (
                                            <QrCode className="w-6 h-6 text-slate-100" />
                                        )}
                                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-lg font-black text-slate-800 tracking-tighter uppercase">{t.table_number}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("px-3 py-1 rounded-lg font-bold uppercase tracking-widest text-[9px] border", getHallBadgeStyle(t.hall?.name || ""))}>
                                        {t.hall?.name || "Unassigned Zone"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <UsersIcon className="w-4 h-4 text-slate-300" />
                                        <span className="font-bold text-slate-600 text-sm tracking-tight">{t.seats} <span className="text-[10px] text-slate-400 uppercase font-bold ml-0.5">Pax Limit</span></span>
                                    </div>
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Generate Print Logic"
                                            onClick={() => handlePrintSingle(t)}
                                            className="h-10 w-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Update Specs"
                                            onClick={() => handleOpenEdit(t)}
                                            className="h-10 w-10 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Force Removal"
                                            onClick={() => handleDelete(t.id)}
                                            className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {tables.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20">
                                    <div className="flex flex-col items-center justify-center gap-3 opacity-30">
                                        <Armchair className="h-12 w-12 text-slate-400" />
                                        <p className="font-black text-slate-600 uppercase tracking-widest text-xs">No Structural Deployments Found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {loading && tables.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-50" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* QR Sheet */}
            <QRCodesSheet
                open={isPrintOpen}
                onOpenChange={setIsPrintOpen}
                tables={tablesToPrint}
                storeName={restaurant?.name || "Restaurant"}
                slug={restaurant?.slug || slug}
            />
        </div>
    );
}
