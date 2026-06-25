import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Zap,
  Crown,
  Swords,
  Users,
  Calendar,
  Map as MapIcon,
  Radio,
  Lock,
  Settings,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/arena")({
  component: ArenaLobby,
});

// ---------- rank ladder ----------
type Rank = { name: string; xp: number; color: string };
const RANKS: Rank[] = [
  { name: "Recruit", xp: 0, color: "var(--rank-recruit)" },
  { name: "Contender", xp: 500, color: "var(--rank-contender)" },
  { name: "Challenger", xp: 1500, color: "var(--rank-challenger)" },
  { name: "Expert", xp: 3500, color: "var(--rank-expert)" },
  { name: "Elite", xp: 7000, color: "var(--rank-elite)" },
  { name: "Master", xp: 13000, color: "var(--rank-master)" },
  { name: "Grandmaster", xp: 21000, color: "#f59e0b" },
  { name: "Legend", xp: 35000, color: "var(--rank-legend)" },
];

function rankFromXp(xp: number): { current: Rank; next: Rank } {
  let current: Rank = RANKS[0];
  let next: Rank = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? RANKS[i];
    }
  }
  return { current, next };
}


// ---------- presence types ----------
type PresenceState = {
  user_id: string;
  username: string;
  arena_rank: string;
  status: "lobby" | "in_match";
  joined_at: string;
};

function ArenaLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState<PresenceState[]>([]);
  const [matchmaking, setMatchmaking] = useState(false);

  // arena profile (lazy-create on first visit)
  const profileQ = useQuery({
    queryKey: ["arena-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const { data: existing } = await supabase
        .from("arena_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (existing) return existing;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();
      const username = prof?.full_name?.split(" ")[0] || user!.email?.split("@")[0] || "Player";
      const { data: created } = await supabase
        .from("arena_profiles")
        .insert({ user_id: uid, username })
        .select()
        .single();
      return created;
    },
  });

  // study window for break-lock
  const windowsQ = useQuery({
    queryKey: ["study-windows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("study_windows")
        .eq("id", user!.id)
        .maybeSingle();
      return (data?.study_windows as Array<{ day: string; start: string; end: string }>) || [];
    },
  });

  // live matches feed (postgres changes)
  const matchesQ = useQuery({
    queryKey: ["arena-live-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("arena_matches")
        .select("id, match_type, status, current_players, max_players, current_question_index, question_count, created_at")
        .in("status", ["waiting", "countdown", "active"])
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 8000,
  });

  // active season
  const seasonQ = useQuery({
    queryKey: ["arena-season"],
    queryFn: async () => {
      const { data } = await supabase
        .from("arena_seasons")
        .select("season_number, name, starts_at, ends_at")
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  // === presence ===
  useEffect(() => {
    if (!user || !profileQ.data) return;
    const channel = supabase.channel("arena:lobby", {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const flat = Object.values(state).flat() as PresenceState[];
        setOnline(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            username: profileQ.data!.username,
            arena_rank: profileQ.data!.arena_rank,

            status: "lobby",
            joined_at: new Date().toISOString(),
          });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profileQ.data]);

  // === realtime matches ===
  useEffect(() => {
    const ch = supabase
      .channel("arena:matches-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arena_matches" },
        () => matchesQ.refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === break-time lock ===
  const locked = useMemo(() => {
    const windows = windowsQ.data || [];
    if (!windows.length) return null;
    const now = new Date();
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    const cur = now.getHours() * 60 + now.getMinutes();
    for (const w of windows) {
      if (w.day !== dayName) continue;
      const [sh, sm] = w.start.split(":").map(Number);
      const [eh, em] = w.end.split(":").map(Number);
      const s = sh * 60 + sm;
      const e = eh * 60 + em;
      if (cur >= s && cur < e) {
        const remainingMin = e - cur;
        return { until: w.end, remainingMin };
      }
    }
    return null;
  }, [windowsQ.data]);

  const arenaXp = profileQ.data?.arena_xp ?? 0;
  const { current: curRank, next: nextRank } = rankFromXp(arenaXp);
  const xpInto = arenaXp - curRank.xp;
  const xpSpan = Math.max(1, nextRank.xp - curRank.xp);
  const xpPct = Math.min(100, (xpInto / xpSpan) * 100);

  // ---- matchmaking helpers ----
  type ModeKey = "battle_sprint" | "battle_royale" | "squad_wars" | "blitz";
  const MODE_DEFAULTS: Record<ModeKey, { max: number; q: number; dur: number }> = {
    battle_sprint: { max: 4, q: 10, dur: 300 },
    battle_royale: { max: 8, q: 15, dur: 600 },
    squad_wars: { max: 10, q: 12, dur: 600 },
    blitz: { max: 2, q: 10, dur: 180 },
  };

  async function findOrCreateMatch(mode: ModeKey) {
    if (!user || matchmaking) return;
    setMatchmaking(true);
    try {
      // 1) try to join an open waiting match
      const { data: open } = await supabase
        .from("arena_matches")
        .select("id, current_players, max_players")
        .eq("match_type", mode)
        .eq("status", "waiting")
        .eq("is_public", true)
        .order("created_at", { ascending: true })
        .limit(5);

      const joinable = (open || []).find((m) => m.current_players < m.max_players);
      if (joinable) {
        const { error } = await supabase.rpc("arena_join_match", { p_match_id: joinable.id });
        if (!error) {
          navigate({ to: "/arena/match/$matchId", params: { matchId: joinable.id } });
          return;
        }
      }

      // 2) create a fresh one
      const def = MODE_DEFAULTS[mode];
      const { data: newId, error: cErr } = await supabase.rpc("arena_create_match", {
        p_match_type: mode,
        p_max_players: def.max,
        p_topic: "mixed",
        p_difficulty: "mixed",
        p_question_count: def.q,
        p_duration_seconds: def.dur,
      });
      if (cErr || !newId) {
        toast.error(cErr?.message || "Could not create match");
        return;
      }
      navigate({ to: "/arena/match/$matchId", params: { matchId: newId as string } });
    } finally {
      setMatchmaking(false);
    }
  }

  async function joinExistingMatch(matchId: string) {
    if (!user) return;
    const { error } = await supabase.rpc("arena_join_match", { p_match_id: matchId });
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/arena/match/$matchId", params: { matchId } });
  }

    <div className="arena-root arena-scanlines">
      <div className="arena-ambient min-h-screen flex flex-col">
        {/* ============ TOP BAR ============ */}
        <header className="sticky top-0 z-40 h-[52px] flex items-center px-4 gap-3 backdrop-blur-xl"
          style={{ background: "rgba(6,6,15,0.85)", borderBottom: "1px solid rgba(124,58,237,0.18)" }}>
          <Link to="/dashboard" className="p-1.5 rounded-md hover:bg-white/5 transition" aria-label="Back">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </Link>
          <div className="arena-label text-white/80" style={{ letterSpacing: "0.18em", fontSize: 12 }}>
            ARENA
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="arena-label" style={{ color: "rgba(124,58,237,0.85)", fontSize: 11 }}>
            {seasonQ.data
              ? `SEASON ${seasonQ.data.season_number} · ${seasonQ.data.name.replace(/^Season \d+: /, "")}`
              : "SEASON 1"}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--neon-purple)" }} />
            <span className="arena-mono text-[13px] text-white">
              {arenaXp.toLocaleString()} <span className="text-white/40">XP</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: curRank.color }} />
            <span className="text-[12px] font-semibold" style={{ color: curRank.color }}>
              {curRank.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 arena-live-dot" />
            <span className="text-[12px] text-white/50">{online.length} online</span>
          </div>
        </header>

        {/* ============ MAIN GRID ============ */}
        <div className="flex-1 grid gap-4 p-4"
          style={{ gridTemplateColumns: "240px 1fr 280px" }}>

          {/* -------- LEFT: PROFILE -------- */}
          <aside className="space-y-3">
            <div className="rounded-xl p-5"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
              <div className="flex flex-col items-center text-center">
                <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[18px] font-bold text-white arena-neon"
                  style={{
                    background: "var(--arena-glow)",
                    border: "2px solid var(--neon-purple)",
                  }}>
                  {(profileQ.data?.username || "P").slice(0, 2).toUpperCase()}
                </div>
                <div className="mt-2.5 text-[15px] font-bold text-white">
                  {profileQ.data?.username || "Player"}
                </div>
                <div className="text-[12px] text-white/40">Arena Recruit</div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold" style={{ color: curRank.color }}>
                    {curRank.name}
                  </span>
                  <span className="text-[11px] text-white/40 arena-mono">
                    {xpInto} / {xpSpan}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${xpPct}%`, background: "var(--neon-purple)" }} />
                </div>
                <div className="mt-1.5 text-[10px] text-white/30">
                  {(nextRank.xp - arenaXp).toLocaleString()} XP to {nextRank.name}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                <Stat n={profileQ.data?.total_wins ?? 0} l="Wins" />
                <Stat n={profileQ.data?.total_matches ?? 0} l="Matches" />
                <Stat n={`${profileQ.data?.win_rate ?? 0}%`} l="Win %" />
              </div>
            </div>

            {/* Rank ladder */}
            <div className="rounded-xl p-4"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
              <div className="arena-label mb-3">Rank Ladder</div>
              <div className="space-y-2">
                {RANKS.map((r) => {
                  const active = r.name === curRank.name;
                  return (
                    <div key={r.name}
                      className="flex items-center justify-between text-[12px] py-1 px-2 rounded-md transition"
                      style={{
                        opacity: active ? 1 : 0.4,
                        background: active ? "rgba(124,58,237,0.1)" : "transparent",
                        border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
                      }}>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                        <span style={{ color: active ? r.color : "rgba(255,255,255,0.7)", fontWeight: active ? 600 : 400 }}>
                          {r.name}
                        </span>
                      </div>
                      <span className="arena-mono text-white/30 text-[10px]">
                        {r.xp.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* -------- CENTER: MODES -------- */}
          <main className="space-y-4">
            {/* Online players strip */}
            <div className="rounded-xl px-4 py-3 flex items-center gap-4"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
              <div className="arena-label whitespace-nowrap">
                {online.length} Players Online
              </div>
              <div className="flex-1 flex gap-2 overflow-x-auto">
                {online.length === 0 && (
                  <div className="text-[12px] text-white/30 italic py-3">
                    No other players in the lobby yet. Be the first wave.
                  </div>
                )}
                {online.slice(0, 30).map((p) => (
                  <div key={p.user_id} className="flex flex-col items-center gap-1 min-w-[44px]">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                      style={{
                        background: "rgba(124,58,237,0.15)",
                        border: p.status === "in_match"
                          ? "2px solid var(--neon-amber)"
                          : "2px solid var(--neon-purple)",
                      }}>
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-white/50 truncate max-w-[48px]">{p.username}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode cards grid */}
            <div className="grid grid-cols-2 gap-4">
              <ModeCard
                title="Battle Sprint"
                sub="Answer fast. Score more. First to 1000 wins."
                meta="2–4 players · 5 min"
                accent="#7c3aed"
                bg="linear-gradient(135deg, #1a0a35, #0d0620)"
                icon={<Zap className="w-12 h-12 arena-spin-slow" style={{ color: "#a78bfa" }} />}
              />
              <ModeCard
                title="Battle Royale"
                sub="One wrong answer. You're out. Last one standing wins."
                meta="4–16 players · sudden death"
                accent="#f59e0b"
                bg="linear-gradient(135deg, #1a0805, #0d0a00)"
                icon={<Crown className="w-12 h-12" style={{ color: "#fbbf24" }} />}
              />
              <ModeCard
                title="Squad Wars"
                sub="Your pod vs another. Most points wins."
                meta="5v5 · 10 min"
                accent="#10b981"
                bg="linear-gradient(135deg, #0a1a0d, #050d08)"
                icon={<Users className="w-12 h-12" style={{ color: "#34d399" }} />}
              />
              <ModeCard
                title="Blitz"
                sub="1v1. Ten questions. Pure skill."
                meta="2 players · 3 min"
                accent="#ef4444"
                bg="linear-gradient(135deg, #1a0505, #0d0000)"
                icon={<Swords className="w-12 h-12" style={{ color: "#f87171" }} />}
              />
              <ModeCard
                title="Daily Challenges"
                sub="Three puzzles. Resets at midnight. Solo grind."
                meta="0 / 3 today"
                accent="#3b82f6"
                bg="linear-gradient(135deg, #0a0d1a, #050810)"
                icon={<Calendar className="w-12 h-12" style={{ color: "#60a5fa" }} />}
              />
              <ModeCard
                title="Zone War"
                sub="Represent your state. Saturdays 7 PM."
                meta="Weekly event"
                accent="#f59e0b"
                bg="linear-gradient(135deg, #1a1505, #0d0e00)"
                icon={<MapIcon className="w-12 h-12" style={{ color: "#fbbf24" }} />}
              />
            </div>

            {/* Quick match CTA */}
            <button
              disabled
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--neon-purple)", boxShadow: "0 0 24px rgba(124,58,237,0.35)" }}
              title="Matchmaking ships in Phase 2"
            >
              <Zap className="w-4 h-4" />
              FIND MATCH — Battle Sprint · Mixed · Any
              <Settings className="w-4 h-4 ml-2 opacity-60" />
            </button>
            <div className="text-center text-[11px] text-white/30 -mt-2">
              Matchmaking and live matches ship in Phase 2. Lobby + presence are live.
            </div>
          </main>

          {/* -------- RIGHT: LIVE FEED + ONLINE -------- */}
          <aside className="space-y-3">
            <div className="rounded-xl p-4"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-3.5 h-3.5 text-rose-400 arena-live-dot" />
                <span className="arena-label">Live Now</span>
                <span className="ml-auto text-[11px] text-white/30">
                  {(matchesQ.data || []).length}
                </span>
              </div>
              <div className="space-y-1.5">
                {(matchesQ.data || []).length === 0 && (
                  <div className="text-[12px] text-white/30 italic py-4 text-center">
                    No matches running. Be the first to drop in.
                  </div>
                )}
                {(matchesQ.data || []).map((m) => (
                  <div key={m.id} className="rounded-lg p-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 arena-live-dot" />
                      <span className="text-white/85 capitalize">{m.match_type.replace("_", " ")}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
                        {m.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/40 arena-mono">
                      {m.current_players}/{m.max_players} players
                      {m.status === "active" && ` · Q${m.current_question_index + 1}/${m.question_count}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="arena-label">Online Now</span>
                <span className="text-[11px] text-white/30">{online.length}</span>
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                {online.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white/5 transition">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)" }}>
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[12px] text-white/75 truncate flex-1">{p.username}</span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: p.status === "in_match" ? "var(--neon-amber)" : "var(--neon-green)",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
              <div className="arena-label mb-3">Zone Standings</div>
              <div className="space-y-1.5 text-[12px] text-white/30">
                <div className="italic">Zone war kicks off in Phase 3.</div>
              </div>
            </div>
          </aside>
        </div>

        {/* ============ BREAK-LOCK OVERLAY ============ */}
        {locked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(6,6,15,0.96)", backdropFilter: "blur(8px)" }}>
            <div className="text-center max-w-md px-6">
              <Lock className="w-8 h-8 mx-auto mb-4" style={{ color: "rgba(124,58,237,0.5)" }} />
              <div className="text-[18px] font-semibold text-white/80">Study session in progress</div>
              <div className="mt-1 text-[14px] text-white/40">
                Arena unlocks when your study window ends
              </div>
              <div className="mt-6 arena-mono text-[40px] font-bold"
                style={{ color: "var(--neon-amber)" }}>
                {Math.floor(locked.remainingMin / 60).toString().padStart(2, "0")}
                :
                {(locked.remainingMin % 60).toString().padStart(2, "0")}
              </div>
              <div className="text-[12px] text-white/40 mt-1">until Arena opens at {locked.until}</div>
              <div className="mt-8 text-[12px] text-white/25 italic">
                This is how the best students do it.
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 mt-6 text-[12px] text-white/50 hover:text-white/80 transition"
              >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- small UI bits ----------
function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div className="text-center">
      <div className="arena-mono text-[18px] font-bold text-white leading-none">{n}</div>
      <div className="text-[10px] text-white/40 mt-1">{l}</div>
    </div>
  );
}

function ModeCard({
  title,
  sub,
  meta,
  accent,
  bg,
  icon,
}: {
  title: string;
  sub: string;
  meta: string;
  accent: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="group relative text-left rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "var(--arena-card)",
        border: "1px solid rgba(124,58,237,0.15)",
        height: 180,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${accent}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.15)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="h-[60%] flex items-center justify-center relative" style={{ background: bg }}>
        {icon}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent}20, transparent 70%)`,
          }}
        />
      </div>
      <div className="h-[40%] px-4 py-3 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-extrabold tracking-wide text-white uppercase"
            style={{ letterSpacing: "0.04em" }}>
            {title}
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition" />
        </div>
        <div className="text-[12px] text-white/45 mt-0.5 line-clamp-1">{sub}</div>
        <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: accent, opacity: 0.85 }}>
          {meta}
        </div>
      </div>
    </button>
  );
}
