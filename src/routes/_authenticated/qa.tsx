import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/qa")({ component: QaPage });

const TYPES = ["manual", "automation"] as const;
const TOOLS = ["Selenium", "Cypress", "Playwright", "JUnit", "TestNG", "Postman", "JMeter", "Appium", "RestAssured", "None", "Other"];
const CATEGORIES = ["Functional", "Regression", "API", "Performance", "Mobile", "Security", "Smoke", "Exploratory"];
const STATUSES = ["todo", "in_progress", "done", "review"] as const;
const STATUS_COLOR: Record<string, string> = { todo: "bg-muted text-muted-foreground", in_progress: "bg-info/15 text-info", done: "bg-success/15 text-success", review: "bg-warning/15 text-warning" };
const PIE_COLORS = ["var(--color-primary)", "var(--color-info)", "var(--color-success)", "var(--color-warning)"];

function QaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", url: "", test_type: "manual", tool: "Selenium", category: "Functional", hours: 0 });

  const { data: rows = [] } = useQuery({
    queryKey: ["qa", user!.id],
    queryFn: async () => ((await (supabase as any).from("qa_items").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? []),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("Title required");
      const { error } = await (supabase as any).from("qa_items").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qa"] }); setDraft({ ...draft, title: "", url: "" }); setShowAdd(false); toast.success("Item added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { const { error } = await (supabase as any).from("qa_items").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("qa_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa"] }),
  });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((x: any) => (!ql || x.title?.toLowerCase().includes(ql) || x.tool?.toLowerCase().includes(ql)) && (!fType || x.test_type === fType) && (!fStatus || x.status === fStatus));
  }, [rows, q, fType, fStatus]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r: any) => r.status === "done").length;
    const manual = rows.filter((r: any) => r.test_type === "manual").length;
    const auto = rows.filter((r: any) => r.test_type === "automation").length;
    const byCat = CATEGORIES.map((c) => ({ name: c, value: rows.filter((r: any) => r.category === c).length })).filter((x) => x.value > 0);
    return { total, done, manual, auto, byCat };
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">QA Hub</h1>
          <p className="text-sm text-muted-foreground">Manual + automation testing study and projects.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />Add item</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Completed" value={stats.done} accent="text-success" />
        <Stat label="Manual" value={stats.manual} />
        <Stat label="Automation" value={stats.auto} accent="text-info" />
      </div>

      <div className="card-flat p-4">
        <div className="section-label mb-3">Coverage by Category</div>
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={stats.byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                {stats.byCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-6 gap-2 items-end">
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">URL</span><input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Type</span><select value={draft.test_type} onChange={(e) => setDraft({ ...draft, test_type: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
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
          <select value={fType} onChange={(e) => setFType(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="text-left font-medium px-3 py-2">Title</th>
                <th className="text-left font-medium px-3 py-2">Type</th>
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
                  <td className="px-3 py-2"><span className={`text-[11px] px-2 py-0.5 rounded ${r.test_type === "automation" ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>{r.test_type}</span></td>
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
              {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">No QA items yet.</td></tr>}
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
