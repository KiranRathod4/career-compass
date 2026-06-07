import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Crown, Flame, Lock, RefreshCw, Trophy, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { snapshotLeaderboards } from "@/lib/leaderboard.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rankings")({ component: RankingsPage });

type Tab = "study" | "arena";

function RankingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("study");
  const snapshot = useServerFn(snapshotLeaderboards);
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-rank", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("leaderboard_opt_in, college_name, full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const optedIn = (profile as any)?.leaderboard_opt_in === true;
  const weekStart = getWeekStart();

  useEffect(() => {
    if (!optedIn) return;
    snapshot().catch(() => {});
  }, [optedIn]);

  const refresh = async () => {
    setRefreshing(true);
    try { await snapshot(); toast.success("Rank refreshed"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setRefreshing(false); }
  };

  const { data: study } = useQuery({
    queryKey: ["study-leaderboard", weekStart],
    enabled: optedIn,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("study_leaderboard")
        .select("user_id, college_name, dsa_count, apps_count, focus_sessions, mock_tests, tracker_completion_pct, consistency_score")
        .eq("week_start", weekStart)
        .eq("opt_in", true)
        .order("consistency_score", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: arena } = useQuery({
    queryKey: ["arena-leaderboard", weekStart],
    enabled: optedIn,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("arena_leaderboard")
        .select("user_id, total_arena_xp, math_sprint_best, memory_best, duel_wins, puzzle_score")
        .eq("week_start", weekStart)
        .order("total_arena_xp", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const rawRows = tab === "study" ? (study ?? []) : (arena ?? []);
  const userIds = rawRows.map((r: any) => r.user_id);

  const { data: profilesMap } = useQuery({
    queryKey: ["rank-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, username, college_name").in("id", userIds);
      const m: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p; });
      return m;
    },
  });

  if (!optedIn) {
    return (
      <div className="max-w-2xl mx-auto card-flat p-10 text-center">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-semibold">Rankings are locked</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-4">Opt in from Settings to appear on the leaderboard. Your name and college will be shown.</p>
        <Button asChild>
          <Link to="/settings">Open Settings</Link>
        </Button>
      </div>
    );
  }

  const scoreKey = tab === "study" ? "consistency_score" : "total_arena_xp";
  const scoreLabel = tab === "study" ? "XP" : "XP";

  const enriched = rawRows.map((r: any) => ({
    ...r,
    profile: profilesMap?.[r.user_id],
    isMe: r.user_id === user?.id,
    score: Math.round(r[scoreKey] ?? 0),
  }));

  const top3 = enriched.slice(0, 3);
  const rest = enriched.slice(3);
  const myRank = enriched.findIndex((r: any) => r.isMe);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1a1428] via-[#0f0a1f] to-[#1a1428] p-6">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(245,158,11,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(124,58,237,0.25), transparent 40%)" }} />
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="h-6 w-6 text-amber-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hall of Fame</h1>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">Weekly Rankings · Resets Monday</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="border-amber-500/30 hover:bg-amber-500/10">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="relative mt-5 inline-flex p-1 rounded-lg bg-black/40 border border-white/5">
          <TabPill active={tab === "study"} onClick={() => setTab("study")} icon={<Flame className="h-3.5 w-3.5" />} label="Study Arena" />
          <TabPill active={tab === "arena"} onClick={() => setTab("arena")} icon={<Zap className="h-3.5 w-3.5" />} label="Game Arena" />
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="card-flat p-12 text-center text-sm text-muted-foreground">
          No data yet this week. Be the first to claim the throne.
        </div>
      ) : (
        <>
          {/* Podium */}
          <Podium top3={top3} scoreLabel={scoreLabel} />

          {/* Your rank pill */}
          {myRank >= 0 && (
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center font-bold tabular-nums text-primary">
                #{myRank + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Your position this week</div>
                <div className="text-xs text-muted-foreground">{enriched[myRank].score} {scoreLabel} · keep grinding to climb</div>
              </div>
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="space-y-2">
              <div className="section-label px-1">Challengers</div>
              {rest.map((r: any, i: number) => (
                <RankRow key={r.user_id} row={r} rank={i + 4} tab={tab} />
              ))}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">Opt-in only. Turn off in Settings to hide your data.</p>
    </div>
  );
}

function TabPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${active ? "bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-md" : "text-zinc-400 hover:text-white"}`}>
      {icon} {label}
    </button>
  );
}

function Podium({ top3, scoreLabel }: { top3: any[]; scoreLabel: string }) {
  // Order: 2nd, 1st, 3rd visually
  const second = top3[1];
  const first = top3[0];
  const third = top3[2];
  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-3 items-end max-w-2xl mx-auto pt-8">
        <PodiumColumn place={2} row={second} height="h-28" scoreLabel={scoreLabel} />
        <PodiumColumn place={1} row={first} height="h-40" scoreLabel={scoreLabel} />
        <PodiumColumn place={3} row={third} height="h-20" scoreLabel={scoreLabel} />
      </div>
    </div>
  );
}

function PodiumColumn({ place, row, height, scoreLabel }: { place: 1 | 2 | 3; row: any; height: string; scoreLabel: string }) {
  if (!row) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600">—</div>
        <div className={`w-full ${height} rounded-t-xl bg-zinc-900/40 border border-white/5 border-b-0 flex items-start justify-center pt-2 text-zinc-700 font-bold text-2xl tabular-nums`}>{place}</div>
      </div>
    );
  }
  const name = row.profile?.full_name || row.profile?.username || `Player ${row.user_id.slice(0, 4)}`;
  const college = row.profile?.college_name || row.college_name;
  const initial = (name[0] || "?").toUpperCase();

  const styles = {
    1: { ring: "ring-amber-400", glow: "shadow-[0_0_40px_rgba(245,158,11,0.4)]", bg: "from-amber-500 to-amber-700", podium: "from-amber-500/30 to-amber-900/20 border-amber-500/40", label: "text-amber-300", crown: true },
    2: { ring: "ring-zinc-300", glow: "shadow-[0_0_25px_rgba(212,212,216,0.25)]", bg: "from-zinc-300 to-zinc-500", podium: "from-zinc-400/20 to-zinc-700/10 border-zinc-400/30", label: "text-zinc-300", crown: false },
    3: { ring: "ring-amber-700", glow: "shadow-[0_0_20px_rgba(180,83,9,0.3)]", bg: "from-amber-700 to-amber-900", podium: "from-amber-800/20 to-amber-950/10 border-amber-700/30", label: "text-amber-600", crown: false },
  }[place];

  const size = place === 1 ? "h-20 w-20 text-2xl" : "h-16 w-16 text-xl";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {styles.crown && (
          <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 h-7 w-7 text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]" />
        )}
        <div className={`${size} rounded-full bg-gradient-to-br ${styles.bg} ring-4 ${styles.ring} ring-offset-4 ring-offset-background ${styles.glow} flex items-center justify-center font-extrabold text-white`}>
          {initial}
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-gradient-to-br ${styles.bg} border-2 border-background flex items-center justify-center text-xs font-bold text-white`}>
          {place}
        </div>
      </div>
      <div className="text-center min-h-[2.5rem]">
        <div className={`text-sm font-semibold truncate max-w-[8rem] ${row.isMe ? "text-primary" : ""}`}>{row.isMe ? "You" : name}</div>
        {college && <div className="text-[10px] text-muted-foreground truncate max-w-[8rem]">{college}</div>}
      </div>
      <div className={`w-full ${height} rounded-t-xl bg-gradient-to-b ${styles.podium} border border-b-0 flex flex-col items-center justify-start pt-2 gap-1`}>
        <div className={`text-3xl font-extrabold tabular-nums ${styles.label}`}>{place}</div>
        <div className="text-xs font-bold tabular-nums text-white">{row.score}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{scoreLabel}</div>
      </div>
    </div>
  );
}

