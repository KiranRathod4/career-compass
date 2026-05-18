import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planner")({ component: PlannerPage });

const CATS = ["DSA","Aptitude","SQL","DevOps","QA","Job Apps","Project","Class","Break","Other"];
const CHECKS: Array<[string, string]> = [
  ["dsa_done","DSA"],["aptitude_done","Aptitude"],["sql_done","SQL"],
  ["devops_done","DevOps"],["qa_done","QA"],["mock_done","Mock"],
  ["revision_done","Revision"],["linkedin_post","LinkedIn"],
];

const TEMPLATES: Record<string, { start: string; end: string; task: string; category: string }[]> = {
  "College Day": [
    { start: "07:00", end: "08:00", task: "Morning DSA", category: "DSA" },
    { start: "09:00", end: "16:00", task: "College", category: "Class" },
    { start: "17:00", end: "18:30", task: "SQL practice", category: "SQL" },
    { start: "19:00", end: "20:00", task: "Apply to 2 jobs", category: "Job Apps" },
  ],
  "Full Prep Day": [
    { start: "08:00", end: "10:00", task: "DSA — 3 problems", category: "DSA" },
    { start: "10:15", end: "11:30", task: "Aptitude", category: "Aptitude" },
    { start: "12:00", end: "13:00", task: "SQL", category: "SQL" },
    { start: "14:00", end: "16:00", task: "DevOps lab", category: "DevOps" },
    { start: "16:30", end: "18:00", task: "Project work", category: "Project" },
    { start: "19:00", end: "20:00", task: "Apply to 3 jobs", category: "Job Apps" },
    { start: "20:30", end: "22:00", task: "Revision", category: "Other" },
  ],
  "Interview Day": [
    { start: "08:00", end: "09:00", task: "Light review", category: "Other" },
    { start: "10:00", end: "12:00", task: "Interview", category: "Other" },
    { start: "14:00", end: "15:00", task: "Reflect + notes", category: "Other" },
  ],
  "Rest Day": [{ start: "10:00", end: "10:30", task: "Light DSA review", category: "DSA" }],
};

function PlannerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: entry } = useQuery({
    queryKey: ["daily", user!.id, date],
    queryFn: async () => (await supabase.from("daily_tracker").select("*").eq("user_id", user!.id).eq("date", date).maybeSingle()).data,
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["blocks", user!.id, date],
    queryFn: async () => (await supabase.from("time_blocks").select("*").eq("user_id", user!.id).eq("date", date).order("start_time")).data ?? [],
  });

  const { data: monthEntries = [] } = useQuery({
    queryKey: ["daily-month", user!.id],
    queryFn: async () => (await supabase.from("daily_tracker").select("*").eq("user_id", user!.id).gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd"))).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("daily_tracker").upsert({ user_id: user!.id, date, ...entry, ...patch }, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily"] }); qc.invalidateQueries({ queryKey: ["daily-month"] }); },
  });

  const addBlock = useMutation({
    mutationFn: async (b: any) => {
      const { error } = await supabase.from("time_blocks").insert({ user_id: user!.id, date, ...b });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const delBlock = useMutation({
    mutationFn: async (id: string) => { await supabase.from("time_blocks").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...patch }: any) => { await supabase.from("time_blocks").update(patch).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const [newBlock, setNewBlock] = useState({ start_time: "09:00", end_time: "10:00", task: "", category: "DSA" });

  const applyTemplate = async (name: string) => {
    const tpl = TEMPLATES[name];
    for (const b of tpl) await supabase.from("time_blocks").insert({ user_id: user!.id, date, ...b });
    qc.invalidateQueries({ queryKey: ["blocks"] });
    toast.success(`${name} loaded`);
  };

  // streak: consecutive days with >=5 checks
  const streak = (() => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const e = monthEntries.find((x: any) => x.date === d);
      const c = e ? CHECKS.filter(([k]) => (e as any)[k]).length : 0;
      if (c >= 5) s++; else break;
    }
    return s;
  })();

  const monthPct = monthEntries.length
    ? Math.round(monthEntries.reduce((sum: number, e: any) => sum + CHECKS.filter(([k]) => (e as any)[k]).length, 0) / (monthEntries.length * CHECKS.length) * 100)
    : 0;

  const avgScore = monthEntries.filter((e: any) => e.productivity_score).length
    ? (monthEntries.reduce((s: number, e: any) => s + (e.productivity_score ?? 0), 0) / monthEntries.filter((e: any) => e.productivity_score).length).toFixed(1)
    : "—";

  const totalDeepWork = monthEntries.reduce((s: number, e: any) => s + +(e.deep_work_hours ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-flat p-4"><div className="section-label">Streak</div><div className="mt-2 text-2xl font-semibold flex items-center gap-1.5"><Flame className="h-5 w-5 text-warning" />{streak}</div></div>
        <div className="card-flat p-4"><div className="section-label">Month Completion</div><div className="mt-2 text-2xl font-semibold">{monthPct}%</div></div>
        <div className="card-flat p-4"><div className="section-label">Avg Productivity</div><div className="mt-2 text-2xl font-semibold">{avgScore}</div></div>
        <div className="card-flat p-4"><div className="section-label">Deep Work (30d)</div><div className="mt-2 text-2xl font-semibold">{totalDeepWork.toFixed(0)}h</div></div>
      </div>

      <div className="card-flat p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label">Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 px-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(TEMPLATES).map((t) => (
              <button key={t} onClick={() => applyTemplate(t)} className="text-xs px-3 h-8 rounded-md border border-border hover:bg-accent">{t}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="section-label mb-2">Daily Tracker</div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Wake"><input type="time" value={entry?.wake_time ?? ""} onChange={(e) => upsert.mutate({ wake_time: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
                <Field label="Sleep"><input type="time" value={entry?.sleep_time ?? ""} onChange={(e) => upsert.mutate({ sleep_time: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
                <Field label="Deep work (hrs)"><input type="number" step="0.5" value={entry?.deep_work_hours ?? 0} onChange={(e) => upsert.mutate({ deep_work_hours: +e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
                <Field label="Applications"><input type="number" value={entry?.applications_count ?? 0} onChange={(e) => upsert.mutate({ applications_count: +e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2">
                {CHECKS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!(entry as any)?.[key]} onChange={(e) => upsert.mutate({ [key]: e.target.checked })}
                      className="h-4 w-4 rounded border-border accent-[var(--color-primary)]" />
                    {label}
                  </label>
                ))}
              </div>
              <Field label="Productivity (1-10)"><input type="number" min={1} max={10} value={entry?.productivity_score ?? ""} onChange={(e) => upsert.mutate({ productivity_score: +e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
              <Field label="Mood"><select value={entry?.mood ?? ""} onChange={(e) => upsert.mutate({ mood: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm">
                <option value="">—</option>{["Tired","Okay","Focused","Motivated","Burnt Out"].map((m) => <option key={m}>{m}</option>)}
              </select></Field>
              <Field label="Notes"><textarea value={entry?.notes ?? ""} onChange={(e) => upsert.mutate({ notes: e.target.value })} rows={3} className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" /></Field>
            </div>
          </div>

          <div>
            <div className="section-label mb-2">Time Blocks</div>
            <div className="space-y-2">
              {blocks.map((b: any) => (
                <div key={b.id} className="flex items-center gap-2 p-2 rounded-md border border-border">
                  <span className="text-xs font-mono text-muted-foreground w-24">{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</span>
                  <span className="text-sm flex-1 truncate">{b.task}</span>
                  <span className="text-[10px] px-1.5 h-5 rounded bg-muted text-muted-foreground inline-flex items-center">{b.category}</span>
                  <select value={b.status} onChange={(e) => updateBlock.mutate({ id: b.id, status: e.target.value })} className="text-xs h-7 rounded border border-border bg-background">
                    <option value="planned">Planned</option><option value="done">Done</option><option value="skipped">Skipped</option>
                  </select>
                  <button onClick={() => delBlock.mutate(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-border">
                <input type="time" value={newBlock.start_time} onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })} className="h-7 px-1 rounded border border-border bg-background text-xs w-20" />
                <input type="time" value={newBlock.end_time} onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })} className="h-7 px-1 rounded border border-border bg-background text-xs w-20" />
                <input value={newBlock.task} onChange={(e) => setNewBlock({ ...newBlock, task: e.target.value })} placeholder="Task" className="h-7 px-2 rounded border border-border bg-background text-xs flex-1" />
                <select value={newBlock.category} onChange={(e) => setNewBlock({ ...newBlock, category: e.target.value })} className="h-7 rounded border border-border bg-background text-xs">{CATS.map((c) => <option key={c}>{c}</option>)}</select>
                <button onClick={() => { if (newBlock.task) { addBlock.mutate(newBlock); setNewBlock({ ...newBlock, task: "" }); } }} className="h-7 w-7 rounded bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
