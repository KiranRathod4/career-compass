import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useXP } from "@/hooks/use-gamification";
import {
  ChevronRight, UserPlus, Trophy, Flame, Zap, Shield, Crown,
  Swords, Target, Sparkles, Radio, Lock,
} from "lucide-react";
import {
  IconMathSprint, IconDailyPuzzles, IconUnscramble, IconMemory, IconLogicGrid, IconDuel,
} from "./icons";
import { toast } from "sonner";

export type GameKey = "puzzles" | "math" | "unscramble" | "memory" | "logic" | "duel";

export function ArenaHome({ onPick }: { onPick: (g: GameKey) => void }) {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const today = now.toISOString().slice(0, 10);
  const { data: levelInfo } = useXP();

  const { data: attempts } = useQuery({
    queryKey: ["puzzle-attempts-home", today, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("daily_puzzle_attempts").select("correct").eq("user_id", user!.id).eq("puzzle_date", today);
      return data ?? [];
    },
  });

  const { data: streak } = useQuery({
    queryKey: ["arena-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_streaks").select("daily_current,daily_longest").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["arena-leaderboard-home"],
    queryFn: async () => {
      const ws = weekStart();
      const { data } = await (supabase as any).from("arena_leaderboard").select("user_id, total_arena_xp, puzzle_score, math_sprint_best").eq("week_start", ws).order("total_arena_xp", { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["arena-leaderboard-profiles", leaderboard?.map((r: any) => r.user_id).join(",")],
    enabled: (leaderboard?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = leaderboard!.map((r: any) => r.user_id);
      const { data } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      const m: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p; });
      return m;
    },
  });

  const done = attempts?.length ?? 0;
  const target = 5;
  const tomorrow = new Date(now); tomorrow.setHours(24, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const ch = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const cm = String(Math.floor((diff / 60000) % 60)).padStart(2, "0");
  const cs = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");

  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0]?.toUpperCase();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Operative";

  const level = levelInfo?.level ?? 1;
  const xp = levelInfo?.xp ?? 0;
  const xpProg = levelInfo?.progress_pct ?? 0;
  const xpNext = levelInfo?.next_threshold ?? 500;
  const league = useMemo(() => leagueFor(level), [level]);
  const streakDays = streak?.daily_current ?? 0;

  const myRank = useMemo(() => {
    if (!leaderboard) return null;
    const i = leaderboard.findIndex((r: any) => r.user_id === user?.id);
    return i === -1 ? null : i + 1;
  }, [leaderboard, user]);

  return (
    <div className="max-w-6xl mx-auto space-y-7 relative">
      {/* ===== COMMAND CENTER HERO ===== */}
      <div className="relative arena-neon-card p-0">
        <div className="absolute inset-0 arena-radial-glow pointer-events-none" />
        <div className="absolute inset-0 arena-grid-bg opacity-60 pointer-events-none" />

        <div className="relative p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center">
          {/* Avatar block */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl arena-pulse" />
              <div className="h-20 w-20 rounded-2xl arena-hex flex items-center justify-center text-3xl font-black text-white"
                   style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
                {initial}
              </div>
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] flex items-center justify-center">
                <Radio className="h-3 w-3 text-white" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="arena-chip"><Crown className="h-3 w-3" /> {league.name}</span>
                <span className="text-[10px] arena-mono text-emerald-400 arena-spark">● LIVE</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight leading-none">{displayName}</h1>
              <p className="text-xs text-zinc-500 mt-1 arena-mono">RANK {myRank ? `#${myRank}` : "UNRANKED"} · OPERATIVE ID {(user?.id ?? "").slice(0, 6).toUpperCase()}</p>
            </div>
          </div>

          {/* XP / Level bar */}
          <div className="min-w-0">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Level</span>
                <span className="text-3xl font-black text-white arena-mono">{level}</span>
                <span className="text-sm text-zinc-400">{levelInfo?.name}</span>
              </div>
              <div className="arena-mono text-xs text-zinc-400">
                <span className="text-[#a78bfa] font-bold">{xp.toLocaleString()}</span>
                <span className="text-zinc-600"> / {xpNext.toLocaleString()} XP</span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-zinc-900 border border-white/5 overflow-hidden arena-xpbar">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${xpProg}%`, background: "linear-gradient(90deg,#7c3aed,#8b5cf6 40%,#2563eb 80%,#06b6d4)" }} />
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#a78bfa]" /> Placement Score <span className="arena-mono font-bold text-white">{Math.min(99, Math.round(xp / 100))}</span></span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-400" /> Season <span className="arena-mono font-bold text-white">S{seasonNum()}</span></span>
            </div>
          </div>

          {/* Streak block */}
          <div className="flex flex-col items-center justify-center px-5 py-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-red-500/5 border border-amber-500/30 min-w-[140px]">
            <Flame className="h-8 w-8 text-amber-400 arena-flame-icon" />
            <div className="arena-mono text-3xl font-black text-white mt-1">{streakDays}</div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300/80 mt-0.5">Day Streak</div>
            <div className="text-[10px] text-zinc-500 mt-1">Best {streak?.daily_longest ?? 0}</div>
          </div>
        </div>

        <div className="arena-divider-glow" />

        {/* Squad rail */}
        <div className="relative px-6 sm:px-8 py-4 flex items-center gap-4 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 shrink-0 mr-2">Squad</span>
          <SquadSlot label="YOU" initial={initial} primary online />
          {[1, 2, 3, 4].map((i) => <SquadSlot key={i} label={`pod${i}`} initial={`P${i}`} online={i < 3} />)}
          <button onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success("Invite link copied"); }}
                  className="shrink-0 h-11 w-11 rounded-xl border border-dashed border-[#7c3aed]/60 flex items-center justify-center text-[#a78bfa] hover:bg-[#7c3aed]/15 hover:border-[#7c3aed] transition">
            <UserPlus className="h-4 w-4" />
          </button>
          <span className="text-[11px] text-zinc-500 shrink-0">Recruit a friend →</span>
        </div>
      </div>

      {/* ===== DAILY MISSION HUD ===== */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        <div className="arena-neon-card p-5 relative" style={{ ["--arena-accent" as any]: "rgba(124,58,237,0.6)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[#a78bfa]" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">Daily Mission</span>
              <span className="arena-chip" style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.4)", color: "#fbbf24" }}>+250 XP</span>
            </div>
            <div className="arena-mono text-xs text-zinc-500">{done}/{target} OBJECTIVES</div>
          </div>
          <p className="text-sm font-semibold mb-3">Clear {target} arena drops before reset</p>
          <div className="h-2 rounded-full bg-zinc-900 overflow-hidden arena-xpbar">
            <div className="h-full transition-all duration-500"
                 style={{ width: `${Math.min(100, (done / target) * 100)}%`, background: "linear-gradient(90deg,#10b981,#7c3aed)" }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <MissionPill label="3 puzzles" done={Math.min(done, 3) >= 3} />
            <MissionPill label="1 math sprint" done={done >= 4} />
            <MissionPill label="1 memory run" done={done >= 5} />
          </div>
        </div>

        <div className="arena-neon-card p-5 flex flex-col items-center justify-center min-w-[180px]"
             style={{ ["--arena-accent" as any]: "rgba(16,185,129,0.6)" }}>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Reset In</div>
          <div className="arena-mono text-3xl font-black text-emerald-400 tabular-nums">{ch}:{cm}:{cs}</div>
          <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> New drops 00:00</div>
        </div>
      </div>

      {/* ===== ARENAS GRID ===== */}
      <div>
        <SectionHeader title="Battle Arenas" subtitle="Pick your weapon · earn XP · climb leagues" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ArenaCard onClick={() => onPick("puzzles")} title="Daily Puzzles" tag="DROP" accent="#7c3aed" icon={<IconDailyPuzzles />} xp="+50" players="2.1k" />
          <ArenaCard onClick={() => onPick("math")} title="Math Sprint" tag="60s BLITZ" accent="#f59e0b" icon={<IconMathSprint />} xp="+80" players="1.4k" />
          <ArenaCard onClick={() => onPick("unscramble")} title="Code Vocab" tag="WORDS" accent="#0d9488" icon={<IconUnscramble />} xp="+40" players="980" />
          <ArenaCard onClick={() => onPick("memory")} title="Memory Vault" tag="RECALL" accent="#db2777" icon={<IconMemory />} xp="+60" players="1.1k" />
          <ArenaCard onClick={() => onPick("logic")} title="Logic Grid" tag="PUZZLE" accent="#2563eb" icon={<IconLogicGrid />} xp="+90" players="640" />
          <FeaturedDuelCard onClick={() => onPick("duel")} />
        </div>
      </div>

      {/* ===== LEADERBOARD ===== */}
      <div className="arena-neon-card p-5" style={{ ["--arena-accent" as any]: "rgba(245,158,11,0.5)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">Top Operatives · This Week</h3>
          </div>
          <span className="text-[10px] arena-mono text-zinc-500">SEASON {seasonNum()} · LIVE</span>
        </div>
        <div className="space-y-1.5">
          {(leaderboard ?? []).map((row: any, i: number) => {
            const p = (profiles ?? {})[row.user_id];
            const isYou = row.user_id === user?.id;
            return <LeaderRow key={row.user_id} rank={i + 1} name={p?.full_name || p?.username || "Operative"} xp={row.total_arena_xp} isYou={isYou} />;
          })}
          {(!leaderboard || leaderboard.length === 0) && (
            <div className="text-center py-8">
              <Lock className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No operatives ranked yet. Drop into an arena.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Swords className="h-5 w-5 text-[#a78bfa]" /> {title}
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function SquadSlot({ label, initial, online, primary }: { label: string; initial: string; online?: boolean; primary?: boolean }) {
  return (
    <div className="shrink-0 flex flex-col items-center gap-1">
      <div className="relative">
        <div className={`h-11 w-11 rounded-xl arena-hex flex items-center justify-center text-xs font-bold ${primary ? "text-white" : "text-zinc-300"}`}
             style={{ background: primary ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "#1a1a24", border: primary ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
          {initial}
        </div>
        {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0f]" />}
      </div>
      <span className="text-[9px] text-zinc-500 uppercase tracking-wider truncate max-w-[3rem]">{label}</span>
    </div>
  );
}

function MissionPill({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`text-[10px] arena-mono px-2.5 py-1 rounded-full border ${done ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-zinc-900/60 border-white/5 text-zinc-500"}`}>
      {done ? "✓ " : "○ "}{label}
    </span>
  );
}

function ArenaCard({ onClick, title, tag, accent, icon, xp, players }: { onClick: () => void; title: string; tag: string; accent: string; icon: any; xp: string; players: string }) {
  return (
    <button onClick={onClick}
            className="arena-neon-card text-left group relative"
            style={{ ["--arena-accent" as any]: accent }}>
      <span className="absolute top-3 left-3 z-10 arena-chip" style={{ background: `${accent}1f`, borderColor: `${accent}66`, color: accent }}>
        {tag}
      </span>
      <span className="absolute top-3 right-3 z-10 text-[10px] arena-mono text-zinc-400 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 arena-spark" /> {players}
      </span>

      <div className="h-44 flex items-center justify-center relative"
           style={{ background: `radial-gradient(circle at center, ${accent}22, transparent 70%)` }}>
        <div className="arena-float">{icon}</div>
        <div className="absolute inset-x-0 bottom-0 h-px arena-divider-glow" />
      </div>

      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black tracking-tight">{title}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Zap className="h-3 w-3" style={{ color: accent }} />
            <span className="text-[10px] arena-mono font-bold" style={{ color: accent }}>{xp} XP</span>
            <span className="text-[10px] text-zinc-600">· instant</span>
          </div>
        </div>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center transition group-hover:translate-x-0.5"
             style={{ background: `${accent}1f`, color: accent }}>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

function FeaturedDuelCard({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
            className="arena-neon-card text-left group relative sm:col-span-2 lg:col-span-1"
            style={{ ["--arena-accent" as any]: "#f59e0b" }}>
      <span className="absolute top-3 left-3 z-10 arena-chip" style={{ background: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.5)", color: "#fbbf24" }}>
        ⚔ LIVE EVENT
      </span>
      <div className="h-44 flex items-center justify-center relative"
           style={{ background: "radial-gradient(circle at center, rgba(245,158,11,0.28), transparent 65%), radial-gradient(circle at 80% 30%, rgba(239,68,68,0.18), transparent 50%)" }}>
        <div className="arena-float"><IconDuel /></div>
      </div>
      <div className="p-4 flex items-center justify-between border-t border-white/5">
        <div>
          <h3 className="text-base font-black tracking-tight flex items-center gap-2">
            Aptitude Duel <span className="text-[9px] arena-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">1v1</span>
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] arena-mono font-bold text-amber-400">+150 XP</span>
            <span className="text-[10px] text-zinc-600">· winner takes</span>
          </div>
        </div>
        <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:translate-x-0.5 transition">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

function LeaderRow({ rank, name, xp, isYou }: { rank: number; name: string; xp: number; isYou: boolean }) {
  const tier = rank === 1 ? { c: "#fbbf24", g: "linear-gradient(135deg,#f59e0b,#d97706)", ic: <Crown className="h-3.5 w-3.5" /> }
            : rank === 2 ? { c: "#e4e4e7", g: "linear-gradient(135deg,#a1a1aa,#71717a)", ic: <Trophy className="h-3.5 w-3.5" /> }
            : rank === 3 ? { c: "#fb923c", g: "linear-gradient(135deg,#c2410c,#9a3412)", ic: <Trophy className="h-3.5 w-3.5" /> }
            : { c: "#6b7280", g: "transparent", ic: null };
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl bg-[#11131880] border ${isYou ? "border-[#7c3aed]/50" : "border-white/5"} hover:border-white/15 transition`}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black arena-mono"
           style={{ background: tier.g === "transparent" ? "#1a1a24" : tier.g, color: rank <= 3 ? "white" : tier.c }}>
        {rank}
      </div>
      <div className="h-8 w-8 rounded-full bg-[#7c3aed]/25 flex items-center justify-center text-[11px] font-bold">
        {(name[0] || "?").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate flex items-center gap-2">
          {name}
          {isYou && <span className="text-[9px] arena-mono px-1.5 py-0.5 rounded bg-[#7c3aed]/25 text-[#c4b5fd] border border-[#7c3aed]/40">YOU</span>}
          {tier.ic && <span style={{ color: tier.c }}>{tier.ic}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className="arena-mono text-sm font-black" style={{ color: rank <= 3 ? tier.c : "#a78bfa" }}>{xp.toLocaleString()}</div>
        <div className="text-[9px] uppercase tracking-widest text-zinc-600">XP</div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function seasonNum(): number {
  const start = new Date(2026, 0, 1).getTime();
  const months = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 30));
  return Math.max(1, months + 1);
}
function leagueFor(level: number): { name: string } {
  if (level >= 6) return { name: "Mythic" };
  if (level >= 5) return { name: "Diamond" };
  if (level >= 4) return { name: "Platinum" };
  if (level >= 3) return { name: "Gold" };
  if (level >= 2) return { name: "Silver" };
  return { name: "Bronze" };
}