function RankRow({ row, rank, tab }: { row: any; rank: number; tab: Tab }) {
  const name = row.profile?.full_name || row.profile?.username || `Player ${row.user_id.slice(0, 4)}`;
  const college = row.profile?.college_name || row.college_name;
  const initial = (name[0] || "?").toUpperCase();
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition hover:border-primary/30 ${row.isMe ? "border-primary/40 bg-primary/5" : "border-white/5 bg-card"}`}>
      <div className="w-8 text-center text-sm font-bold tabular-nums text-muted-foreground">{rank}</div>
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/20 flex items-center justify-center font-bold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {row.isMe ? "You" : name}
          {row.isMe && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">YOU</span>}
        </div>
        {college && <div className="text-xs text-muted-foreground truncate">{college}</div>}
      </div>
      {tab === "study" ? (
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
          <span title="DSA"><span className="text-foreground font-semibold">{row.dsa_count}</span> dsa</span>
          <span title="Applications"><span className="text-foreground font-semibold">{row.apps_count}</span> apps</span>
          <span title="Focus"><span className="text-foreground font-semibold">{row.focus_sessions}</span> focus</span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
          <span><span className="text-foreground font-semibold">{row.math_sprint_best}</span> math</span>
          <span><span className="text-foreground font-semibold">{row.memory_best}</span> mem</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 pl-3 border-l border-white/5">
        <Flame className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-sm font-bold tabular-nums text-amber-400">{row.score}</span>
      </div>
    </div>
  );
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
