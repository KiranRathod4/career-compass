import { createFileRoute } from "@tanstack/react-router";
import { localDateKey } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/review")({ component: ReviewPage });

function mondayOf(d: Date) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

function ReviewPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ week_start: mondayOf(new Date()), wins: "", blockers: "", lessons: "", next_focus: "", energy_rating: 5, productivity_rating: 5 });

  const { data: rows = [] } = useQuery({
    queryKey: ["weekly_reviews", user!.id],
    queryFn: async () => (await (supabase as any).from("weekly_reviews").select("*").eq("user_id", user!.id).order("week_start", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("weekly_reviews").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weekly_reviews"] }); setShowAdd(false); toast.success("Review saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: async (id: string) => { await (supabase as any).from("weekly_reviews").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly_reviews"] }) });

  const chart = [...rows].reverse().map((r: any) => ({ week: r.week_start.slice(5), energy: r.energy_rating, productivity: r.productivity_rating }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Weekly Review</h1>
          <p className="text-sm text-muted-foreground">End-of-week reflection: wins, blockers, next focus.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />New review
        </button>
      </div>

      {chart.length > 0 && (
        <div className="card-flat p-4">
          <div className="section-label mb-2">Trends</div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis fontSize={11} domain={[0, 10]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="energy" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="productivity" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-2 gap-2">
          <F label="Week start (Monday)"><input type="date" value={draft.week_start} onChange={(e) => setDraft({ ...draft, week_start: e.target.value })} className={inp} /></F>
          <div className="grid grid-cols-2 gap-2">
            <F label={`Energy ${draft.energy_rating}/10`}><input type="range" min={1} max={10} value={draft.energy_rating} onChange={(e) => setDraft({ ...draft, energy_rating: +e.target.value })} className="w-full" /></F>
            <F label={`Productivity ${draft.productivity_rating}/10`}><input type="range" min={1} max={10} value={draft.productivity_rating} onChange={(e) => setDraft({ ...draft, productivity_rating: +e.target.value })} className="w-full" /></F>
          </div>
          <F label="Wins"><textarea value={draft.wins} onChange={(e) => setDraft({ ...draft, wins: e.target.value })} className={`${inp} min-h-[70px]`} placeholder="What went well this week?" /></F>
          <F label="Blockers"><textarea value={draft.blockers} onChange={(e) => setDraft({ ...draft, blockers: e.target.value })} className={`${inp} min-h-[70px]`} placeholder="What got in the way?" /></F>
          <F label="Lessons"><textarea value={draft.lessons} onChange={(e) => setDraft({ ...draft, lessons: e.target.value })} className={`${inp} min-h-[70px]`} placeholder="What did you learn?" /></F>
          <F label="Next week focus"><textarea value={draft.next_focus} onChange={(e) => setDraft({ ...draft, next_focus: e.target.value })} className={`${inp} min-h-[70px]`} placeholder="Top 3 priorities" /></F>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r: any) => (
          <div key={r.id} className="card-flat p-4 group">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">Week of {r.week_start}</div>
                <div className="text-[11px] text-muted-foreground">Energy {r.energy_rating}/10 · Productivity {r.productivity_rating}/10</div>
              </div>
              <button onClick={() => del.mutate(r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
              {r.wins && <Block label="Wins" v={r.wins} color="border-success/40" />}
              {r.blockers && <Block label="Blockers" v={r.blockers} color="border-destructive/40" />}
              {r.lessons && <Block label="Lessons" v={r.lessons} color="border-info/40" />}
              {r.next_focus && <Block label="Next focus" v={r.next_focus} color="border-primary/40" />}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="card-flat p-10 text-center text-sm text-muted-foreground">No reviews yet. Reflect on your first week.</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
function Block({ label, v, color }: { label: string; v: string; color: string }) {
  return <div className={`border-l-2 ${color} pl-2`}><div className="section-label">{label}</div><div className="mt-1 whitespace-pre-wrap text-foreground/85">{v}</div></div>;
}
