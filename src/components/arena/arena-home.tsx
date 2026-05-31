import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, UserPlus, Trophy, Medal } from "lucide-react";
import { IconMathSprint, IconDailyPuzzles, IconUnscramble, IconMemory, IconLogicGrid, IconDuel } from "./icons";
import { toast } from "sonner";

export type GameKey = "puzzles" | "math" | "unscramble" | "memory" | "logic" | "duel";

export function ArenaHome({ onPick }: { onPick: (g: GameKey) => void }) {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<"puzzles" | "aptitude">("puzzles");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const today = now.toISOString().slice(0, 10);

  const { data: attempts } = useQuery({
    queryKey: ["puzzle-attempts-home", today, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("daily_puzzle_attempts").select("correct").eq("user_id", user!.id).eq("puzzle_date", today);
      return data ?? [];
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["arena-leaderboard-home"],
    queryFn: async () => {
      const ws = weekStart();
      const { data } = await (supabase as any).from("arena_leaderboard").select("user_id, total_arena_xp, puzzle_score, math_sprint_best").eq("week_start", ws).order("total_arena_xp", { ascending: false }).limit(5);
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

  // Countdown to midnight
  const tomorrow = new Date(now); tomorrow.setHours(24, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const ch = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const cm = String(Math.floor((diff / 60000) % 60)).padStart(2, "0");
  const cs = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");

  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0]?.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Friends row */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <AvatarPill label="YOU" initial={initial} ring online />
        {[1, 2, 3, 4].map((i) => <AvatarPill key={i} label={`pod${i}`} initial={`P${i}`} online={i < 3} dim />)}
        <button onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success("Link copied — share with a friend"); }} className="shrink-0 h-12 w-12 rounded-full border border-dashed border-[#7c3aed]/60 flex items-center justify-center text-[#7c3aed] hover:bg-[#7c3aed]/10"><UserPlus className="h-4 w-4" /></button>
        <span className="text-xs text-zinc-500 shrink-0">Invite a friend →</span>
      </div>

      {/* Daily challenge bar */}
      <div className="arena-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Daily Challenge</div>
            <div className="text-base font-semibold mt-0.5">{done} / {target} complete</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Resets in</div>
            <div className="arena-mono text-lg font-bold text-emerald-400">{ch}:{cm}:{cs}</div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-[#7c3aed] transition-all duration-500" style={{ width: `${Math.min(100, (done / target) * 100)}%` }} />
        </div>
        <div className="flex gap-6 mt-4">
          <TabBtn label="PUZZLES" count={`${Math.min(done, 3)}/3`} active={tab === "puzzles"} onClick={() => setTab("puzzles")} />
          <TabBtn label="APTITUDE" count={`${Math.max(0, done - 3)}/2`} active={tab === "aptitude"} onClick={() => setTab("aptitude")} />
        </div>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GameCard title="DAILY PUZZLES" subtitle="3 questions per day" accent="#7c3aed" onClick={() => onPick("puzzles")} icon={<IconDailyPuzzles />} />
        <GameCard title="MATH SPRINT" subtitle="60s, how many can you solve?" accent="#f59e0b" onClick={() => onPick("math")} icon={<IconMathSprint />} />
        <GameCard title="WORD UNSCRAMBLE" subtitle="Tech vocab" accent="#0d9488" onClick={() => onPick("unscramble")} icon={<IconUnscramble />} />
        <GameCard title="MEMORY" subtitle="Remember the sequence" accent="#db2777" onClick={() => onPick("memory")} icon={<IconMemory />} />
      </div>

      <GameCard
        wide
        title="APTITUDE DUEL"
        subtitle="Challenge a friend — live"
        accent="#f59e0b"
        badge="MULTIPLAYER"
        onClick={() => onPick("duel")}
        icon={<IconDuel />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GameCard title="LOGIC GRID" subtitle="Mini Sudoku style" accent="#2563eb" onClick={() => onPick("logic")} icon={<IconLogicGrid />} />
        <div className="arena-card p-5 flex flex-col justify-between" style={{ background: "#12121a" }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">Duels</div>
            <div className="grid grid-cols-4 gap-2">
              <DuelTypeBtn label="MATH" color="#f59e0b" />
              <DuelTypeBtn label="MEMORY" color="#db2777" />
              <DuelTypeBtn label="APT" color="#7c3aed" />
              <DuelTypeBtn label="LOGIC" color="#2563eb" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="rounded-lg p-3 bg-[#1a1a24] border border-zinc-800">
              <div className="text-xs font-bold uppercase tracking-wide">Sprint Duel</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Race to solve in 60s</div>
            </div>
            <div className="rounded-lg p-3 bg-[#1a1a24] border border-zinc-800">
              <div className="text-xs font-bold uppercase tracking-wide">Fast & First</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">First to answer wins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="arena-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-[#f59e0b]" /> This week's leaderboard</h3>
        </div>
        <div className="space-y-1.5">
          {(leaderboard ?? []).map((row: any, i: number) => {
            const p = (profiles ?? {})[row.user_id];
            const isYou = row.user_id === user?.id;
            const border = i === 0 ? "border-l-[3px] border-l-amber-500" : i === 1 ? "border-l-[3px] border-l-zinc-400" : i === 2 ? "border-l-[3px] border-l-amber-700" : isYou ? "border-l-[3px] border-l-[#7c3aed]" : "border-l-[3px] border-l-transparent";
            return (
              <div key={row.user_id} className={`flex items-center gap-3 p-2.5 rounded-md bg-[#1a1a24] ${border}`}>
                <span className="w-5 text-center arena-mono text-xs text-zinc-500">{i + 1}</span>
                <div className="h-7 w-7 rounded-full bg-[#7c3aed]/30 flex items-center justify-center text-[11px] font-semibold">{(p?.full_name?.[0] || p?.username?.[0] || "?").toUpperCase()}</div>
                <div className="flex-1 text-sm">
                  {p?.full_name || p?.username || "Player"}
                  {isYou && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#7c3aed]/20 text-[#a78bfa]">You</span>}
                </div>
                <div className="arena-mono text-sm font-bold text-[#f59e0b]">{row.total_arena_xp}</div>
                <span className="text-[10px] text-zinc-500">XP</span>
              </div>
            );
          })}
          {(!leaderboard || leaderboard.length === 0) && (
            <p className="text-sm text-zinc-500 text-center py-6">No ranks yet. Play a game to claim a spot.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GameCard({ title, subtitle, accent, onClick, icon, badge, wide }: { title: string; subtitle: string; accent: string; onClick: () => void; icon: any; badge?: string; wide?: boolean }) {
  return (
    <button onClick={onClick} className={`arena-card arena-card-hover text-left overflow-hidden group relative ${wide ? "w-full" : ""}`} style={{ minHeight: 280 }}>
      {badge && <span className="absolute top-3 right-3 z-10 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">{badge}</span>}
      <div className="h-[60%] flex items-center justify-center" style={{ background: `radial-gradient(circle at center, ${accent}18, transparent 70%)`, minHeight: 168 }}>
        {icon}
      </div>
      <div className="p-5 flex items-center justify-between border-t border-white/5">
        <div>
          <h3 className="text-lg font-extrabold tracking-wide">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-white transition" />
      </div>
    </button>
  );
}

function AvatarPill({ label, initial, online, ring, dim }: { label: string; initial: string; online?: boolean; ring?: boolean; dim?: boolean }) {
  return (
    <div className="shrink-0 flex flex-col items-center gap-1">
      <div className="relative">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ${ring ? "ring-2 ring-[#7c3aed] ring-offset-2 ring-offset-[#0a0a0f]" : ""} ${dim ? "bg-zinc-800 text-zinc-400" : "bg-[#7c3aed] text-white"}`}>{initial}</div>
        {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0f]" />}
      </div>
      <span className="text-[10px] text-zinc-400 max-w-[3rem] truncate">{label}</span>
    </div>
  );
}

function TabBtn({ label, count, active, onClick }: { label: string; count: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`pb-2 text-[11px] font-bold uppercase tracking-widest border-b-2 transition ${active ? "border-[#7c3aed] text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
      {label} <span className="ml-1.5 arena-mono opacity-70">{count}</span>
    </button>
  );
}

function DuelTypeBtn({ label, color }: { label: string; color: string }) {
  return (
    <div className="aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 hover:scale-105 transition" style={{ background: "#1a1a24", borderColor: `${color}40` }}>
      <Medal className="h-4 w-4" style={{ color }} />
      <span className="text-[9px] font-bold tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
