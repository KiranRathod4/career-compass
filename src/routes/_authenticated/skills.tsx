import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/skills")({ component: SkillsPage });

const CATEGORIES = ["technical", "language", "framework", "tool", "soft", "domain"];
const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info",
  high: "bg-destructive/15 text-destructive",
};

function strengthLabel(level: number) {
  if (level >= 5) return { label: "Strong", cls: "bg-success/15 text-success" };
  if (level <= 1) return { label: "Weak", cls: "bg-destructive/15 text-destructive" };
  if (level <= 2) return { label: "Avg", cls: "bg-warning/15 text-warning" };
  return null;
}

function SkillsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "technical", current_level: 2, target_level: 5, priority: "medium" });

  const { data: rows = [] } = useQuery({
    queryKey: ["skills", user!.id],
    queryFn: async () => ((await (supabase as any).from("skills").select("*").eq("user_id", user!.id).order("created_at", { ascending: true })).data ?? []),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Name required");
      const { error } = await (supabase as any).from("skills").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); setDraft({ ...draft, name: "" }); setShowAdd(false); toast.success("Skill added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { const { error } = await (supabase as any).from("skills").update(patch).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("skills").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((x: any) => (!ql || x.name?.toLowerCase().includes(ql)) && (!fCat || x.category === fCat));
  }, [rows, q, fCat]);

  const stats = useMemo(() => {
    const total = rows.length;
    const mastered = rows.filter((r: any) => (r.current_level ?? 0) >= (r.target_level ?? 5)).length;
    const gap = rows.reduce((s: number, r: any) => s + Math.max(0, (r.target_level ?? 0) - (r.current_level ?? 0)), 0);
    // Aggregate by skill name (avg current/target) for radar so duplicates collapse
    const map = new Map<string, { current: number[]; target: number[] }>();
    for (const r of rows as any[]) {
      const k = (r.name ?? "").trim();
      if (!k) continue;
      const e = map.get(k) ?? { current: [], target: [] };
      e.current.push(r.current_level ?? 0);
      e.target.push(r.target_level ?? 5);
      map.set(k, e);
    }
    const radarData = Array.from(map.entries()).slice(0, 10).map(([skill, v]) => ({
      skill,
      current: +(v.current.reduce((a, b) => a + b, 0) / v.current.length).toFixed(2),
      target: +(v.target.reduce((a, b) => a + b, 0) / v.target.length).toFixed(2),
    }));
    return { total, mastered, gap, radarData };
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Skill Matrix</h1>
          <p className="text-sm text-muted-foreground">Self-rated technical and soft skill gap analysis.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />Add skill</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Skills Tracked" value={stats.total} />
        <Stat label="At Target" value={stats.mastered} accent="text-success" />
        <Stat label="Gap (levels)" value={stats.gap} accent="text-warning" />
        <Stat label="Mastery %" value={stats.total ? `${Math.round((stats.mastered / stats.total) * 100)}%` : "—"} />
      </div>

      {/* Radar + Sliders side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-flat p-4">
          <div className="section-label mb-3">Radar</div>
          {stats.radarData.length >= 3 ? (
            <div className="h-[420px]">
              <ResponsiveContainer>
                <RadarChart data={stats.radarData} outerRadius="75%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} angle={90} />
                  <Radar name="Target" dataKey="target" stroke="var(--color-muted-foreground)" fill="var(--color-muted-foreground)" fillOpacity={0.1} />
                  <Radar name="Current" dataKey="current" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.45} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
              Add at least 3 skills to see the radar.
            </div>
          )}
        </div>

        <div className="card-flat p-4">
          <div className="section-label mb-3">Skills</div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {rows.length === 0 && (
              <div className="text-sm text-muted-foreground py-10 text-center">No skills yet. Add one to get started.</div>
            )}
            {rows.map((r: any) => {
              const strength = strengthLabel(r.current_level ?? 0);
              return (
                <div key={r.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-28 text-sm font-medium truncate" title={r.name}>{r.name}</div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={r.current_level ?? 0}
                    onChange={(e) => update.mutate({ id: r.id, current_level: +e.target.value })}
                    className="flex-1 accent-primary"
                  />
                  <div className="w-10 text-xs text-muted-foreground tabular-nums text-right">{r.current_level ?? 0}/5</div>
                  {strength && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${strength.cls}`}>{strength.label}</span>
                  )}
                  <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-6 gap-2 items-end">
          <label className="block md:col-span-2"><span className="text-[11px] text-muted-foreground">Skill name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Category</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Current</span><input type="number" min={0} max={5} value={draft.current_level} onChange={(e) => setDraft({ ...draft, current_level: +e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Target</span><input type="number" min={1} max={5} value={draft.target_level} onChange={(e) => setDraft({ ...draft, target_level: +e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm" /></label>
          <label className="block"><span className="text-[11px] text-muted-foreground">Priority</span><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm">{PRIORITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
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
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="text-left font-medium px-3 py-2">Skill</th>
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-left font-medium px-3 py-2">Current</th>
                <th className="text-left font-medium px-3 py-2">Target</th>
                <th className="text-left font-medium px-3 py-2 w-40">Progress</th>
                <th className="text-left font-medium px-3 py-2">Priority</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const pct = Math.min(100, Math.round(((r.current_level ?? 0) / (r.target_level || 5)) * 100));
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.category}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => update.mutate({ id: r.id, current_level: n })} className={`h-4 w-4 rounded-sm ${n <= (r.current_level ?? 0) ? "bg-primary" : "bg-muted"}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.target_level}/5</td>
                    <td className="px-3 py-2"><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div></td>
                    <td className="px-3 py-2">
                      <select value={r.priority} onChange={(e) => update.mutate({ id: r.id, priority: e.target.value })} className={`text-[11px] px-2 h-6 rounded border-0 ${PRIORITY_COLOR[r.priority]}`}>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">No skills tracked yet.</td></tr>}
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
