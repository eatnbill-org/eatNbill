import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStaffStore } from "@/stores/staff";
import { Users, Shield, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ActiveStaffCard() {
    const { staff, fetchStaff } = useStaffStore();

    React.useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const activeStaff = React.useMemo(() => {
        return staff.filter(u => u.isActive);
    }, [staff]);

    return (
        <Card className="rounded-2xl border border-border shadow-elev-1 bg-card text-card-foreground overflow-hidden flex flex-col h-[280px]">
            <CardHeader className="py-2.5 px-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Users className="w-3 h-3 text-indigo-500" />
                        Staff Pool
                    </CardTitle>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-600 border-indigo-100 px-1.5 py-0">
                        {activeStaff.length} ON SHIFT
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto no-scrollbar">
                <div className="divide-y divide-border/50">
                    {activeStaff.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground/50">
                            <p className="text-[10px] font-bold uppercase tracking-widest italic opacity-50">No active sessions</p>
                        </div>
                    ) : (
                        activeStaff.map((staff) => (
                            <div key={staff.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8 rounded-xl border border-border/50">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${staff.email || staff.name}`} />
                                        <AvatarFallback className="bg-muted text-[9px] font-black uppercase">{(staff.email || staff.name || 'S')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-foreground tracking-tight line-clamp-1 italic uppercase leading-none mb-0.5">
                                            {(staff.email || staff.name || 'Staff').split('@')[0]}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Shield className="w-2 h-2 text-muted-foreground" />
                                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                                                {staff.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0 rounded-full border border-emerald-500/20">
                                        <Zap className="w-2 h-2 text-emerald-500" />
                                        <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
                                    </div>
                                    <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                        {new Date(staff.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
