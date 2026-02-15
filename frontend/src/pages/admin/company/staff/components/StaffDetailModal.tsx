import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Calendar, Mail, MapPin } from "lucide-react";
import type { StaffDetails } from "@/api/staff";

interface StaffDetailModalProps {
    staff: StaffDetails | null;
    onClose: () => void;
}

export function StaffDetailModal({ staff, onClose }: StaffDetailModalProps) {

    if (!staff) return null;

    return (
        <Dialog open={Boolean(staff)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400" />
                        {staff.name || 'Unnamed'}
                    </DialogTitle>
                    <div className="mt-1">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Restaurant Staff
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* INFO GRID */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Phone */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                Role
                            </p>
                            <p className="font-medium text-sm">{staff.role}</p>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <Mail size={10} /> Email
                            </p>
                            <p className="font-medium text-sm">{staff.email || '—'}</p>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <Phone size={10} /> Phone
                            </p>
                            <p className="font-medium text-sm">{staff.phone || '—'}</p>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <MapPin size={10} /> Address
                            </p>
                            <p className="font-medium text-sm">{staff.address || '—'}</p>
                        </div>

                        {/* Shift */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <Calendar size={10} /> Shift
                            </p>
                            <p className="font-medium text-sm">{staff.shiftDetail || '—'}</p>
                        </div>

                        {/* Salary */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                ₹ Salary
                            </p>
                            <p className="font-medium text-sm">{staff.salary || '—'}</p>
                        </div>

                        {/* Joined */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <Calendar size={10} /> Joined
                            </p>
                            <p className="font-medium text-sm">
                                {new Date(staff.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button variant="outline" size="sm" onClick={onClose} className="rounded-full px-6">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
