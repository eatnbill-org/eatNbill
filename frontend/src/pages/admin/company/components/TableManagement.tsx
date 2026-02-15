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
        addHall,
        bulkAddTables
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

    // Bulk creation
    const [isBulkMode, setIsBulkMode] = React.useState(false);
    const [bulkRangeStart, setBulkRangeStart] = React.useState("1");
    const [bulkRangeEnd, setBulkRangeEnd] = React.useState("10");

    // Track if we've already initialized
    const hasInitialized = React.useRef(false);

    // Initial Fetch
    React.useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            fetchTables();
            fetchHalls();
        }
    }, []);

    // Set default hallId when halls load
    React.useEffect(() => {
        if (halls.length > 0 && !hallId && isAddOpen) {
            setHallId(halls[0].id);
        }
    }, [halls, isAddOpen]);

    // --- HANDLERS ---

    const handleOpenAdd = () => {
        setEditingId(null);
        setName("");
        setCapacity("4");
        setIsBulkMode(false);
        setBulkRangeStart("1");
        setBulkRangeEnd("10");
        if (halls.length > 0) setHallId(halls[0].id);
        setIsAddOpen(true);
    };

    const handleOpenEdit = (t: RestaurantTable) => {
        setEditingId(t.id);
        setName(t.table_number);
        setCapacity(t.seats.toString());
        setHallId(t.hall_id);
        setIsBulkMode(false);
        setIsAddOpen(true);
    };

    const handleCreateRandomTable = async () => {
        let targetHallId = "";
        
        // Try to find "Non-AC" hall or create it
        const nonAcHall = halls.find(h => h.name.toLowerCase().includes("non-ac") || h.name.toLowerCase().includes("nonac"));
        
        if (nonAcHall) {
            targetHallId = nonAcHall.id;
        } else {
            const newHall = await addHall({ name: "Non AC", is_ac: false });
            if (!newHall) {
                toast.error("Failed to create hall");
                return;
            }
            targetHallId = newHall.id;
        }

        const success = await addTable({
            table_number: "non-ac-1",
            seats: 4,
            hall_id: targetHallId
        });

        if (success) {
            toast.success("Random Table Created: non-ac-1");
            fetchTables();
        }
    };

    const handleSave = async () => {
        if (!isBulkMode && !name.trim()) return toast.error("Table Name is required");
        if (!hallId) return toast.error("Hall is required");

        let targetHallId = hallId;

        // Handle Dynamic Hall Creation (for predefined hall options)
        if (hallId.startsWith('create:')) {
            let newHallName = "";
            let isAc = false;

            const hallMapping: Record<string, { name: string; isAc: boolean }> = {
                'create:AC': { name: "AC", isAc: true },
                'create:Non-AC': { name: "Non AC", isAc: false },
                'create:Outdoor': { name: "Outdoor", isAc: false },
                'create:Family-Room': { name: "Family Room", isAc: true },
                'create:Ground-Floor': { name: "Ground Floor", isAc: false },
                'create:Second-Floor': { name: "Second Floor", isAc: true },
            };

            if (hallId === 'create:Custom') {
                const input = document.getElementById('custom-hall-input') as HTMLInputElement;
                newHallName = input?.value || "";
                if (!newHallName) return toast.error("Please enter a name for the hall");
            } else if (hallMapping[hallId]) {
                newHallName = hallMapping[hallId].name;
                isAc = hallMapping[hallId].isAc;
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
            // Update existing table
            success = await updateTable(editingId, {
                table_number: name,
                seats: parseInt(capacity),
                hall_id: targetHallId
            });
            if (success) toast.success("Table Updated Successfully");
        } else if (isBulkMode) {
            // Bulk create tables
            const start = parseInt(bulkRangeStart);
            const end = parseInt(bulkRangeEnd);

            if (isNaN(start) || isNaN(end) || start > end || start < 1) {
                return toast.error("Invalid range. Enter numbers like 1-10");
            }

            if (end - start > 50) {
                return toast.error("Maximum 50 tables at once");
            }

            // Get the hall name for the prefix
            const selectedHall = halls.find(h => h.id === targetHallId);
            const hallPrefix = selectedHall?.name.toLowerCase().replace(/\s+/g, '-') || 'table';

            const tables = [];
            for (let i = start; i <= end; i++) {
                tables.push({
                    table_number: `${hallPrefix}-${i}`,
                    seats: parseInt(capacity),
                    hall_id: targetHallId
                });
            }

            success = await bulkAddTables(tables);
            if (success) {
                toast.success(`${tables.length} Tables Created Successfully`);
                fetchTables();
            }
        } else {
            // Single table creation
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
                                {/* Bulk Mode Toggle (only for new tables) */}
                                {!editingId && (
                                    <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-indigo-700">Bulk Creation Mode</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkMode(!isBulkMode)}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                                isBulkMode ? "bg-indigo-600" : "bg-slate-300"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                isBulkMode ? "translate-x-6" : "translate-x-1"
                                            )} />
                                        </button>
                                    </div>
                                )}

                                {/* Hall Selection - Now first */}
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
                                            {/* Existing halls first */}
                                            {halls.map(hall => (
                                                <SelectItem key={hall.id} value={hall.id} className="font-bold py-3 uppercase text-[10px] tracking-widest">
                                                    {hall.name}
                                                </SelectItem>
                                            ))}
                                            
                                            {/* Divider if there are existing halls */}
                                            {halls.length > 0 && (
                                                <div className="border-t border-slate-200 my-2"></div>
                                            )}
                                            
                                            {/* Predefined hall options */}
                                            <SelectItem value="create:AC" className="font-bold py-3 uppercase text-[10px] tracking-widest text-indigo-600">+ AC</SelectItem>
                                            <SelectItem value="create:Non-AC" className="font-bold py-3 uppercase text-[10px] tracking-widest text-indigo-600">+ Non AC</SelectItem>
                                            <SelectItem value="create:Outdoor" className="font-bold py-3 uppercase text-[10px] tracking-widest text-indigo-600">+ Outdoor</SelectItem>
                                            <SelectItem value="create:Family-Room" className="font-bold py-3 uppercase text-[10px] tracking-widest text-indigo-600">+ Family Room</SelectItem>
                                            <SelectItem value="create:Ground-Floor" className="font-bold py-3 uppercase text-[10px] tracking-widest text-indigo-600">+ Ground Floor</SelectItem>
                                            <SelectItem value="create:Second-Floor" className="font-bold py-3 uppercase text-[10px] tracking-widest text-indigo-600">+ Second Floor</SelectItem>
                                            <SelectItem value="create:Custom" className="font-bold py-3 uppercase text-[10px] tracking-widest text-purple-600">+ Custom...</SelectItem>
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

                                {/* Conditional rendering based on bulk mode */}
                                {isBulkMode ? (
                                    // Bulk Mode: Range Input
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-400 border border-purple-200 shadow-sm">
                                                <Hash className="h-3 w-3" />
                                            </div>
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Table Range (e.g., 1-10)</Label>
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <Input
                                                type="number"
                                                value={bulkRangeStart}
                                                onChange={e => setBulkRangeStart(e.target.value)}
                                                placeholder="Start"
                                                className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-indigo-100 font-bold text-slate-700"
                                            />
                                            <span className="text-slate-400 font-bold">to</span>
                                            <Input
                                                type="number"
                                                value={bulkRangeEnd}
                                                onChange={e => setBulkRangeEnd(e.target.value)}
                                                placeholder="End"
                                                className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-indigo-100 font-bold text-slate-700"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 italic">
                                            Tables will be created as: {halls.find(h => h.id === hallId)?.name.toLowerCase().replace(/\s+/g, '-') || 'table'}-{bulkRangeStart} to {halls.find(h => h.id === hallId)?.name.toLowerCase().replace(/\s+/g, '-') || 'table'}-{bulkRangeEnd}
                                        </p>
                                    </div>
                                ) : (
                                    // Single Mode: Table Name
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
                                )}

                                {/* Capacity (for both modes) */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400 border border-orange-200 shadow-sm">
                                            <UsersIcon className="h-3 w-3" />
                                        </div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                            Pax Capacity {isBulkMode && "(for all tables)"}
                                        </Label>
                                    </div>
                                    <Input
                                        type="number"
                                        value={capacity}
                                        onChange={e => setCapacity(e.target.value)}
                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-indigo-100 font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="mt-8 gap-3 sm:gap-0">
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-slate-900 hover:bg-black h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white shadow-xl shadow-slate-200"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingId ? "Commit Spec" : isBulkMode ? "Execute Bulk Deployment" : "Execute Deployment"}
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
                                    <div className="flex flex-col items-center justify-center gap-5">
                                        <div className="opacity-30">
                                            <Armchair className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                                            <p className="font-black text-slate-600 uppercase tracking-widest text-xs">No Tables Found</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={handleOpenAdd}
                                                className="bg-slate-900 hover:bg-black h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white transition-all shadow-xl shadow-slate-200"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Create Table
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleCreateRandomTable}
                                                className="h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[11px] border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                                            >
                                                <Armchair className="w-4 h-4 mr-2" /> Create Random Table
                                            </Button>
                                        </div>
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
