import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Github, Globe, FolderKanban, TrendingUp, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, RadialBarChart, RadialBar } from "recharts";
import { TaskBoard } from "@/components/task-manager/task-board";

export const Route = createFileRoute("/_authenticated/projects")({ component: ProjectsPage });

const STATUSES = ["idea", "in_progress", "shipped", "archived"] as const;
const STATUS_LABEL: Record<string, string> = { idea: "Idea", in_progress: "Building", shipped: "Shipped", archived: "Archived" };
const STATUS_COLOR: Record<string, string> = { idea: "bg-muted text-muted-foreground", in_progress: "bg-info/15 text-info", shipped: "bg-success/15 text-success", archived: "bg-muted text-muted-foreground/60" };
const STATUS_DOT: Record<string, string> = { idea: "bg-muted-foreground/50", in_progress: "bg-info", shipped: "bg-success", archived: "bg-muted-foreground/30" };
const PIE = ["#94a3b8", "#6366f1", "#22c55e", "#64748b"];

function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", tech_stack: "", status: "idea" as string, repo_url: "", demo_url: "", highlights: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["projects", user!.id],
    queryFn: async () => (await supabase.from("projects").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (!selectedId && rows.length > 0) setSelectedId((rows[0] as any).id);
  }, [rows, selectedId]);

  const selected = rows.find((r: any) => r.id === selectedId) as any;

  const { data: boardTasks = [] } = useQuery({
    enabled: !!selectedId,
    queryKey: ["project-task-summary", selectedId],
    queryFn: async () => {
      const { data: board } = await supabase.from("task_boards").select("id, statuses").eq("user_id", user!.id).eq("scope", "project").eq("project_id", selectedId!).maybeSingle();
      if (!board) return { statuses: [], tasks: [] };
      const { data: tasks } = await supabase.from("tm_tasks").select("status_id").eq("board_id", board.id);
      return { statuses: (board as any).statuses ?? [], tasks: tasks ?? [] };
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("Title required");
      const tech_stack = draft.tech_stack.split(",").map((s) => s.trim()).filter(Boolean);
      const { data, error } = await supabase.from("projects").insert({ user_id: user!.id, ...draft, tech_stack }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowAdd(false);
      setDraft({ title: "", description: "", tech_stack: "", status: "idea", repo_url: "", demo_url: "", highlights: "" });
      if (data?.id) setSelectedId(data.id);
      toast.success("Project added");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("projects").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }) });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("projects").delete().eq("id", id); },
    onSuccess: (_d, id) => { qc.invalidateQueries({ queryKey: ["projects"] }); if (selectedId === id) setSelectedId(null); },
  });

  const pipeline = STATUSES.map((s) => ({ name: STATUS_LABEL[s], value: rows.filter((r: any) => r.status === s).length, key: s })).filter((x) => x.value > 0);

  const taskStats = useMemo(() => {
    const stats = (boardTasks as any).statuses ?? [];
    const tasks = (boardTasks as any).tasks ?? [];
    const total = tasks.length;
    const byStatus = stats.map((s: any) => ({
      name: s.name,
      value: tasks.filter((t: any) => t.status_id === s.id).length,
      color: s.color,
    }));
    const completed = byStatus.filter((x: any) => /done|complete|ship/i.test(x.name)).reduce((a: number, b: any) => a + b.value, 0);
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, byStatus, completed, pct };
  }, [boardTasks]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FolderKanban className="h-6 w-6 text-primary" />Projects</h1>
          <p className="text-sm text-muted-foreground">Your build log — switch a project to plan its tasks.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />New project
        </button>
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

      <div className="grid grid-cols-12 gap-5">
        {/* Left rail: project list */}
        <aside className="col-span-12 lg:col-span-3 space-y-2">
          <div className="section-label px-1">All projects · {rows.length}</div>
          <div className="space-y-1">
            {rows.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition group ${selectedId === p.id ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:bg-accent/30"}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status]}`} />
                  <span className="text-sm font-medium truncate flex-1">{p.title}</span>
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition ${selectedId === p.id ? "translate-x-0.5 text-primary" : ""}`} />
                </div>
                {p.tech_stack?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pl-4">
                    {p.tech_stack.slice(0, 3).map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
                    {p.tech_stack.length > 3 && <span className="text-[10px] text-muted-foreground">+{p.tech_stack.length - 3}</span>}
                  </div>
                )}
              </button>
            ))}
            {rows.length === 0 && (
              <div className="card-flat p-6 text-center text-xs text-muted-foreground">No projects yet. Add your first build.</div>
            )}
          </div>
        </aside>

        {/* Center: project detail + task board */}
        <main className="col-span-12 lg:col-span-6 space-y-4">
          {selected ? (
            <>
              <div className="card-flat p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      value={selected.title}
                      onChange={(e) => update.mutate({ id: selected.id, title: e.target.value })}
                      className="text-xl font-semibold bg-transparent outline-none w-full"
                    />
                    {selected.description && <div className="text-sm text-muted-foreground mt-1">{selected.description}</div>}
                  </div>
                  <button onClick={() => del.mutate(selected.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <select value={selected.status} onChange={(e) => update.mutate({ id: selected.id, status: e.target.value })} className={`text-[11px] px-2 h-7 rounded border-0 ${STATUS_COLOR[selected.status]}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  {selected.tech_stack?.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
                  <div className="ml-auto flex gap-2">
                    {selected.repo_url && <a href={selected.repo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /></a>}
                    {selected.demo_url && <a href={selected.demo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Globe className="h-4 w-4" /></a>}
                  </div>
                </div>
                {selected.highlights && <div className="mt-3 text-xs text-foreground/80 whitespace-pre-wrap border-l-2 border-primary/40 pl-2">{selected.highlights}</div>}
              </div>

              <TaskBoard scope="project" projectId={selected.id} defaultName={`${selected.title} · Tasks`} defaultIcon="🛠" />
            </>
          ) : (
            <div className="card-flat p-12 text-center text-sm text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Select a project to see its tasks, or create a new one.
            </div>
          )}
        </main>

        {/* Right rail: progress graphs */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="card-flat p-4">
            <div className="section-label mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Pipeline</div>
            {pipeline.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pipeline} dataKey="value" nameKey="name" innerRadius={38} outerRadius={66} paddingAngle={2}>
                      {pipeline.map((entry, i) => <Cell key={entry.key} fill={PIE[STATUSES.indexOf(entry.key as any)] ?? "#94a3b8"} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No projects yet</div>
            )}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {STATUSES.map((s, i) => (
                <div key={s} className="flex items-center justify-between text-[11px] px-1.5">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PIE[i] }} />{STATUS_LABEL[s]}</span>
                  <span className="tabular-nums font-medium">{rows.filter((r: any) => r.status === s).length}</span>
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <>
              <div className="card-flat p-4">
                <div className="section-label mb-3">Task completion</div>
                <div className="h-36 relative">
                  <ResponsiveContainer>
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "done", value: taskStats.pct, fill: "hsl(var(--primary))" }]} startAngle={90} endAngle={-270}>
                      <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold tabular-nums">{taskStats.pct}%</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{taskStats.completed}/{taskStats.total} done</div>
                  </div>
                </div>
              </div>

              {taskStats.byStatus.length > 0 && (
                <div className="card-flat p-4">
                  <div className="section-label mb-3">By status</div>
                  <div className="space-y-2">
                    {taskStats.byStatus.map((s: any) => {
                      const pct = taskStats.total === 0 ? 0 : Math.round((s.value / taskStats.total) * 100);
                      return (
                        <div key={s.name}>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">{s.name}</span>
                            <span className="tabular-nums font-medium">{s.value}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="card-flat p-4">
            <div className="section-label mb-2">Quick stats</div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Mini label="Total" value={rows.length} />
              <Mini label="Shipped" value={rows.filter((r: any) => r.status === "shipped").length} accent="text-success" />
              <Mini label="Building" value={rows.filter((r: any) => r.status === "in_progress").length} accent="text-info" />
              <Mini label="Ideas" value={rows.filter((r: any) => r.status === "idea").length} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Mini({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return <div className="rounded-md bg-muted/40 py-2"><div className={`text-lg font-semibold tabular-nums ${accent ?? ""}`}>{value}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div></div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
