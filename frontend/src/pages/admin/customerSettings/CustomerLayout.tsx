import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { useSearchParams } from "react-router-dom"; // ✅ Import
import { Toaster } from "sonner";
import { CustomerCart } from "./components/CustomerCart";
import { ShoppingBag, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useDemoStore();
  const settings = state.customerSettings;
  const cartCount = state.cart.reduce((a, b) => a + b.qty, 0);
  
  // ✅ AUTO DETECT TABLE ID FROM URL
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');

  React.useEffect(() => {
    if (tableId) {
        dispatch({ type: "SET_CURRENT_TABLE", tableId });
    }
  }, [tableId, dispatch]);

  const currentTableObj = state.tables?.find(t => t.id === state.currentTable);

  if (!settings.enablePreOrder) return <div className="min-h-screen flex items-center justify-center">Store Closed</div>;

  return (
    <div className="relative min-h-screen">
      {currentTableObj && (
        <div className="bg-black text-white text-xs py-1.5 text-center font-medium sticky top-0 z-50 flex items-center justify-center gap-2">
            <MapPin className="w-3 h-3 text-green-400" />
            Ordering for: <span className="text-green-400 font-bold uppercase">{currentTableObj.name}</span>
        </div>
      )}
      {children}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-black text-white">
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && <Badge className="absolute -top-2 -right-2 bg-red-600">{cartCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0"><CustomerCart /></SheetContent>
        </Sheet>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}