import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, UserCog, Key } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Import API functions
import * as staffApi from "@/api/staff";
import type { Staff, StaffDetails } from "@/api/staff";
import { ListSkeleton } from "@/components/ui/skeleton";

// Import Modular Components
import { StaffTable } from "./components/StaffTable";
import { AddStaffModal } from "./components/AddStaffModal";
import { EditStaffModal } from "./components/EditStaffModal";
import { StaffDetailModal } from "./components/StaffDetailModal";
import { WaiterCredentialsModal } from "./components/WaiterCredentialsModal";

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [staffToEdit, setStaffToEdit] = React.useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [credentialsOpen, setCredentialsOpen] = React.useState(false);

  // Fetch staff list
  const { data: staffList = [], isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.listStaff,
  });

  // Fetch staff details when selected
  const { data: selectedStaff } = useQuery({
    queryKey: ['staff', selectedStaffId],
    queryFn: () => selectedStaffId ? staffApi.getStaffDetails(selectedStaffId) : null,
    enabled: !!selectedStaffId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: staffApi.createStaff,
    onSuccess: (newStaff) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`${newStaff.name} added!`);
      setIsAddOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add staff');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, staff }: { id: string; staff: any }) => staffApi.updateStaff(id, staff),
    onSuccess: (updatedStaff) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`${updatedStaff.name} updated!`);
      setIsEditOpen(false);
      setStaffToEdit(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update staff');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: staffApi.toggleStaffStatus,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(result.message);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to toggle status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: staffApi.deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success("Staff removed");
      if (selectedStaffId) setSelectedStaffId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete staff');
    },
  });

  // Search Logic
  const filteredStaff = React.useMemo(() => {
    if (!searchQuery) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter((s: Staff) =>
      s.name?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [staffList, searchQuery]);

  // Handlers
  const handleSaveStaff = (newStaff: {
    name: string;
    role: 'MANAGER' | 'WAITER';
    email?: string;
    phone?: string;
    password?: string;
    address?: string;
    salary?: string;
    shiftDetail?: string;
  }) => {
    createMutation.mutate(newStaff);
  };

  const handleUpdateStaff = (id: string, updatedStaff: any) => {
    updateMutation.mutate({ id, staff: updatedStaff });
  };

  const handleEdit = (staff: Staff) => {
    setStaffToEdit(staff);
    setIsEditOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove ${name} from staff?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string) => {
    toggleMutation.mutate(id);
  };

  const handleRowClick = (staff: Staff) => {
    setSelectedStaffId(staff.id);
  };

  const activeStaffCount = staffList.filter(s => s.isActive).length;

  return (
    <div className="min-h-full bg-slate-50/50">
      <div className="container py-6 sm:py-10 space-y-6 sm:space-y-8 no-scrollbar max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">

        {/* Main Title Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
                <UserCog className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Staff Management</h1>
            </div>
            <p className="text-sm font-medium text-muted-foreground max-w-lg leading-relaxed px-1">
              Manage your restaurant staff, access roles, and contact information.
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex w-full sm:w-auto items-center gap-3 sm:gap-4 bg-white px-4 sm:px-5 py-3 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-1">Active Staff</span>
              <span className="text-sm font-bold text-foreground">
                {activeStaffCount} / {staffList.length} Members
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Live System</span>
            </div>
          </motion.div>
        </motion.div>



        {/* Search & Actions Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl shadow-slate-200/50"
        >
          <div className="relative flex-1 w-full md:max-w-[460px] group transition-all">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff members..."
              className="pl-11 h-12 bg-background border-border rounded-xl focus-visible:ring-primary focus-visible:ring-offset-0 shadow-sm transition-all"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={() => setCredentialsOpen(true)}
              variant="outline"
              className="h-12 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-semibold text-sm shadow-sm transition-all shrink-0 flex-1 md:flex-none"
            >
              <Key className="mr-2 h-4 w-4" /> Edit Credentials
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-md transition-all shrink-0 flex-1 md:flex-none"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Staff
            </Button>
          </div>
        </motion.div>

        {/* Staff Table Container */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden"
        >
          {isLoading ? (
            <div className="p-6">
              <ListSkeleton rows={7} />
            </div>
          ) : (
            <StaffTable
              staff={filteredStaff}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onRowClick={handleRowClick}
            />
          )}
        </motion.div>

      </div>

      {/* Modals */}
      <AddStaffModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSave={handleSaveStaff}
        isLoading={createMutation.isPending}
      />

      <EditStaffModal
        staff={staffToEdit}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={handleUpdateStaff}
        isLoading={updateMutation.isPending}
      />

      <StaffDetailModal
        staff={selectedStaff || null}
        onClose={() => setSelectedStaffId(null)}
      />

      <WaiterCredentialsModal
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
      />

    </div>
  );
}
