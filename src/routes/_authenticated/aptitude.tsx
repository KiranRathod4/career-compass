import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { format, subDays, eachDayOfInterval } from "date-fns";

export const Route = createFileRoute("/_authenticated/aptitude")({ component: AptitudePage });

const CATEGORIES = ["Quantitative", "Logical", "Verbal", "Data Interpretation"];
const TOPICS_BY_CAT: Record<string, string[]> = {
  Quantitative: ["Time & Work", "Percentages", "Ratios", "Profit & Loss", "Time Speed Distance", "Probability", "Permutations", "Number System", "Geometry", "Mensuration"],
  Logical: ["Series", "Coding-Decoding", "Blood Relations", "Direction", "Syllogism", "Seating", "Puzzles", "Cubes"],
  Verbal: ["Reading Comp", "Synonyms", "Antonyms", "Para Jumbles", "Sentence Correction", "Fill Blanks"],
  "Data Interpretation": ["Tables", "Bar Graphs", "Line Graphs", "Pie Charts", "Caselets"],
};
const DIFFS = ["Easy", "Medium", "Hard"];

function AptitudePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ date: format(new Date(), "yyyy-MM-dd"), category: "Quantitative", topic: "Time & Work", questions_attempted: 10, questions_correct: 7, time_minutes: 15, difficulty: "Medium", notes: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["aptitude", user!.id],
    queryFn: async () => ((await (supabase as any).from("aptitude_log").select("*").eq("user_id", user!.id).order("date", { ascending: false })).data ?? []),
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("aptitude_log").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["aptitude"] }); setShowAdd(false); toast.success("Session logged"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("aptitude_log").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aptitude"] }),
  });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((x: any) => (!ql || x.topic?.toLowerCase().includes(ql) || x.category?.toLowerCase().includes(ql)) && (!fCat || x.category === fCat));
  }, [rows, q, fCat]);

  const stats = useMemo(() => {
    const total = rows.reduce((s: number, r: any) => s + (r.questions_attempted ?? 0), 0);
    const correct = rows.reduce((s: number, r: any) => s + (r.questions_correct ?? 0), 0);
    const time = rows.reduce((s: number, r: any) => s + (r.time_minutes ?? 0), 0);
    const acc = total ? Math.round((correct / total) * 100) : 0;
    const byCat = CATEGORIES.map((c) => {
      const subset = rows.filter((r: any) => r.category === c);
      const a = subset.reduce((s: number, r: any) => s + (r.questions_attempted ?? 0), 0);
      const co = subset.reduce((s: number, r: any) => s + (r.questions_correct ?? 0), 0);
      return { name: c.split(" ")[0], attempted: a, accuracy: a ? Math.round((co / a) * 100) : 0 };
    });
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    const trend = days.map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      const subset = rows.filter((r: any) => r.date === ds);
      const a = subset.reduce((s: number, r: any) => s + (r.questions_attempted ?? 0), 0);
      const co = subset.reduce((s: number, r: any) => s + (r.questions_correct ?? 0), 0);
      return { day: format(d, "MMM d"), attempted: a, accuracy: a ? Math.round((co / a) * 100) : 0 };
    });
    return { total, correct, time, acc, byCat, trend };
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Aptitude</h1>
          <p className="text-sm text-muted-foreground">Quant, logical, verbal and DI practice log.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />Log session</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Questions" value={stats.total} />
        <Stat label="Correct" value={stats.correct} accent="text-success" />
        <Stat label="Accuracy" value={`${stats.acc}%`} accent={stats.acc >= 70 ? "text-success" : "text-warning"} />
        <Stat label="Time Spent" value={`${Math.round(stats.time / 60)}h ${stats.time % 60}m`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-flat p-4">
          <div className="section-label mb-3">Accuracy by Category</div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={stats.byCat}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="accuracy" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-flat p-4">
          <div className="section-label mb-3">Last 14 Days</div>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={stats.trend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                <Line type="monotone" dataKey="attempted" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-7 gap-2 items-end">
          <Lbl><span className="text-[11px] text-muted-foreground">Date</span><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></Lbl>
          <Lbl><span className="text-[11px] text-muted-foreground">Category</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value, topic: TOPICS_BY_CAT[e.target.value][0] })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
          <Lbl><span className="text-[11px] text-muted-foreground">Topic</span><select value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{TOPICS_BY_CAT[draft.category].map((c) => <option key={c}>{c}</option>)}</select></Lbl>
          <Lbl><span className="text-[11px] text-muted-foreground">Attempted</span><input type="number" min={0} value={draft.questions_attempted} onChange={(e) => setDraft({ ...draft, questions_attempted: +e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></Lbl>
          <Lbl><span className="text-[11px] text-muted-foreground">Correct</span><input type="number" min={0} value={draft.questions_correct} onChange={(e) => setDraft({ ...draft, questions_correct: +e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></Lbl>
          <Lbl><span className="text-[11px] text-muted-foreground">Minutes</span><input type="number" min={0} value={draft.time_minutes} onChange={(e) => setDraft({ ...draft, time_minutes: +e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></Lbl>
          <Lbl><span className="text-[11px] text-muted-foreground">Difficulty</span><select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{DIFFS.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
          <div className="md:col-span-7 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat overflow-hidden">
        <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topic…" className="w-full h-8 pl-8 pr-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="text-left font-medium px-3 py-2">Date</th>
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-left font-medium px-3 py-2">Topic</th>
                <th className="text-left font-medium px-3 py-2">Attempted</th>
                <th className="text-left font-medium px-3 py-2">Correct</th>
                <th className="text-left font-medium px-3 py-2">Accuracy</th>
                <th className="text-left font-medium px-3 py-2">Time</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const a = r.questions_attempted ?? 0;
                const c = r.questions_correct ?? 0;
                const acc = a ? Math.round((c / a) * 100) : 0;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2">{r.topic}</td>
                    <td className="px-3 py-2">{a}</td>
                    <td className="px-3 py-2">{c}</td>
                    <td className="px-3 py-2"><span className={`text-xs font-medium ${acc >= 70 ? "text-success" : acc >= 50 ? "text-warning" : "text-destructive"}`}>{acc}%</span></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.time_minutes}m</td>
                    <td className="px-3 py-2"><button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No sessions yet. Log your first practice round.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block">{children}</label>;
}
