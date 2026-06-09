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

  const filtered = useMemo(() => rows.filter((r: any) => !fStatus || r.status === fStatus), [rows, fStatus]);
  const chart = STATUSES.map((s) => ({ name: STATUS_LABEL[s], value: rows.filter((r: any) => r.status === s).length })).filter((x) => x.value > 0);

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

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Total" value={rows.length} />
        <Stat label="Building" value={rows.filter((r: any) => r.status === "in_progress").length} accent="text-info" />
        <Stat label="Shipped" value={rows.filter((r: any) => r.status === "shipped").length} accent="text-success" />
        <Stat label="Ideas" value={rows.filter((r: any) => r.status === "idea").length} />
      </div>

      {chart.length > 0 && (
        <div className="card-flat p-4">
          <div className="section-label mb-2">Pipeline</div>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={chart} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                  {chart.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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

      <div className="card-flat p-3 flex flex-wrap gap-2 items-center">
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
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
                {p.tech_stack.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
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
        {filtered.length === 0 && <div className="md:col-span-2 card-flat p-10 text-center text-sm text-muted-foreground">No projects yet. Add your first build.</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
