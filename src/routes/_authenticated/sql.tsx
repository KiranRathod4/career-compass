import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2, ExternalLink, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/sql")({ component: SqlPage });

const TOPICS = ["Joins", "Aggregation", "Subqueries", "Window Functions", "CTE", "Indexes", "Group By", "Having", "Self Join", "Set Ops", "Date/Time", "String Funcs", "DDL", "Transactions", "Other"];
const DIFFS = ["Easy", "Medium", "Hard"] as const;
const STATUSES = ["todo", "attempted", "solved", "revise"] as const;
const PLATFORMS = ["LeetCode", "HackerRank", "StrataScratch", "DataLemur", "SQLZoo", "Other"];
const DIFF_COLOR: Record<string, string> = { Easy: "var(--color-success)", Medium: "var(--color-warning)", Hard: "var(--color-destructive)" };
const STATUS_COLOR: Record<string, string> = { todo: "bg-muted text-muted-foreground", attempted: "bg-info/15 text-info", solved: "bg-success/15 text-success", revise: "bg-warning/15 text-warning" };

function SqlPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fTopic, setFTopic] = useState("");
  const [fDiff, setFDiff] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", url: "", platform: "LeetCode", topic: "Joins", difficulty: "Medium" });

  const { data: rows = [] } = useQuery({
    queryKey: ["sql", user!.id],
    queryFn: async () => ((await (supabase as any).from("sql_problems").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? []),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("Title required");
      const { error } = await (supabase as any).from("sql_problems").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sql"] }); setDraft({ ...draft, title: "", url: "" }); setShowAdd(false); toast.success("Problem added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { const { error } = await (supabase as any).from("sql_problems").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sql"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("sql_problems").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sql"] }),
  });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((x: any) =>
      (!ql || x.title?.toLowerCase().includes(ql) || x.topic?.toLowerCase().includes(ql)) &&
      (!fTopic || x.topic === fTopic) && (!fDiff || x.difficulty === fDiff) && (!fStatus || x.status === fStatus)
    );
  }, [rows, q, fTopic, fDiff, fStatus]);

  const stats = useMemo(() => {
    const total = rows.length;
    const solved = rows.filter((r: any) => r.status === "solved").length;
    const revise = rows.filter((r: any) => r.status === "revise").length;
    const byTopic = TOPICS.map((t) => ({ name: t, count: rows.filter((r: any) => r.topic === t).length })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);
    const byDiff = (DIFFS as readonly string[]).map((d) => ({ name: d, count: rows.filter((r: any) => r.difficulty === d).length }));
    return { total, solved, revise, byTopic, byDiff };
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SQL Tracker</h1>
          <p className="text-sm text-muted-foreground">Query practice across platforms with topic-wise progress.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />Add problem</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Solved" value={stats.solved} accent="text-success" />
        <Stat label="To Revise" value={stats.revise} accent="text-warning" />
        <Stat label="Solve Rate" value={stats.total ? `${Math.round((stats.solved / stats.total) * 100)}%` : "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-flat p-4">
          <div className="section-label mb-3">By Difficulty</div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={stats.byDiff}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>{stats.byDiff.map((d) => <Cell key={d.name} fill={DIFF_COLOR[d.name]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-flat p-4">
          <div className="section-label mb-3">Top Topics</div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={stats.byTopic} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-6 gap-2 items-end">
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">URL</span><input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Platform</span><select value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Topic</span><select value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{TOPICS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Difficulty</span><select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{DIFFS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <div className="md:col-span-6 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat overflow-hidden">
        <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full h-8 pl-8 pr-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <select value={fTopic} onChange={(e) => setFTopic(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All topics</option>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={fDiff} onChange={(e) => setFDiff(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All difficulty</option>{DIFFS.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="text-left font-medium px-3 py-2 w-8"></th>
                <th className="text-left font-medium px-3 py-2">Title</th>
                <th className="text-left font-medium px-3 py-2">Topic</th>
                <th className="text-left font-medium px-3 py-2">Difficulty</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Attempts</th>
                <th className="text-left font-medium px-3 py-2">Last Revised</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2"><button onClick={() => update.mutate({ id: r.id, starred: !r.starred })}><Star className={`h-4 w-4 ${r.starred ? "fill-warning text-warning" : "text-muted-foreground"}`} /></button></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2"><span className="font-medium">{r.title}</span>{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                    <div className="text-[11px] text-muted-foreground">{r.platform}</div>
                  </td>
                  <td className="px-3 py-2">{r.topic}</td>
                  <td className="px-3 py-2"><span className="text-xs font-medium" style={{ color: DIFF_COLOR[r.difficulty] }}>{r.difficulty}</span></td>
                  <td className="px-3 py-2">
                    <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value, last_revised_at: e.target.value === "solved" || e.target.value === "revise" ? format(new Date(), "yyyy-MM-dd") : r.last_revised_at })} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[r.status]}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => update.mutate({ id: r.id, attempts: Math.max(0, (r.attempts ?? 0) - 1) })} className="h-5 w-5 rounded border border-border text-xs">−</button>
                      <span className="w-6 text-center text-xs">{r.attempts ?? 0}</span>
                      <button onClick={() => update.mutate({ id: r.id, attempts: (r.attempts ?? 0) + 1 })} className="h-5 w-5 rounded border border-border text-xs">+</button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.last_revised_at ?? "—"}</td>
                  <td className="px-3 py-2"><button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No SQL problems yet.</td></tr>}
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
