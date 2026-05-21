import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/devops")({ component: DevopsPage });

const TOOLS = ["Docker", "Kubernetes", "Jenkins", "GitHub Actions", "Terraform", "Ansible", "AWS", "GCP", "Azure", "Prometheus", "Grafana", "Linux", "Nginx", "Helm", "ArgoCD", "Other"];
const CATEGORIES = ["Containers", "Orchestration", "CI/CD", "IaC", "Cloud", "Monitoring", "OS/Networking", "Security"];
const STATUSES = ["todo", "learning", "done", "review"] as const;
const STATUS_COLOR: Record<string, string> = { todo: "bg-muted text-muted-foreground", learning: "bg-info/15 text-info", done: "bg-success/15 text-success", review: "bg-warning/15 text-warning" };

function DevopsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fTool, setFTool] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", url: "", tool: "Docker", category: "Containers", hours: 0 });

  const { data: rows = [] } = useQuery({
    queryKey: ["devops", user!.id],
    queryFn: async () => ((await (supabase as any).from("devops_items").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? []),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("Title required");
      const { error } = await (supabase as any).from("devops_items").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["devops"] }); setDraft({ ...draft, title: "", url: "" }); setShowAdd(false); toast.success("Item added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { const { error } = await (supabase as any).from("devops_items").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devops"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("devops_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devops"] }),
  });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((x: any) => (!ql || x.title?.toLowerCase().includes(ql)) && (!fTool || x.tool === fTool) && (!fStatus || x.status === fStatus));
  }, [rows, q, fTool, fStatus]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r: any) => r.status === "done").length;
    const hours = rows.reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
    const byTool = TOOLS.map((t) => ({ name: t, hours: rows.filter((r: any) => r.tool === t).reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0) })).filter((x) => x.hours > 0).sort((a, b) => b.hours - a.hours).slice(0, 8);
    return { total, done, hours, byTool };
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">DevOps Hub</h1>
          <p className="text-sm text-muted-foreground">Tools, labs and infra projects tracker.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />Add item</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Items" value={stats.total} />
        <Stat label="Completed" value={stats.done} accent="text-success" />
        <Stat label="Hours Logged" value={stats.hours.toFixed(1)} />
        <Stat label="Completion" value={stats.total ? `${Math.round((stats.done / stats.total) * 100)}%` : "—"} />
      </div>

      <div className="card-flat p-4">
        <div className="section-label mb-3">Hours by Tool</div>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={stats.byTool} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="hours" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-6 gap-2 items-end">
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">URL</span><input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Tool</span><select value={draft.tool} onChange={(e) => setDraft({ ...draft, tool: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{TOOLS.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Category</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{CATEGORIES.map((t) => <option key={t}>{t}</option>)}</select></label>
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
          <select value={fTool} onChange={(e) => setFTool(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All tools</option>{TOOLS.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="text-left font-medium px-3 py-2">Title</th>
                <th className="text-left font-medium px-3 py-2">Tool</th>
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Hours</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2"><span className="font-medium">{r.title}</span>{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                  </td>
                  <td className="px-3 py-2">{r.tool}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.category}</td>
                  <td className="px-3 py-2">
                    <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[r.status]}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="number" step="0.5" min={0} value={r.hours ?? 0} onChange={(e) => update.mutate({ id: r.id, hours: Number(e.target.value) })} className="h-7 w-20 px-2 rounded border border-border bg-background text-xs" /></td>
                  <td className="px-3 py-2"><button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">No DevOps items yet.</td></tr>}
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
