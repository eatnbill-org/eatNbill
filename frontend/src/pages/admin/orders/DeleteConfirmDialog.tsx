import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAdminOrdersStore } from '@/stores/orders';
import type { Order } from '@/types/order';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function DeleteConfirmDialog({ order, open, onOpenChange }: DeleteConfirmDialogProps) {
    const { deleteOrder, deleting } = useAdminOrdersStore();

    const handleDelete = async () => {
        if (!order) return;

        const success = await deleteOrder(order.id);
        if (success) {
            onOpenChange(false);
        }
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Delete Order</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        Are you sure you want to delete Order #{order.order_number}?
                        <br />
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
