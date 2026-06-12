import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Flame, AlertTriangle, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { aiDailyPlan, aiOverload } from "@/lib/ai.functions";
import { AICard, ScoreBar } from "@/components/ai-insight-card";
import { TaskBoard } from "@/components/task-manager/task-board";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({ component: PlannerPage });

const CATS = ["DSA","Aptitude","SQL","DevOps","QA","Job Apps","Project","Class","Break","Other"];
const CHECKS: Array<[string, string]> = [
  ["dsa_done","DSA"],["aptitude_done","Aptitude"],["sql_done","SQL"],
  ["devops_done","DevOps"],["qa_done","QA"],["mock_done","Mock"],
  ["revision_done","Revision"],["linkedin_post","LinkedIn"],
];

const TEMPLATES: Record<string, { start_time: string; end_time: string; task: string; category: string }[]> = {
  "College Day": [
    { start_time: "07:00", end_time: "08:00", task: "Morning DSA", category: "DSA" },
    { start_time: "09:00", end_time: "16:00", task: "College", category: "Class" },
    { start_time: "17:00", end_time: "18:30", task: "SQL practice", category: "SQL" },
    { start_time: "19:00", end_time: "20:00", task: "Apply to 2 jobs", category: "Job Apps" },
  ],
  "Full Prep Day": [
    { start_time: "08:00", end_time: "10:00", task: "DSA — 3 problems", category: "DSA" },
    { start_time: "10:15", end_time: "11:30", task: "Aptitude", category: "Aptitude" },
    { start_time: "12:00", end_time: "13:00", task: "SQL", category: "SQL" },
    { start_time: "14:00", end_time: "16:00", task: "DevOps lab", category: "DevOps" },
    { start_time: "16:30", end_time: "18:00", task: "Project work", category: "Project" },
    { start_time: "19:00", end_time: "20:00", task: "Apply to 3 jobs", category: "Job Apps" },
    { start_time: "20:30", end_time: "22:00", task: "Revision", category: "Other" },
  ],
  "Interview Day": [
    { start_time: "08:00", end_time: "09:00", task: "Light review", category: "Other" },
    { start_time: "10:00", end_time: "12:00", task: "Interview", category: "Other" },
    { start_time: "14:00", end_time: "15:00", task: "Reflect + notes", category: "Other" },
  ],
  "Rest Day": [{ start_time: "10:00", end_time: "10:30", task: "Light DSA review", category: "DSA" }],
};

interface MoodOption {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  quote: string;
  author: string;
  tip: string;
}

