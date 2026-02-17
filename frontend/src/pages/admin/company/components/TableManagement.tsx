/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
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
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

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

            const tablesToAdd = [];
            for (let i = start; i <= end; i++) {
                tablesToAdd.push({
                    table_number: `${hallPrefix}-${i}`,
                    seats: parseInt(capacity),
                    hall_id: targetHallId
                });
            }

            const result = await bulkAddTables(tablesToAdd);
            if (!result) {
                return;
            }

            success = result.created_count > 0;

            if (result.failed_count === 0) {
                toast.success(`${result.created_count} Tables Created Successfully`);
            } else if (result.created_count > 0) {
                toast.warning(
                    `${result.created_count} created, ${result.failed_count} skipped (usually duplicate table numbers)`
                );
            } else {
                toast.error(
                    `No tables created. ${result.failed_count} skipped (duplicate table numbers).`
                );
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
        setTablesToPrint(
            tables.map((t) => ({
                id: t.id,
                name: t.table_number,
                tableNumber: t.table_number,
                hallName: t.hall?.name || "Unassigned",
            }))
        );
        setIsPrintOpen(true);
    };

    const handlePrintSingle = (t: RestaurantTable) => {
        setTablesToPrint([{
            id: t.id,
            name: t.table_number,
            tableNumber: t.table_number,
            hallName: t.hall?.name || "Unassigned",
        }]);
        setIsPrintOpen(true);
    };

    const getHallBadgeStyle = (hallName: string) => {
        if (hallName.toLowerCase().includes('ac')) return 'bg-primary/10 text-primary border-primary/20';
        if (hallName.toLowerCase().includes('outdoor')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        return 'bg-muted text-muted-foreground border-border';
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
                        <Armchair className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Tables</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-medium text-muted-foreground">Total: {tables.length} tables</span>
                            {loading && <Skeleton className="h-3 w-3" rounded="full" />}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handlePrintAll}
                        disabled={tables.length === 0}
                        className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[11px] border-border hover:bg-muted transition-all shadow-sm"
                    >
                        <QrCode className="w-4 h-4 mr-2 text-primary" /> Batch Print QRs
                    </Button>

                    <Button
                        className="bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white transition-all shadow-md"
                        onClick={handleOpenAdd}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Table
                    </Button>

                    {/* Dialog for Add/Edit */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogContent className="max-w-md rounded-2xl p-8 border border-border shadow-2xl">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                                    {editingId ? "Edit Table" : "Add New Table"}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                                {/* Bulk Mode Toggle (only for new tables) */}
                                {!editingId && (
                                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
                                        <Label className="text-xs font-bold uppercase tracking-wide text-primary">Bulk Creation Mode</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkMode(!isBulkMode)}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                                isBulkMode ? "bg-primary" : "bg-muted-foreground/30"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                isBulkMode ? "translate-x-6" : "translate-x-1"
                                            )} />
                                        </button>
                                    </div>
                                )}

                                {/* Hall Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                            <MapPin className="h-3 w-3" />
                                        </div>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hall / Area</Label>
                                    </div>
                                    <Select value={hallId} onValueChange={setHallId}>
                                        <SelectTrigger className="h-12 bg-muted/20 border-border rounded-xl focus:ring-primary font-bold text-foreground">
                                            <SelectValue placeholder="Select Hall" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl shadow-2xl border-border">
                                            {halls.map(hall => (
                                                <SelectItem key={hall.id} value={hall.id} className="font-bold py-3 uppercase text-[10px] tracking-widest">
                                                    {hall.name}
                                                </SelectItem>
                                            ))}

                                            {halls.length > 0 && (
                                                <div className="border-t border-border my-2"></div>
                                            )}

                                            <SelectItem value="create:AC" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ AC</SelectItem>
                                            <SelectItem value="create:Non-AC" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ Non AC</SelectItem>
                                            <SelectItem value="create:Outdoor" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ Outdoor</SelectItem>
                                            <SelectItem value="create:Family-Room" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ Family Room</SelectItem>
                                            <SelectItem value="create:Ground-Floor" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ Ground Floor</SelectItem>
                                            <SelectItem value="create:Second-Floor" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ Second Floor</SelectItem>
                                            <SelectItem value="create:Custom" className="font-bold py-3 uppercase text-[10px] tracking-widest text-primary">+ Custom...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {hallId === 'create:Custom' && (
                                        <Input
                                            placeholder="Enter Hall Name"
                                            className="mt-2 h-12 bg-muted/20 border-border rounded-xl focus-visible:ring-primary font-bold text-foreground"
                                            id="custom-hall-input"
                                        />
                                    )}
                                </div>

                                {isBulkMode ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                                <Hash className="h-3 w-3" />
                                            </div>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Table Range (e.g., 1-10)</Label>
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <Input
                                                type="number"
                                                value={bulkRangeStart}
                                                onChange={e => setBulkRangeStart(e.target.value)}
                                                placeholder="Start"
                                                className="h-12 bg-muted/20 border-border rounded-xl focus-visible:ring-primary font-bold text-foreground"
                                            />
                                            <span className="text-muted-foreground font-bold">to</span>
                                            <Input
                                                type="number"
                                                value={bulkRangeEnd}
                                                onChange={e => setBulkRangeEnd(e.target.value)}
                                                placeholder="End"
                                                className="h-12 bg-muted/20 border-border rounded-xl focus-visible:ring-primary font-bold text-foreground"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                                <Hash className="h-3 w-3" />
                                            </div>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Table Number</Label>
                                        </div>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="T-101"
                                            className="h-12 bg-muted/20 border-border rounded-xl focus-visible:ring-primary font-bold text-foreground"
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                            <UsersIcon className="h-3 w-3" />
                                        </div>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Table Capacity {isBulkMode && "(for all tables)"}
                                        </Label>
                                    </div>
                                    <Input
                                        type="number"
                                        value={capacity}
                                        onChange={e => setCapacity(e.target.value)}
                                        className="h-12 bg-muted/20 border-border rounded-xl focus-visible:ring-primary font-bold text-foreground"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="mt-8 gap-3 sm:gap-0">
                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white shadow-md transition-all"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingId ? "Save Changes" : isBulkMode ? "Add Tables" : "Save Table"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsAddOpen(false)}
                                    className="w-full sm:w-auto h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] text-muted-foreground"
                                >
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="overflow-hidden border border-border rounded-2xl bg-muted/20">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                            <TableHead className="py-6 pl-8 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">QR Code</TableHead>
                            <TableHead className="py-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Table Number</TableHead>
                            <TableHead className="py-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hall / Area</TableHead>
                            <TableHead className="py-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Capacity</TableHead>
                            <TableHead className="py-6 pr-8 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white">
                        {tables.map(t => (
                            <TableRow key={t.id} className="group hover:bg-muted/30 transition-all border-b border-border last:border-none">
                                <TableCell className="py-5 pl-8">
                                    <div className="relative w-14 h-14 border-2 border-border rounded-2xl bg-muted/20 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                        {t.qr_code?.qr_png_url ? (
                                            <img src={t.qr_code.qr_png_url} className="w-full h-full object-cover" alt="QR" />
                                        ) : (
                                            <QrCode className="w-6 h-6 text-muted-foreground/30" />
                                        )}
                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-lg font-bold text-foreground tracking-tight uppercase">{t.table_number}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("px-3 py-1 rounded-lg font-bold uppercase tracking-widest text-[9px]", getHallBadgeStyle(t.hall?.name || ""))}>
                                        {t.hall?.name || "Unassigned"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <UsersIcon className="w-4 h-4 text-muted-foreground/50" />
                                        <span className="font-bold text-muted-foreground text-sm tracking-tight">{t.seats} <span className="text-[10px] opacity-70 uppercase font-bold ml-0.5">Pax</span></span>
                                    </div>
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Print QR"
                                            onClick={() => handlePrintSingle(t)}
                                            className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Edit"
                                            onClick={() => handleOpenEdit(t)}
                                            className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Delete"
                                            onClick={() => handleDelete(t.id)}
                                            className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
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
                                            <Armchair className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">No Tables Found</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={handleOpenAdd}
                                                className="bg-primary hover:bg-primary/90 h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[11px] text-white transition-all shadow-md"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add Table
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleCreateRandomTable}
                                                className="h-11 px-5 rounded-xl font-bold uppercase tracking-widest text-[11px] border-border hover:bg-muted transition-all shadow-sm"
                                            >
                                                <Armchair className="w-4 h-4 mr-2" /> Auto Create
                                            </Button>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {loading && tables.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20">
                                    <TableSkeleton rows={4} />
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
                onDeleted={() => {
                    fetchTables();
                }}
            />
        </div>
    );
}
