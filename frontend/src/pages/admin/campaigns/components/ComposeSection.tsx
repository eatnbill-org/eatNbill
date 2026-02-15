import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Camera, Send, Clock, Calendar as CalendarIcon, X, Sparkles, Smile, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Product } from "@/types/demo";

const EMOJIS = ["😊", "😂", "👍", "🔥", "⭐", "❤️", "🍗", "🎉"] as const;

interface ComposeSectionProps {
    campaignName: string; setCampaignName: (v: string) => void;
    message: string; setMessage: (v: string) => void;
    imageUrl?: string; setImageUrl: (v?: string) => void;
    products: Product[]; selectedProductIds: number[]; toggleProduct: (id: number) => void; selectedProductsText?: string;
    onSendNow: () => void;
    scheduleDate: Date | undefined; setScheduleDate: (d: Date | undefined) => void;
    scheduleTime: string; setScheduleTime: (t: string) => void;
    onCommitSchedule: () => void;
}

export function ComposeSection({
    campaignName, setCampaignName,
    message, setMessage,
    imageUrl, setImageUrl,
    products, selectedProductIds, toggleProduct, selectedProductsText,
    onSendNow,
    scheduleDate, setScheduleDate, scheduleTime, setScheduleTime, onCommitSchedule
}: ComposeSectionProps) {

    const messageRef = React.useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [scheduleOpen, setScheduleOpen] = React.useState(false);
    const messageCount = message.length;

    const onPickEmoji = (emoji: string) => setMessage(`${message}${emoji}`);

    const onImageFile = (file: File | null) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
        if (!/image\/(png|jpe?g|webp)/.test(file.type)) return toast.error("Only JPG, PNG, or WebP");
        const reader = new FileReader();
        reader.onload = () => {
            setImageUrl(typeof reader.result === "string" ? reader.result : undefined);
            toast.success("Image uploaded!");
        };
        reader.readAsDataURL(file);
    };

    return (
        <>
            <Card className="rounded-[2.5rem] shadow-sm border-none bg-white overflow-hidden h-fit">
                <CardHeader className="p-6 border-b border-slate-50">
                    <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-indigo-500 font-black">1.</span> Composition Matrix
                        <MessageCircle className="h-4 w-4 text-slate-400 ml-auto" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Campaign Identifier</Label>
                        <Input
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value.slice(0, 100))}
                            placeholder="e.g. RAMADAN_FEST_2025"
                            className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium placeholder:text-slate-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message Payload</Label>
                            <span className={cn("text-[10px] font-bold tabular-nums", messageCount > 450 ? "text-orange-500" : "text-slate-300")}>
                                {messageCount}/500
                            </span>
                        </div>
                        <div className="relative group">
                            <Textarea
                                ref={messageRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                className="min-h-[120px] rounded-[2rem] border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium p-5 resize-none placeholder:text-slate-300 leading-relaxed"
                                placeholder="Construct your broadcast message..."
                            />
                            <div className="absolute right-4 bottom-4 flex gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                {EMOJIS.slice(0, 4).map((e) => (
                                    <button key={e} type="button" onClick={() => onPickEmoji(e)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors text-lg leading-none">
                                        {e}
                                    </button>
                                ))}
                                <button className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-400">
                                    <Smile className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Visual Content</Label>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImageFile(e.target.files?.[0] ?? null)} />
                        {!imageUrl ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 justify-start rounded-2xl border-dashed border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all font-bold text-xs uppercase tracking-widest"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="mr-2 h-4 w-4 text-indigo-500" /> Attach Asset
                            </Button>
                        ) : (
                            <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-2 pr-4 flex gap-3 items-center">
                                <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-sm border border-white">
                                    <img src={imageUrl} alt="Uploaded" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Asset Locked</div>
                                    <div className="text-xs font-semibold text-slate-500 truncate">Image attachment active</div>
                                </div>
                                <button
                                    onClick={() => setImageUrl(undefined)}
                                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Linked Protocol</Label>
                        <Select onValueChange={(val) => toggleProduct(Number(val))}>
                            <SelectTrigger className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium overflow-hidden">
                                <SelectValue placeholder="Anchor Product..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] rounded-[2rem] border-slate-100">
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)} className="rounded-xl mx-1 my-1">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedProductIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-1">
                                {selectedProductIds.map(id => {
                                    const prod = products.find(p => p.id === id);
                                    if (!prod) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="h-7 rounded-lg bg-indigo-50 text-indigo-700 border-indigo-100 gap-1.5 px-2.5 font-bold text-[10px] uppercase tracking-wider">
                                            {prod.name}
                                            <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => toggleProduct(id)} />
                                        </Badge>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                            type="button"
                            onClick={onSendNow}
                            className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                        >
                            <Send className="mr-2 h-3.5 w-3.5" /> Deploy
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setScheduleOpen(true)}
                            className="h-12 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[11px] uppercase tracking-[0.15em] transition-all"
                        >
                            <Clock className="mr-2 h-3.5 w-3.5 text-indigo-500" /> Schedule
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Schedule Dialog */}
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-[3rem] p-8 border-none shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <CalendarRange className="w-5 h-5" />
                            </div>
                            <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Schedule Execution</DialogTitle>
                        </div>
                        <DialogDescription className="text-sm font-medium text-slate-500">
                            Configure a delayed dispatch sequence for this campaign message.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Effective Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full h-12 rounded-2xl justify-start text-left font-bold text-xs uppercase tracking-widest border-slate-100 bg-slate-50/50", !scheduleDate && "text-slate-300")}>
                                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                                        {scheduleDate ? format(scheduleDate, "PPP") : "Select Deployment Date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-3xl border-slate-100 shadow-xl overflow-hidden" align="start">
                                    <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Time (24h)</Label>
                            <Input
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                placeholder="e.g. 18:00"
                                className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold text-slate-600"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" className="h-12 rounded-2xl font-bold uppercase tracking-widest text-[11px]" onClick={() => setScheduleOpen(false)}>Abort</Button>
                        <Button
                            className="h-12 rounded-2xl font-bold uppercase tracking-widest text-[11px] bg-slate-900 text-white shadow-xl shadow-slate-200"
                            onClick={() => { onCommitSchedule(); setScheduleOpen(false); }}
                        >
                            Lock Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
