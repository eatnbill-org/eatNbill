import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Staff } from "@/api/staff";

interface EditStaffModalProps {
    staff: Staff | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, staff: {
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

export function EditStaffModal({ staff, open, onOpenChange, onSave, isLoading = false }: EditStaffModalProps) {
    const [name, setName] = React.useState("");
    const [role, setRole] = React.useState<'MANAGER' | 'WAITER'>("WAITER");
    const [email, setEmail] = React.useState("");
    const [phone, setPhone] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [address, setAddress] = React.useState("");
    const [salary, setSalary] = React.useState("");
    const [shiftDetail, setShiftDetail] = React.useState("");

    // Update form when staff prop changes
    React.useEffect(() => {
        if (staff && open) {
            setName(staff.name || "");
            setRole(staff.role || "WAITER");
            setEmail(staff.email || "");
            setPhone(staff.phone || "");
            setPassword("");
            setAddress(staff.address || "");
            setSalary(staff.salary || "");
            setShiftDetail(staff.shiftDetail || "");
        }
    }, [staff, open]);

    const handleSubmit = () => {
        if (!staff) return;
        if (!name.trim()) return toast.error("Name is required");
        if (role === 'MANAGER') {
            if (!email.trim()) return toast.error("Email is required for managers");
            if (!phone.trim()) return toast.error("Phone is required for managers");
        }
        if (password.trim() && password.trim().length < 8) return toast.error("Password must be at least 8 characters");

        onSave(staff.id, {
            name: name.trim(),
            role,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            password: role === 'MANAGER' ? (password.trim() || undefined) : undefined,
            address: address.trim() || undefined,
            salary: salary.trim() || undefined,
            shiftDetail: shiftDetail.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Staff</DialogTitle>
                    <DialogDescription>
                        Update details for {staff?.name || 'this staff member'}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Verma" disabled={isLoading} />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Role <span className="text-red-500">*</span></Label>
                        <select
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'MANAGER' | 'WAITER')}
                            disabled={isLoading}
                        >
                            <option value="WAITER">Waiter</option>
                            <option value="MANAGER">Manager</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Email {role === 'MANAGER' && <span className="text-red-500">*</span>}
                        </Label>
                        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@restaurant.com" disabled={isLoading} />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Phone {role === 'MANAGER' && <span className="text-red-500">*</span>}
                        </Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" disabled={isLoading} />
                    </div>

                    {role === 'MANAGER' && (
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">New Password</Label>
                            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" disabled={isLoading} />
                        </div>
                    )}

                    {role === 'WAITER' && (
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Address</Label>
                            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Street, City" disabled={isLoading} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Monthly Salary</Label>
                            <Input value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. 15000" disabled={isLoading} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Shift Details</Label>
                            <Input value={shiftDetail} onChange={e => setShiftDetail(e.target.value)} placeholder="e.g. 9 AM - 6 PM" disabled={isLoading} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-black text-white hover:bg-gray-800" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
