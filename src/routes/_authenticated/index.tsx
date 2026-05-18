import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, startOfWeek, addDays, differenceInDays, subDays } from "date-fns";
import { Flame, CheckCircle2, Briefcase, Code2, Clock, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

const MOODS = [
  { v: "Tired", e: "😴" }, { v: "Okay", e: "😐" },
  { v: "Focused", e: "⚡" }, { v: "Motivated", e: "🔥" },
];

const CHECK_FIELDS = ["dsa_done","aptitude_done","sql_done","devops_done","qa_done","mock_done","revision_done","linkedin_post"] as const;

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: profile } = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: todayEntry } = useQuery({
    queryKey: ["daily", user!.id, today],
    queryFn: async () => {
      const { data } = await supabase.from("daily_tracker").select("*").eq("user_id", user!.id).eq("date", today).maybeSingle();
      return data;
    },
  });

  const { data: weekEntries = [] } = useQuery({
    queryKey: ["daily-week", user!.id],
    queryFn: async () => {
      const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const { data } = await supabase.from("daily_tracker").select("date,dsa_done,aptitude_done,sql_done,devops_done,qa_done,mock_done,revision_done,linkedin_post,applications_count")
        .eq("user_id", user!.id).gte("date", start);
      return data ?? [];
    },
  });

  const { data: todayBlocks = [] } = useQuery({
    queryKey: ["blocks", user!.id, today],
    queryFn: async () => {
      const { data } = await supabase.from("time_blocks").select("*").eq("user_id", user!.id).eq("date", today).order("start_time");
      return data ?? [];
    },
  });

  const upsertDaily = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("daily_tracker").upsert({ user_id: user!.id, date: today, ...todayEntry, ...patch }, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily"] }); qc.invalidateQueries({ queryKey: ["daily-week"] }); },
  });

  const toggleBlock = useMutation({
    mutationFn: async (b: any) => {
      const next = b.status === "done" ? "planned" : "done";
      await supabase.from("time_blocks").update({ status: next }).eq("id", b.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const todayPct = useMemo(() => {
    if (!todayEntry) return 0;
    const done = CHECK_FIELDS.filter((f) => (todayEntry as any)[f]).length;
    return Math.round((done / CHECK_FIELDS.length) * 100);
  }, [todayEntry]);

  const placementDate = profile?.placement_start_date;
  const daysToPlacement = placementDate ? differenceInDays(new Date(placementDate), new Date()) : null;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = format(d, "yyyy-MM-dd");
    const entry = weekEntries.find((e: any) => e.date === key);
    const done = entry ? CHECK_FIELDS.filter((f) => (entry as any)[f]).length : 0;
    return { label: format(d, "EEE"), date: key, pct: Math.round((done / CHECK_FIELDS.length) * 100) };
  });

  const monthlyApps = weekEntries.reduce((s: number, e: any) => s + (e.applications_count ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Placement Countdown" value={daysToPlacement !== null ? `${daysToPlacement}` : "—"} sub={daysToPlacement !== null ? "days to go" : <Link to="/settings" className="text-primary hover:underline">Set target date</Link>} icon={Flame} />
        <StatCard label="Today's Consistency" value={`${todayPct}%`} sub={`${CHECK_FIELDS.filter((f) => (todayEntry as any)?.[f]).length}/${CHECK_FIELDS.length} done`} icon={CheckCircle2} progress={todayPct} />
        <StatCard label="DSA This Week" value={`0/${profile?.daily_dsa_target ?? 5 * 7}`} sub="problems solved" icon={Code2} />
        <StatCard label="Applications" value={`${monthlyApps}`} sub="this week" icon={Briefcase} />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Today's Focus Blocks" action={<Link to="/planner" className="text-xs text-primary hover:underline">Open planner</Link>}>
            {todayBlocks.length === 0 ? (
              <EmptyHint icon={Clock} text="No blocks planned for today." actionTo="/planner" actionLabel="Plan today" />
            ) : (
              <div className="space-y-2">
                {todayBlocks.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border">
                    <button onClick={() => toggleBlock.mutate(b)} className={`h-4 w-4 rounded border ${b.status === "done" ? "bg-primary border-primary" : "border-border"}`}>
                      {b.status === "done" && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <span className="text-xs text-muted-foreground font-mono w-20">{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</span>
                    <span className={`text-sm flex-1 ${b.status === "done" ? "line-through text-muted-foreground" : ""}`}>{b.task}</span>
                    {b.category && <Pill tone="neutral">{b.category}</Pill>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Upcoming Interviews">
            <EmptyHint icon={Briefcase} text="Job Tracker is coming in the next phase — once added, scheduled interviews will appear here." />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Mood & Energy">
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map((m) => (
                <button key={m.v} onClick={() => upsertDaily.mutate({ mood: m.v })}
                  className={`flex flex-col items-center gap-1 py-3 rounded-md border text-xs transition ${todayEntry?.mood === m.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                  <span className="text-lg">{m.e}</span>
                  <span>{m.v}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Quick Add">
            <div className="grid grid-cols-2 gap-2">
              <QuickButton label="Applied" onClick={() => upsertDaily.mutate({ applications_count: (todayEntry?.applications_count ?? 0) + 1 })} />
              <QuickButton label="DSA done" onClick={() => upsertDaily.mutate({ dsa_done: true })} />
              <QuickButton label="SQL done" onClick={() => upsertDaily.mutate({ sql_done: true })} />
              <QuickButton label="LinkedIn post" onClick={() => upsertDaily.mutate({ linkedin_post: true })} />
            </div>
          </Section>
        </div>
      </div>

      {/* Heatmap */}
      <Section title="This Week">
        <div className="flex items-end gap-2">
          {weekDays.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full aspect-square rounded-md border border-border" style={{ background: `color-mix(in oklab, var(--color-primary) ${d.pct}%, transparent)` }} />
              <div className="text-[10px] text-muted-foreground">{d.label}</div>
              <div className="text-[10px] font-medium">{d.pct}%</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, progress }: any) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "destructive" | "info" | "neutral" }) {
  const tones: Record<string,string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
    neutral: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

function EmptyHint({ icon: Icon, text, actionTo, actionLabel }: any) {
  return (
    <div className="py-6 text-center">
      <Icon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
      {actionTo && <Link to={actionTo} className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> {actionLabel}</Link>}
    </div>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-9 rounded-md border border-border text-xs hover:bg-accent transition flex items-center justify-center gap-1">
      <Plus className="h-3 w-3" /> {label}
    </button>
  );
}
