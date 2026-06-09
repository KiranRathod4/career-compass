import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Github, Globe, Search, ArrowUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/projects")({ component: ProjectsPage });

const STATUSES = ["idea", "in_progress", "shipped", "archived"] as const;
const STATUS_LABEL: Record<string, string> = { idea: "Idea", in_progress: "Building", shipped: "Shipped", archived: "Archived" };
const STATUS_COLOR: Record<string, string> = { idea: "bg-muted text-muted-foreground", in_progress: "bg-info/15 text-info", shipped: "bg-success/15 text-success", archived: "bg-muted text-muted-foreground/60" };
const PIE = ["#6366f1", "#8b5cf6", "#22c55e", "#94a3b8"];

function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [fStatus, setFStatus] = useState("");
  const [fTech, setFTech] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest" | "title" | "status">("recent");
  const [draft, setDraft] = useState({ title: "", description: "", tech_stack: "", status: "idea" as string, repo_url: "", demo_url: "", highlights: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["projects", user!.id],
    queryFn: async () => (await supabase.from("projects").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("Title required");
      const tech_stack = draft.tech_stack.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("projects").insert({ user_id: user!.id, ...draft, tech_stack });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setShowAdd(false); setDraft({ title: "", description: "", tech_stack: "", status: "idea", repo_url: "", demo_url: "", highlights: "" }); toast.success("Project added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("projects").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("projects").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }) });

  const statusRank: Record<string, number> = { in_progress: 0, idea: 1, shipped: 2, archived: 3 };
  const allTech = useMemo(() => Array.from(new Set(rows.flatMap((r: any) => r.tech_stack ?? []))).sort() as string[], [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = rows.filter((r: any) => {
      if (fStatus && r.status !== fStatus) return false;
      if (fTech && !(r.tech_stack ?? []).includes(fTech)) return false;
      if (qq) {
        const hay = `${r.title} ${r.description ?? ""} ${(r.tech_stack ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
    list = [...list].sort((a: any, b: any) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "status") return (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      const ta = new Date(a.created_at).getTime(), tb = new Date(b.created_at).getTime();
      return sort === "oldest" ? ta - tb : tb - ta;
    });
    return list;
  }, [rows, fStatus, fTech, q, sort]);

  const chart = STATUSES.map((s) => ({ name: STATUS_LABEL[s], key: s, value: filtered.filter((r: any) => r.status === s).length })).filter((x) => x.value > 0);
  const techChart = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r: any) => (r.tech_stack ?? []).forEach((t: string) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered]);

  const clearFilters = () => { setFStatus(""); setFTech(""); setQ(""); setSort("recent"); };
  const hasFilters = fStatus || fTech || q || sort !== "recent";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Build log: ideas, in-progress, and shipped.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />New project
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total" value={rows.length} />
        <Stat label="Building" value={rows.filter((r: any) => r.status === "in_progress").length} accent="text-info" />
        <Stat label="Shipped" value={rows.filter((r: any) => r.status === "shipped").length} accent="text-success" />
        <Stat label="Ideas" value={rows.filter((r: any) => r.status === "idea").length} />
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-2 gap-2">
          <F label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inp} /></F>
          <F label="Status"><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={inp}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></F>
          <F label="Tech stack (comma separated)"><input value={draft.tech_stack} onChange={(e) => setDraft({ ...draft, tech_stack: e.target.value })} className={inp} placeholder="React, Node, Postgres" /></F>
          <F label="Repo URL"><input value={draft.repo_url} onChange={(e) => setDraft({ ...draft, repo_url: e.target.value })} className={inp} /></F>
          <F label="Demo URL"><input value={draft.demo_url} onChange={(e) => setDraft({ ...draft, demo_url: e.target.value })} className={inp} /></F>
          <F label="Description"><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={`${inp} min-h-[60px]`} /></F>
          <F label="Resume highlights"><textarea value={draft.highlights} onChange={(e) => setDraft({ ...draft, highlights: e.target.value })} className={`${inp} min-h-[60px]`} placeholder="Bullet-point achievements for your resume" /></F>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column: filters + list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-flat p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description, tech…"
                className="w-full h-8 pl-7 pr-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
              <option value="">All status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select value={fTech} onChange={(e) => setFTech(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs" disabled={allTech.length === 0}>
              <option value="">All tech</option>
              {allTech.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
                <option value="recent">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title A–Z</option>
                <option value="status">By status</option>
              </select>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
            <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">{filtered.length} of {rows.length}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {filtered.map((p: any) => (
              <div key={p.id} className="card-flat p-4 group flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{p.title}</div>
                  <button onClick={() => del.mutate(p.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {p.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
                {p.tech_stack?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tech_stack.map((t: string) => (
                      <button key={t} onClick={() => setFTech(t)} className={`text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent ${fTech === t ? "ring-1 ring-primary" : ""}`}>{t}</button>
                    ))}
                  </div>
                )}
                {p.highlights && <div className="mt-2 text-xs text-foreground/80 whitespace-pre-wrap border-l-2 border-primary/40 pl-2">{p.highlights}</div>}
                <div className="mt-3 flex items-center gap-2">
                  <select value={p.status} onChange={(e) => update.mutate({ id: p.id, status: e.target.value })} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[p.status]}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <div className="ml-auto flex gap-2">
                    {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Github className="h-3.5 w-3.5" /></a>}
                    {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Globe className="h-3.5 w-3.5" /></a>}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="md:col-span-2 card-flat p-10 text-center text-sm text-muted-foreground">
                {rows.length === 0 ? "No projects yet. Add your first build." : "No projects match your filters."}
              </div>
            )}
          </div>
        </div>

        {/* Right rail: progress graphs (reflect filtered set) */}
        <div className="space-y-4">
          <div className="card-flat p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="section-label">Pipeline</div>
              <div className="text-[10px] text-muted-foreground">{filtered.length} shown</div>
            </div>
            {chart.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chart} dataKey="value" nameKey="name" innerRadius={36} outerRadius={64} paddingAngle={2}>
                      {chart.map((c, i) => <Cell key={i} fill={PIE[STATUSES.indexOf(c.key as any) % PIE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-44 grid place-items-center text-xs text-muted-foreground">No data</div>}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {STATUSES.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                  <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
                  <span className="ml-auto tabular-nums">{filtered.filter((r: any) => r.status === s).length}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-flat p-4">
            <div className="section-label mb-2">Top tech</div>
            {techChart.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer>
                  <BarChart data={techChart} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={70} tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-44 grid place-items-center text-xs text-muted-foreground">No tech tagged yet</div>}
          </div>

          <div className="card-flat p-4">
            <div className="section-label mb-2">Quick filter</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setFStatus(fStatus === s ? "" : s)}
                  className={`text-[11px] px-2 h-6 rounded-full border transition ${fStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
