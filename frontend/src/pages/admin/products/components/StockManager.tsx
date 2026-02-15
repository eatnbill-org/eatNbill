import * as React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";

interface StockManagerProps {
  products: { id: number; name: string; outOfStock?: boolean }[];
  onToggle: (id: number) => void;
}

export function StockManager({ products, onToggle }: StockManagerProps) {
  const [q, setQ] = React.useState("");

  const list = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(p => p.name.toLowerCase().includes(needle));
  }, [products, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search to update stock..." className="pl-9" />
      </div>

      <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
        {list.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
            <div className="min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">ID: {p.id}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={p.outOfStock ? "destructive" : "success"}>
                {p.outOfStock ? "OUT" : "IN STOCK"}
              </Badge>
              <Switch checked={!p.outOfStock} onCheckedChange={() => onToggle(p.id)} />
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No products found.</p>}
      </div>
    </div>
  );
}