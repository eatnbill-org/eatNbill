import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Star, Trash2, PlusCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FeedbackItem {
  id: string;
  order_id: string | null;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  categories: string[];
  source: string;
  created_at: string;
}

async function fetchFeedback(params: { rating?: number; from_date?: string; to_date?: string }) {
  const qs = new URLSearchParams();
  if (params.rating) qs.set("rating", String(params.rating));
  if (params.from_date) qs.set("from_date", params.from_date);
  if (params.to_date) qs.set("to_date", params.to_date);
  const { data } = await apiClient.get<{ data: FeedbackItem[] }>(`/restaurant/feedback?${qs.toString()}`);
  return (data as any)?.data as FeedbackItem[] ?? [];
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200")}
        />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="hover:scale-110 transition-transform"
        >
          <Star className={cn("h-7 w-7", i <= value ? "text-amber-400 fill-amber-400" : "text-slate-300")} />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = React.useState<number | undefined>();
  const [addOpen, setAddOpen] = React.useState(false);
  const [newRating, setNewRating] = React.useState(5);
  const [newName, setNewName] = React.useState('');
  const [newComment, setNewComment] = React.useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedback", ratingFilter],
    queryFn: () => fetchFeedback({ rating: ratingFilter }),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.post("/restaurant/feedback", {
        customer_name: newName || undefined,
        rating: newRating,
        comment: newComment || undefined,
        source: 'MANUAL',
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Feedback recorded");
      void queryClient.invalidateQueries({ queryKey: ["feedback"] });
      setAddOpen(false);
      setNewName('');
      setNewComment('');
      setNewRating(5);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.delete(`/restaurant/feedback/${id}`);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Feedback deleted");
      void queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const avgRating = items.length > 0 ? (items.reduce((s, i) => s + i.rating, 0) / items.length).toFixed(1) : '-';
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({ r, count: items.filter((i) => i.rating === r).length }));

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            Customer Feedback
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Reviews and ratings from your customers</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setAddOpen(true)}>
          <PlusCircle className="h-4 w-4" /> Add Feedback
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col items-center justify-center gap-1">
          <div className="text-3xl font-black text-amber-500">{avgRating}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg. Rating</div>
          {items.length > 0 && <StarDisplay rating={Math.round(Number(avgRating))} />}
        </div>
        {ratingCounts.map(({ r, count }) => (
          <button
            key={r}
            onClick={() => setRatingFilter(ratingFilter === r ? undefined : r)}
            className={cn(
              "rounded-2xl border p-4 flex flex-col items-center gap-1 transition-all",
              ratingFilter === r ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-200"
            )}
          >
            <div className="text-xl font-black text-slate-800">{count}</div>
            <StarDisplay rating={r} />
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No feedback yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 group">
                <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
                  <StarDisplay rating={item.rating} />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{item.source}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{item.customer_name || 'Anonymous'}</span>
                    <span className="text-[10px] text-slate-400">{format(new Date(item.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                  {item.comment && <p className="text-sm text-slate-600 mt-0.5">{item.comment}</p>}
                  {item.categories.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.categories.map((c) => (
                        <span key={c} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 space-y-4">
          <DialogTitle className="text-base font-black uppercase tracking-tight">Record Feedback</DialogTitle>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rating</Label>
            <StarInput value={newRating} onChange={setNewRating} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Name (optional)</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Guest name" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Comment (optional)</Label>
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="What did they say?" className="rounded-xl" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Saving...' : 'Save Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
