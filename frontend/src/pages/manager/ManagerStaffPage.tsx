import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Key } from "lucide-react";
import { WaiterCredentialsModal } from "@/pages/admin/company/staff/components/WaiterCredentialsModal";

type Staff = {
  id: string;
  name?: string;
  role: "MANAGER" | "WAITER";
  email?: string;
  phone?: string;
  isActive: boolean;
};

export default function ManagerStaffPage() {
  const [loading, setLoading] = React.useState(true);
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [credentialsOpen, setCredentialsOpen] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await apiClient.get<Staff[]>("/restaurant/staff");
      if (!res.error) {
        setStaff(res.data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const activeStaffCount = staff.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Staff Directory</h1>
            <p className="text-xs text-slate-500">View staff roster and manage waiter credentials</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Staff</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{staff.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Active</p>
          <p className="text-3xl font-black text-emerald-700 mt-2">{activeStaffCount}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={() => setCredentialsOpen(true)}
          variant="outline"
          className="h-11 px-6 rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50 font-bold uppercase tracking-widest text-[10px] shadow-sm"
        >
          <Key className="mr-2 h-4 w-4" /> Edit Credentials
        </Button>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            <p className="text-xs text-slate-400 font-bold uppercase">Loading...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No staff found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {staff.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                    {s.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{s.name || "Unnamed"}</p>
                    <p className="text-xs text-slate-500">
                      {s.role} • {s.phone || "—"} {s.email ? `• ${s.email}` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${s.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                  }`}>
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiter Credentials Modal */}
      <WaiterCredentialsModal
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
      />
    </div>
  );
}
