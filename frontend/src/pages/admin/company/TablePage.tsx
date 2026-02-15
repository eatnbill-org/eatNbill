import * as React from "react";
import { useDemoStore, Table as TableType } from "@/store/demo-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, QrCode, Armchair } from "lucide-react";
import { toast } from "sonner";
import { QRCodesSheet } from "./components/QRCodesSheet";

export default function TablePage() {
  const { state, dispatch } = useDemoStore();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [capacity, setCapacity] = React.useState("4");
  const [type, setType] = React.useState<TableType['type']>("AC");

  const handleAddTable = () => {
    if (!name.trim()) return toast.error("Table Name is required");
    dispatch({ type: "ADD_TABLE", payload: { name, capacity: parseInt(capacity), type } });
    setIsAddOpen(false); setName(""); setCapacity("4");
    toast.success("Table added successfully!");
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this table?")) { dispatch({ type: "DELETE_TABLE", id }); toast.success("Table removed"); }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Table Management</h1>
          <p className="text-muted-foreground mt-1">Configure dine-in tables and QR codes.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <QrCode className="w-4 h-4 mr-2" /> Generate QR Codes
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button className="bg-black hover:bg-gray-800"><Plus className="w-4 h-4 mr-2" /> Add Table</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Table</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Table Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. T-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Capacity</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
                  <div className="grid gap-2"><Label>Type</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="AC">AC</SelectItem><SelectItem value="Non-AC">Non-AC</SelectItem><SelectItem value="Outdoor">Outdoor</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleAddTable}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>QR</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Capacity</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {state.tables.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${window.location.origin}/menu?table=${t.id}`} alt="QR" className="w-8 h-8 border rounded" /></TableCell>
                  <TableCell className="font-bold">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                  <TableCell>{t.capacity} Pax</TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
              {state.tables.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10">No tables yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <QRCodesSheet open={isPrintOpen} onOpenChange={setIsPrintOpen} tables={state.tables} storeName={state.customerSettings.storeName} />
    </div>
  );
}