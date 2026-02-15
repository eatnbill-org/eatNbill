import * as React from "react";
import { useCustomers, useDeleteCustomer } from "@/hooks/use-customers";
import AddCustomerDialog from "./components/AddCustomerDialog";
import CustomerTable from "./components/CustomerTable";
import CustomerProfileModal from "./components/CustomerProfileModal";
import type { Customer } from "@/types/customer";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Users, Trash2, AlertCircle } from "lucide-react";

export default function AdminCustomersPage() {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useCustomers({ search: query, page, limit: 50 });
  const deleteMutation = useDeleteCustomer();

  const [selected, setSelected] = React.useState<Customer | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Customer | null>(null);

  const handleDeleteCustomer = (customer: Customer) => {
    setDeleteConfirm(customer);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteMutation.mutateAsync(deleteConfirm.id);
        toast.success(`Customer ${deleteConfirm.name} deleted!`);
        setDeleteConfirm(null);
        setSelected(null); // Close profile modal if open
      } catch (error) {
        toast.error("Failed to delete customer");
      }
    }
  };

  return (
    <>

      <div className="min-h-full bg-slate-50/50">
        <div className="container py-10 space-y-8 no-scrollbar max-w-7xl mx-auto">
          {/* Main Title Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="h-10 w-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                  <Users className="w-5 h-5" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Customer Directory</h1>
              </div>
              <p className="text-sm font-medium text-slate-400 max-w-lg leading-relaxed px-1">
                Monitor customer interactions, manage store credits, and analyze spending patterns to drive loyalty and growth.
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {data?.data?.length || 0} Strategic Entities
              </span>
            </motion.div>
          </motion.div>

          {/* Table Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CustomerTable
              customers={data?.data || []}
              onCustomerSelect={setSelected}
              onDeleteCustomer={handleDeleteCustomer}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onSearch={setQuery}
              isLoading={isLoading}
            />
          </motion.div>
        </div>
      </div>

      <CustomerProfileModal
        customer={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDeleteCustomer}
      />

      <AddCustomerDialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen} />

      {/* Modern High-End Alert Dialog */}
      <AlertDialog open={Boolean(deleteConfirm)} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">Permanent Termination</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-slate-400 mt-1">
                  You are about to remove <span className="font-bold text-slate-600">"{deleteConfirm?.name}"</span>. This action is irreversible and will purge all profile data.
                </AlertDialogDescription>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Consequence Warning</p>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                All historical order tracking and store credit balances for this account will be permanently discarded.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="p-6 bg-slate-50 flex-col sm:flex-row gap-3">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="mt-0 flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] text-slate-400 border-slate-200 hover:bg-white"
            >
              Retain Record
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-100 border-none"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Executing..." : "Confirm Termination"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}