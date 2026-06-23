import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, startOfWeek, addDays, differenceInDays } from "date-fns";
import { Flame, CheckCircle2, Briefcase, Code2, Clock, Plus } from "lucide-react";
import { useReward, BadgeUnlockModal } from "@/hooks/use-reward";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  const { reward, unlocked, closeUnlock } = useReward();
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

  const { data: heatmapEntries = [] } = useQuery({
    queryKey: ["daily-heatmap", user!.id],
    queryFn: async () => {
      const start = format(addDays(new Date(), -83), "yyyy-MM-dd");
      const { data } = await supabase.from("daily_tracker")
        .select("date,dsa_done,aptitude_done,sql_done,devops_done,qa_done,mock_done,revision_done,linkedin_post,applications_count,mood,notes")
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
      return patch;
    },
    onSuccess: (patch) => {
      qc.invalidateQueries({ queryKey: ["daily"] });
      qc.invalidateQueries({ queryKey: ["daily-week"] });
      // Award XP only when toggling a check from false → true
      const togglesOn: Record<string, number> = {
        dsa_done: 20, aptitude_done: 15, sql_done: 15, devops_done: 15,
        qa_done: 15, mock_done: 30, revision_done: 10, linkedin_post: 25,
      };
      for (const [k, xp] of Object.entries(togglesOn)) {
        if (patch[k] === true && !(todayEntry as any)?.[k]) {
          reward(k, xp, { confetti: false });
          break;
        }
      }
      if (typeof patch.applications_count === "number" && patch.applications_count > ((todayEntry as any)?.applications_count ?? 0)) {
        reward("daily_apply_increment", 10, { confetti: false });
      }
    },
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

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 84-day GitHub-style heatmap (12 weeks × 7 days, Mon-start)
  type DayEntry = {
    dsa_done: boolean; aptitude_done: boolean; sql_done: boolean; devops_done: boolean;
    qa_done: boolean; mock_done: boolean; revision_done: boolean; linkedin_post: boolean;
    applications_count: number; mood: string | null; notes: string | null;
  };
  const heatmap = useMemo(() => {
    const entryMap = new Map<string, DayEntry>();
    for (const e of heatmapEntries as any[]) {
      const prev = entryMap.get(e.date);
      const merged: DayEntry = {
        dsa_done: !!(prev?.dsa_done || e.dsa_done),
        aptitude_done: !!(prev?.aptitude_done || e.aptitude_done),
        sql_done: !!(prev?.sql_done || e.sql_done),
        devops_done: !!(prev?.devops_done || e.devops_done),
        qa_done: !!(prev?.qa_done || e.qa_done),
        mock_done: !!(prev?.mock_done || e.mock_done),
        revision_done: !!(prev?.revision_done || e.revision_done),
        linkedin_post: !!(prev?.linkedin_post || e.linkedin_post),
        applications_count: (prev?.applications_count ?? 0) + (e.applications_count ?? 0),
        mood: e.mood ?? prev?.mood ?? null,
        notes: e.notes ?? prev?.notes ?? null,
      };
      entryMap.set(e.date, merged);
    }
    const pctOf = (e?: DayEntry) =>
      e ? Math.round((CHECK_FIELDS.filter((f) => (e as any)[f]).length / CHECK_FIELDS.length) * 100) : 0;
    const today = new Date();
    const lastMonday = startOfWeek(today, { weekStartsOn: 1 });
    const firstMonday = addDays(lastMonday, -11 * 7);
    const weeks: { date: string; pct: number; future: boolean; entry?: DayEntry }[][] = [];
    for (let w = 0; w < 12; w++) {
      const col: { date: string; pct: number; future: boolean; entry?: DayEntry }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = addDays(firstMonday, w * 7 + d);
        const key = format(day, "yyyy-MM-dd");
        const entry = entryMap.get(key);
        col.push({ date: key, pct: pctOf(entry), future: day > today, entry });
      }
      weeks.push(col);
    }
    // current streak: consecutive days back from today with pct > 0
    let streak = 0;
    for (let i = 0; i < 84; i++) {
      const key = format(addDays(today, -i), "yyyy-MM-dd");
      if (pctOf(entryMap.get(key)) > 0) streak++;
      else if (i > 0) break;
      else break;
    }
    let activeDays = 0;
    entryMap.forEach((e) => { if (pctOf(e) > 0) activeDays++; });
    return { weeks, streak, activeDays, entryMap };
  }, [heatmapEntries]);

  const selectedEntry = selectedDay ? heatmap.entryMap.get(selectedDay) : undefined;
  const selectedPct = selectedEntry
    ? Math.round((CHECK_FIELDS.filter((f) => (selectedEntry as any)[f]).length / CHECK_FIELDS.length) * 100)
    : 0;
  const CHECK_LABELS: Record<string, string> = {
    dsa_done: "DSA", aptitude_done: "Aptitude", sql_done: "SQL", devops_done: "DevOps",
    qa_done: "QA", mock_done: "Mock interview", revision_done: "Revision", linkedin_post: "LinkedIn post",
  };



  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <BadgeUnlockModal badge={unlocked} onClose={closeUnlock} />
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

          <Section title="Upcoming Interviews" action={<Link to="/jobs" className="text-xs text-primary hover:underline">Job tracker</Link>}>
            <UpcomingInterviews userId={user!.id} />
          </Section>

          <Section title="Upcoming Events" action={<Link to="/calendar" className="text-xs text-primary hover:underline">Calendar</Link>}>
            <UpcomingEvents userId={user!.id} />
          </Section>

          <Section title="Weekly Challenges" action={<Link to="/challenges" className="text-xs text-primary hover:underline">All</Link>}>
            <ActiveChallenges userId={user!.id} />
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

          <Section
            title="Daily Streak"
            action={
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-success" />
                <span className="font-medium text-foreground">{heatmap.streak}</span> day{heatmap.streak === 1 ? "" : "s"}
              </span>
            }
          >
            <div className="flex gap-[3px]" aria-label="Last 84 days of activity">
              {heatmap.weeks.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((cell) => {
                    const bucket = cell.future ? -1 : cell.pct === 0 ? 0 : cell.pct < 25 ? 1 : cell.pct < 50 ? 2 : cell.pct < 75 ? 3 : 4;
                    const cls =
                      bucket === -1 ? "bg-transparent" :
                      bucket === 0 ? "bg-muted/60" :
                      bucket === 1 ? "bg-success/25" :
                      bucket === 2 ? "bg-success/50" :
                      bucket === 3 ? "bg-success/75" :
                      "bg-success";
                    const isSelected = selectedDay === cell.date;
                    const dateLabel = format(new Date(cell.date), "EEE, MMM d, yyyy");
                    const tip = cell.future
                      ? `${dateLabel} — upcoming`
                      : cell.pct === 0
                      ? `${dateLabel} — no activity`
                      : `${dateLabel} — active · ${cell.pct}% done`;
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        disabled={cell.future}
                        onClick={() => setSelectedDay(isSelected ? null : cell.date)}
                        title={tip}
                        aria-label={tip}
                        className={`h-[11px] w-[11px] rounded-[3px] ${cls} transition outline-none ${
                          cell.future ? "cursor-default" : "hover:ring-1 hover:ring-foreground/40 cursor-pointer"
                        } ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{heatmap.activeDays} active days · last 12 weeks</span>
              <div className="inline-flex items-center gap-1">
                <span>Less</span>
                <span className="h-[11px] w-[11px] rounded-[3px] bg-muted/60" />
                <span className="h-[11px] w-[11px] rounded-[3px] bg-success/25" />
                <span className="h-[11px] w-[11px] rounded-[3px] bg-success/50" />
                <span className="h-[11px] w-[11px] rounded-[3px] bg-success/75" />
                <span className="h-[11px] w-[11px] rounded-[3px] bg-success" />
                <span>More</span>
              </div>
            </div>

            {selectedDay && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium">
                    {format(new Date(selectedDay), "EEEE, MMM d, yyyy")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
                {!selectedEntry ? (
                  <p className="text-xs text-muted-foreground">No activity logged on this day.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Pill tone={selectedPct >= 75 ? "success" : selectedPct >= 25 ? "info" : "neutral"}>
                        {selectedPct}% done
                      </Pill>
                      {selectedEntry.applications_count > 0 && (
                        <Pill tone="info">{selectedEntry.applications_count} application{selectedEntry.applications_count === 1 ? "" : "s"}</Pill>
                      )}
                      {selectedEntry.mood && <Pill tone="neutral">Mood: {selectedEntry.mood}</Pill>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CHECK_FIELDS.filter((f) => (selectedEntry as any)[f]).map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[11px] bg-success/15 text-success">
                          <CheckCircle2 className="h-3 w-3" /> {CHECK_LABELS[f]}
                        </span>
                      ))}
                      {CHECK_FIELDS.every((f) => !(selectedEntry as any)[f]) && (
                        <span className="text-[11px] text-muted-foreground">No tasks ticked.</span>
                      )}
                    </div>
                    {selectedEntry.notes && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                        “{selectedEntry.notes}”
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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

function UpcomingInterviews({ userId }: { userId: string }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const in14 = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const { data = [] } = useQuery({
    queryKey: ["upcoming-interviews", userId],
    queryFn: async () => (await supabase.from("jobs").select("id,company,role,deadline,status").eq("user_id", userId).gte("deadline", today).lte("deadline", in14).in("status", ["applied", "interview", "oa"]).order("deadline")).data ?? [],
  });
  if (data.length === 0) return <EmptyHint icon={Briefcase} text="No interviews scheduled. Add a date in the Job Tracker." actionTo="/jobs" actionLabel="Open Job Tracker" />;
  return (
    <div className="space-y-2">
      {data.map((j: any) => {
        const days = differenceInDays(new Date(j.deadline), new Date());
        const tone: any = days <= 2 ? "destructive" : days <= 5 ? "warning" : "neutral";
        const lbl = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`;
        return (
          <div key={j.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border text-sm">
            <span className="flex-1 truncate"><b>{j.company}</b> · <span className="text-muted-foreground">{j.role}</span></span>
            <span className="text-xs text-muted-foreground">{j.deadline}</span>
            <Pill tone={tone}>{lbl}</Pill>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingEvents({ userId }: { userId: string }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data = [] } = useQuery({
    queryKey: ["upcoming-events", userId],
    queryFn: async () => (await (supabase as any).from("placement_events").select("*").eq("user_id", userId).gte("event_date", today).order("event_date").limit(5)).data ?? [],
  });
  if (data.length === 0) return <EmptyHint icon={Clock} text="No events scheduled. Add one to your Calendar." actionTo="/calendar" actionLabel="Open Calendar" />;
  return (
    <div className="space-y-2">
      {data.map((e: any) => {
        const days = differenceInDays(new Date(e.event_date), new Date());
        return (
          <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border text-sm">
            <span className="flex-1 truncate"><b>{e.event_name}</b>{e.company && <span className="text-muted-foreground"> · {e.company}</span>}</span>
            <Pill tone="info">{e.event_type}</Pill>
            <span className="text-xs text-muted-foreground">{days === 0 ? "Today" : `${days}d`}</span>
            {e.registration_url && <a href={e.registration_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Register</a>}
          </div>
        );
      })}
    </div>
  );
}

function ActiveChallenges({ userId }: { userId: string }) {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data = [] } = useQuery({
    queryKey: ["active-challenges", userId, weekStart],
    queryFn: async () => {
      const { data: challenges } = await (supabase as any).from("weekly_challenges").select("*").eq("active", true).eq("week_start_date", weekStart).limit(2);
      if (!challenges?.length) return [];
      const ids = challenges.map((c: any) => c.id);
      const { data: progress } = await (supabase as any).from("user_challenge_progress").select("*").eq("user_id", userId).in("challenge_id", ids);
      return challenges.map((c: any) => {
        const p = progress?.find((x: any) => x.challenge_id === c.id);
        return { ...c, current: p?.current_count ?? 0, completed: p?.completed ?? false };
      });
    },
  });
  if (data.length === 0) return <EmptyHint icon={CheckCircle2} text="No challenges this week. Check back soon." />;
  return (
    <div className="space-y-3">
      {data.map((c: any) => {
        const pct = Math.min(100, Math.round((c.current / c.target_count) * 100));
        return (
          <div key={c.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{c.title}</span>
              <span className="text-xs text-muted-foreground">{c.current}/{c.target_count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
            {c.completed && <div className="text-[11px] text-success">+{c.xp_reward} XP unlocked ✓</div>}
          </div>
        );
      })}
    </div>
  );
}

