import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { useCreateCustomer } from "@/hooks/use-customers";

export default function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const createMutation = useCreateCustomer();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    const phoneRegex = /^[+]?[\d\s()-]{10,}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error("Please enter a valid phone number");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
      });

      toast.success(`Customer ${name} added successfully!`);
      setName("");
      setPhone("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add customer");
    }
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Add New Customer
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter customer details to add them to your database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter customer name"
                autoComplete="off"
                disabled={createMutation.isPending}
                className="h-8 text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="phone" className="text-xs">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91-9876543210"
                autoComplete="off"
                disabled={createMutation.isPending}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Format: +91-XXXXXXXXXX or 10-digit number</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={createMutation.isPending} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={createMutation.isPending} className="h-8 text-xs">
              {createMutation.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}