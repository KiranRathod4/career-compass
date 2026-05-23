import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star, Search, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/interview")({ component: InterviewPage });

const CATEGORIES = ["behavioural", "hr", "technical", "system_design", "puzzle", "project"] as const;
const CAT_LABEL: Record<string, string> = { behavioural: "Behavioural", hr: "HR", technical: "Technical", system_design: "System Design", puzzle: "Puzzle", project: "Project" };

function InterviewPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ question: "", category: "behavioural" as string, answer: "", company: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["interview", user!.id],
    queryFn: async () => (await supabase.from("interview_prep").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.question.trim()) throw new Error("Question required");
      const { error } = await supabase.from("interview_prep").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview"] }); setShowAdd(false); setDraft({ question: "", category: "behavioural", answer: "", company: "" }); toast.success("Added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("interview_prep").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["interview"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("interview_prep").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["interview"] }) });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((r: any) => (!ql || r.question?.toLowerCase().includes(ql) || r.company?.toLowerCase().includes(ql)) && (!fCat || r.category === fCat));
  }, [rows, q, fCat]);

  const chart = CATEGORIES.map((c) => ({ name: CAT_LABEL[c], count: rows.filter((r: any) => r.category === c).length, ready: rows.filter((r: any) => r.category === c && r.confidence >= 4).length })).filter((x) => x.count > 0);
  const ready = rows.filter((r: any) => r.confidence >= 4).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Interview Prep</h1>
          <p className="text-sm text-muted-foreground">Question bank with STAR answers, HR &amp; behavioural prep.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />Add question
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Questions" value={rows.length} />
        <Stat label="Ready (≥4)" value={ready} accent="text-success" />
        <Stat label="Starred" value={rows.filter((r: any) => r.starred).length} accent="text-warning" />
      </div>

      {chart.length > 0 && (
        <div className="card-flat p-4">
          <div className="section-label mb-2">Coverage by category</div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ready" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-2 gap-2">
          <F label="Question"><input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} className={inp} /></F>
          <F label="Category"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inp}>{CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select></F>
          <F label="Company (optional)"><input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className={inp} /></F>
          <F label="Your answer (STAR)"><textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} className={`${inp} min-h-[80px]`} placeholder="Situation, Task, Action, Result…" /></F>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" className="w-full h-8 pl-8 pr-2 rounded-md border border-border bg-background text-sm" />
        </div>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((r: any) => (
          <div key={r.id} className="card-flat overflow-hidden">
            <div className="p-3 flex items-center gap-2">
              <button onClick={() => update.mutate({ id: r.id, starred: !r.starred })}>
                <Star className={`h-4 w-4 ${r.starred ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
              <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex-1 text-left">
                <div className="text-sm font-medium">{r.question}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{CAT_LABEL[r.category]}{r.company && ` · ${r.company}`}</div>
              </button>
              <select value={r.confidence} onChange={(e) => update.mutate({ id: r.id, confidence: parseInt(e.target.value) })} className="text-[11px] px-2 h-6 rounded border border-border bg-background">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Confidence {n}</option>)}
              </select>
              <button onClick={() => setOpen(open === r.id ? null : r.id)} className="text-muted-foreground">{open === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {open === r.id && (
              <div className="border-t border-border p-3 bg-muted/30">
                <textarea value={r.answer ?? ""} onChange={(e) => update.mutate({ id: r.id, answer: e.target.value })} placeholder="Write your STAR answer…" className="w-full min-h-[120px] text-sm p-2 rounded border border-border bg-background" />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="card-flat p-10 text-center text-sm text-muted-foreground">No questions yet. Build your bank.</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