const MOODS: MoodOption[] = [
  {
    label: "Tired",
    emoji: "😴",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-600",
    quote: "Rest is not idleness. It is the fuel that powers your next breakthrough.",
    author: "Lin Yutang",
    tip: "Take a 20-min power nap or a light walk before your next session.",
  },
  {
    label: "Okay",
    emoji: "😐",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-300 dark:border-amber-700",
    quote: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    tip: "Pick one small win — a single DSA problem or 15 mins of revision — to build momentum.",
  },
  {
    label: "Focused",
    emoji: "⚡",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300 dark:border-emerald-700",
    quote: "Deep work is the superpower of the 21st century. Protect it fiercely.",
    author: "Cal Newport",
    tip: "You're in flow — lock in a 90-min deep-work block on your hardest topic.",
  },
  {
    label: "Motivated",
    emoji: "🔥",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-300 dark:border-rose-700",
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    tip: "Channel this energy into mock interviews or job applications — strike while the iron is hot!",
  },
  {
    label: "Burnt Out",
    emoji: "🪫",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-300 dark:border-red-700",
    quote: "It's okay to pause. A battery recharges only when it stops giving.",
    author: "Taiyaar",
    tip: "Step away from the screen. Hydrate, breathe, and come back tomorrow stronger.",
  },
];

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

      <TaskBoard scope="planner" defaultName="Daily Workspace" defaultIcon="🎯" />

      <details className="card-flat p-4">
        <summary className="cursor-pointer text-sm font-medium select-none">Quick daily check-ins <span className="text-muted-foreground text-xs ml-2">({date})</span></summary>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Wake"><input type="time" value={entry?.wake_time ?? ""} onChange={(e) => upsert.mutate({ wake_time: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
            <Field label="Sleep"><input type="time" value={entry?.sleep_time ?? ""} onChange={(e) => upsert.mutate({ sleep_time: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
            <Field label="Deep work (hrs)"><input type="number" step="0.5" value={entry?.deep_work_hours ?? 0} onChange={(e) => upsert.mutate({ deep_work_hours: +e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
            <Field label="Applications"><input type="number" value={entry?.applications_count ?? 0} onChange={(e) => upsert.mutate({ applications_count: +e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
            <Field label="Productivity"><input type="number" min={1} max={10} value={entry?.productivity_score ?? ""} onChange={(e) => upsert.mutate({ productivity_score: +e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" /></Field>
            <Field label="Mood & Energy">
              <div className="flex flex-wrap gap-2 mt-0.5">
                {MOODS.map((m) => {
                  const isActive = entry?.mood === m.label;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => {
                        upsert.mutate({ mood: isActive ? "" : m.label });
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                        isActive
                          ? `${m.bg} ${m.border} ${m.color} ring-1 ring-offset-1 ring-offset-background scale-105 shadow-sm`
                          : "bg-muted border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <span className="text-base leading-none">{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {CHECKS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!(entry as any)?.[key]} onChange={(e) => upsert.mutate({ [key]: e.target.checked })} className="h-4 w-4 rounded border-border accent-[var(--color-primary)]" />
                {label}
              </label>
            ))}
          </div>
        </div>
      </details>

      {/* Mood Quote Card */}
      {entry?.mood && (() => {
        const m = MOODS.find((x) => x.label === entry.mood);
        if (!m) return null;
        return (
          <div className={cn("card-flat p-5 border-l-4 animate-fade-in", m.border)}>
            <div className="flex items-start gap-3">
              <div className={cn("text-3xl select-none", m.color)}>{m.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Quote className="h-4 w-4 text-primary opacity-60" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label} Vibes</span>
                </div>
                <blockquote className="text-sm font-medium leading-relaxed text-foreground mb-2">
                  "{m.quote}"
                </blockquote>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">— {m.author}</span>
                </div>
                <div className={cn("mt-3 p-3 rounded-lg text-xs", m.bg, m.color)}>
                  <span className="font-semibold">Tip:</span> {m.tip}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <AIPanels date={date} entry={entry} blocks={blocks} monthEntries={monthEntries} onBlocksAdded={() => qc.invalidateQueries({ queryKey: ["blocks"] })} />
    </div>
  );
}

function AIPanels({ date, entry, blocks, monthEntries, onBlocksAdded }: any) {
  const { user } = useAuth();
  const plan = useServerFn(aiDailyPlan);
  const overload = useServerFn(aiOverload);
  const [planning, setPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [overloading, setOverloading] = useState(false);
  const [overloadResult, setOverloadResult] = useState<any>(null);

  const runPlan = async () => {
    setPlanning(true);
    try {
      const ctx = `Date: ${date}\nWake: ${entry?.wake_time || "—"}, Sleep: ${entry?.sleep_time || "—"}\nMood: ${entry?.mood || "—"}, Productivity goal: ${entry?.productivity_score || "—"}\nExisting blocks: ${blocks.map((b: any) => `${b.start_time?.slice(0,5)}-${b.end_time?.slice(0,5)} ${b.task} (${b.category})`).join("; ") || "none"}\nNotes: ${entry?.notes || ""}\nGenerate 5-7 time blocks covering DSA, job apps, and at least one break.`;
      const r = await plan({ data: { context: ctx } });
      setPlanResult(r);
    } catch (e: any) { toast.error(e.message); }
    setPlanning(false);
  };

  const insertBlocks = async () => {
    if (!planResult?.blocks) return;
    for (const b of planResult.blocks) {
      await supabase.from("time_blocks").insert({ user_id: user!.id, date, start_time: b.start_time, end_time: b.end_time, task: b.task, category: b.category });
    }
    toast.success("Plan added to your blocks");
    setPlanResult(null);
    onBlocksAdded();
  };

  const runOverload = async () => {
    setOverloading(true);
    try {
      const summary = monthEntries.slice(0, 14).map((e: any) => `${e.date}: mood=${e.mood || "?"}, prod=${e.productivity_score ?? "?"}, deep=${e.deep_work_hours ?? 0}h, sleep=${e.sleep_time || "?"}, wake=${e.wake_time || "?"}, apps=${e.applications_count ?? 0}`).join("\n");
      const r = await overload({ data: { context: `Last 14 days:\n${summary}` } });
      setOverloadResult(r);
    } catch (e: any) { toast.error(e.message); }
    setOverloading(false);
  };

  const riskTone = overloadResult?.risk === "high" ? "destructive" : overloadResult?.risk === "medium" ? "warning" : "success";

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <AICard title="AI Daily Planner" description="Smart blocks tailored to today's mood and existing schedule." onRun={runPlan} loading={planning} cta="Plan my day">
        {planResult && (
          <div className="space-y-2">
            <p className="text-sm">{planResult.summary}</p>
            <div className="space-y-1">
              {planResult.blocks?.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border border-border">
                  <span className="font-mono text-muted-foreground w-20">{b.start_time}–{b.end_time}</span>
                  <span className="flex-1">{b.task}</span>
                  <span className="text-[10px] px-1.5 h-5 rounded bg-muted inline-flex items-center">{b.category}</span>
                </div>
              ))}
            </div>
            <button onClick={insertBlocks} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Add to my blocks</button>
          </div>
        )}
      </AICard>

      <AICard title="Overload Detector" description="Spot burnout before it hits. Uses last 14 days." onRun={runOverload} loading={overloading} cta="Check me">
        {overloadResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 text-${riskTone}`} />
              <span className="text-sm font-medium capitalize">{overloadResult.risk} risk</span>
            </div>
            <ScoreBar value={overloadResult.score} label="Overload score" tone={riskTone as any} />
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">{overloadResult.signals?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            <p className="text-sm">{overloadResult.advice}</p>
          </div>
        )}
      </AICard>
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
