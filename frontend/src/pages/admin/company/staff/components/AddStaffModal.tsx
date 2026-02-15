import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, User, UserCog } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (staff: {
    name: string;
    role: 'MANAGER' | 'WAITER';
    email?: string;
    phone?: string;
    password?: string;
    address?: string;
    salary?: string;
    shiftDetail?: string;
  }) => void;
  isLoading?: boolean;
}

export function AddStaffModal({ open, onOpenChange, onSave, isLoading = false }: AddStaffModalProps) {
  const [role, setRole] = React.useState<'MANAGER' | 'WAITER'>("WAITER");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [salary, setSalary] = React.useState("");
  const [shiftDetail, setShiftDetail] = React.useState("");

  const handleSubmit = () => {
    // Validation
    if (!name.trim()) return toast.error("Name is required");

    if (role === 'WAITER') {
      // Waiter: name required, contact optional, shared login used for access
      onSave({
        name: name.trim(),
        role: 'WAITER',
        email: undefined, // Email removed for waiters
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        salary: salary.trim() || undefined,
        shiftDetail: shiftDetail.trim() || undefined,
      });
    } else {
      // Manager: email + phone required, password required
      if (!email.trim()) return toast.error("Email is required for managers");
      if (!phone.trim()) return toast.error("Phone is required for managers");
      if (!password.trim() || password.trim().length < 8) {
        return toast.error("Password must be at least 8 characters");
      }

      onSave({
        name: name.trim(),
        role: 'MANAGER',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password: password.trim(),
        address: address.trim() || undefined,
        salary: salary.trim() || undefined,
        shiftDetail: shiftDetail.trim() || undefined,
      });
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setRole("WAITER");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setAddress("");
      setSalary("");
      setShiftDetail("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 border-none rounded-[2rem] shadow-2xl">
        <DialogHeader className="p-8 pb-6 space-y-4">
          <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">Add Personnel</DialogTitle>

          {/* Role Selector Tabs */}
          <div className="flex gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setRole('WAITER')}
              disabled={isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all",
                role === 'WAITER'
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <User className="w-4 h-4" />
              Waiter
            </button>
            <button
              type="button"
              onClick={() => setRole('MANAGER')}
              disabled={isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all",
                role === 'MANAGER'
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <UserCog className="w-4 h-4" />
              Manager
            </button>
          </div>
        </DialogHeader>

        <div className="px-8 pb-6 space-y-4">
          {/* Name - Always Required */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Full Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
            />
          </div>

          {/* Phone - Always Shown */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Phone {role === 'MANAGER' && <span className="text-rose-500">*</span>}
            </Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
            />
          </div>

          {/* Email - Only for Manager */}
          {role === 'MANAGER' && (
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="manager@restaurant.com"
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
              />
            </div>
          )}

          {/* Password - Only for Manager */}
          {role === 'MANAGER' && (
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
              />
            </div>
          )}

          {/* Address - Always Optional */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Address (Optional)
            </Label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Street, City"
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
            />
          </div>

          {/* Salary & Shift - Always Optional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Monthly Salary (Optional)
              </Label>
              <Input
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="e.g. 15000"
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Shift Details (Optional)
              </Label>
              <Input
                value={shiftDetail}
                onChange={e => setShiftDetail(e.target.value)}
                placeholder="9 AM - 6 PM"
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
              />
            </div>
          </div>

          {/* Role Description - Now at bottom before footer */}
          <div className="pt-2">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
              {role === 'WAITER'
                ? "Waiters use shared credentials to login. Contact details are optional."
                : "Managers have individual accounts with unique email/phone/password credentials."}
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] text-slate-400 border-slate-200 hover:bg-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-100 border-none"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {role === 'WAITER' ? 'Waiter' : 'Manager'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
