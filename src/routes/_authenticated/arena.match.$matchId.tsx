import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Copy, Check, LogOut, Zap, Trophy, Flame, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

function roomCodeFromId(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export const Route = createFileRoute("/_authenticated/arena/match/$matchId")({
  component: ArenaWaitingRoom,
});

type Match = {
  id: string;
  match_type: string;
  status: string;
  max_players: number;
  current_players: number;
  topic: string;
  difficulty: string;
  question_count: number;
  duration_seconds: number;
  started_at: string | null;
  created_by: string | null;
};

type Player = {
  id: string;
  user_id: string;
  username: string;
  arena_rank: string;
  joined_at: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  current_streak: number;
  rank_in_match: number | null;
  eliminated: boolean;
};

function ArenaWaitingRoom() {
  const { matchId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Offset = serverNow - clientNow. Applied to every tick so all clients
  // converge on the same remaining-seconds value regardless of local clock skew.
  const [serverOffset, setServerOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
        const t0 = Date.now();
        const res = await fetch(url, { method: "HEAD", cache: "no-store" });
        const t1 = Date.now();
        const dateHeader = res.headers.get("date");
        if (!dateHeader) return;
        const serverMs = new Date(dateHeader).getTime();
        if (!Number.isFinite(serverMs)) return;
        // Account for network latency: assume header stamped mid-flight.
        const rtt = t1 - t0;
        const estimatedClientAtServerStamp = t0 + rtt / 2;
        if (!cancelled) setServerOffset(serverMs - estimatedClientAtServerStamp);
      } catch {
        /* keep prior offset */
      }
    };
    sync();
    const id = setInterval(sync, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const matchQ = useQuery({
    queryKey: ["arena-match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arena_matches")
        .select("id, match_type, status, max_players, current_players, topic, difficulty, question_count, duration_seconds, started_at, created_by")
        .eq("id", matchId)
        .maybeSingle();
      if (error) throw error;
      return data as Match | null;
    },
  });

  const playersQ = useQuery({
    queryKey: ["arena-match-players", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("id, user_id, username, arena_rank, joined_at, score, correct_answers, wrong_answers, current_streak, rank_in_match, eliminated")
        .eq("match_id", matchId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Player[];
    },
  });

  // realtime: match updates + players join/leave
  useEffect(() => {
    const ch = supabase
      .channel(`arena:match:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_matches", filter: `id=eq.${matchId}` }, () => matchQ.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players", filter: `match_id=eq.${matchId}` }, () => playersQ.refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // 1s ticker for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const m = matchQ.data;
  const players = playersQ.data || [];
  const seats = m ? Array.from({ length: m.max_players }) : [];

  const countdown = useMemo(() => {
    if (!m?.started_at || m.status !== "countdown") return null;
    const t = new Date(m.started_at).getTime();
    const serverNow = now + serverOffset;
    const sec = Math.max(0, Math.ceil((t - serverNow) / 1000));
    return sec;
  }, [m?.started_at, m?.status, now, serverOffset]);

  // Auto-start: when countdown hits 0, any participant flips status -> active (idempotent server-side).
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (!user || !m || starting) return;
    if (m.status !== "countdown" || !m.started_at) return;
    if (!players.some((p) => p.user_id === user.id)) return;
    if (new Date(m.started_at).getTime() > now + serverOffset) return;
    setStarting(true);
    (async () => {
      try {
        await supabase.rpc("arena_start_match", { p_match_id: matchId });
      } finally {
        setTimeout(() => setStarting(false), 1500);
      }
    })();

  }, [m?.status, m?.started_at, now, user, players, matchId, starting, m]);


  const isMember = !!user && players.some((p) => p.user_id === user.id);

  const handleLeave = async () => {
    if (!user) return;
    await supabase.from("match_players").delete().eq("match_id", matchId).eq("user_id", user.id);
    // best-effort decrement (creator-only update – ignore if it fails)
    if (m && m.created_by === user.id) {
      await supabase.from("arena_matches").update({ current_players: Math.max(0, m.current_players - 1) }).eq("id", matchId);
    }
    navigate({ to: "/arena" });
  };

  const roomCode = roomCodeFromId(matchId);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    toast.success(`Room code ${roomCode} copied`);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  // Live-sorted leaderboard: by score desc, then streak, then fewer wrongs
  const leaderboard = useMemo(() => {
    return [...players].sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      if ((b.current_streak ?? 0) !== (a.current_streak ?? 0))
        return (b.current_streak ?? 0) - (a.current_streak ?? 0);
      return (a.wrong_answers ?? 0) - (b.wrong_answers ?? 0);
    });
  }, [players]);

  if (matchQ.isLoading) {
    return (
      <div className="arena-root arena-scanlines">
        <div className="arena-ambient min-h-screen flex items-center justify-center text-white/40 text-sm">
          Loading match…
        </div>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="arena-root arena-scanlines">
        <div className="arena-ambient min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="text-white/60">Match not found.</div>
          <Link to="/arena" className="text-[13px] text-white/80 underline">Back to Arena</Link>
        </div>
      </div>
    );
  }

  const statusLabel =
    m.status === "waiting"
      ? `Waiting for players · ${m.current_players}/${m.max_players}`
      : m.status === "countdown"
      ? "Match starting…"
      : m.status === "active"
      ? "Match in progress"
      : m.status;

  return (
    <div className="arena-root arena-scanlines">
      <div className="arena-ambient min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 h-[52px] flex items-center px-4 gap-3 backdrop-blur-xl"
          style={{ background: "rgba(6,6,15,0.85)", borderBottom: "1px solid rgba(124,58,237,0.18)" }}>
          <Link to="/arena" className="p-1.5 rounded-md hover:bg-white/5 transition" aria-label="Back">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </Link>
          <div className="arena-label text-white/80" style={{ letterSpacing: "0.18em", fontSize: 12 }}>
            ARENA · WAITING ROOM
          </div>
          <div className="flex-1" />
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-white/80 hover:text-white transition arena-mono"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.35)" }}
            title="Click to copy room code"
          >
            <Hash className="w-3.5 h-3.5" style={{ color: "var(--neon-purple)" }} />
            {roomCode}
            {codeCopied && <Check className="w-3 h-3 text-emerald-400" />}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-white/70 hover:text-white transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Invite link
          </button>
          {isMember && (
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-rose-300 hover:text-rose-200 transition"
              style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center px-6 py-10 gap-8">
          {/* Mode card */}
          <div className="text-center">
            <div className="arena-label text-white/40 mb-2">{m.match_type.replace(/_/g, " ").toUpperCase()}</div>
            <div className="text-[34px] font-extrabold text-white tracking-tight">
              {m.topic === "mixed" ? "Mixed Topics" : m.topic} · {m.difficulty === "mixed" ? "Any Difficulty" : m.difficulty}
            </div>
            <div className="text-white/50 mt-1 text-sm arena-mono">
              {m.question_count} questions · {Math.round(m.duration_seconds / 60)} min
            </div>
            <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-white/40">
              Share room code <span className="arena-mono text-white/80 px-1.5 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>{roomCode}</span> or the invite link
            </div>
          </div>
          {/* Mode card */}
          <div className="text-center">
            <div className="arena-label text-white/40 mb-2">{m.match_type.replace(/_/g, " ").toUpperCase()}</div>
            <div className="text-[34px] font-extrabold text-white tracking-tight">
              {m.topic === "mixed" ? "Mixed Topics" : m.topic} · {m.difficulty === "mixed" ? "Any Difficulty" : m.difficulty}
            </div>
            <div className="text-white/50 mt-1 text-sm arena-mono">
              {m.question_count} questions · {Math.round(m.duration_seconds / 60)} min
            </div>
          </div>

          {/* Status / countdown */}
          <div className="rounded-2xl px-10 py-8 text-center min-w-[360px]"
            style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}>
            {countdown !== null ? (
              <>
                <div className="arena-label text-white/40">MATCH STARTS IN</div>
                <div className="arena-mono text-[88px] font-extrabold leading-none mt-2"
                  style={{ color: "var(--neon-purple)", textShadow: "0 0 40px rgba(124,58,237,0.5)" }}>
                  {countdown}
                </div>
                <div className="text-[12px] text-white/40 mt-2">Get ready…</div>
              </>
            ) : m.status === "active" ? (
              <>
                <div className="arena-label text-emerald-400">LIVE</div>
                <div className="text-white text-[24px] font-bold mt-2">Match in progress</div>
                <div className="text-[12px] text-white/40 mt-1">Live gameplay ships in the next phase.</div>
              </>
            ) : (
              <>
                <div className="arena-label text-white/40">STATUS</div>
                <div className="text-white text-[22px] font-bold mt-2">{statusLabel}</div>
                <div className="text-[12px] text-white/40 mt-2">
                  Match auto-starts when {m.max_players} players have joined.
                </div>
              </>
            )}
          </div>

          {/* Players grid */}
          <div className="w-full max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-white/50" />
              <span className="arena-label">Players</span>
              <span className="ml-auto text-[11px] text-white/40 arena-mono">
                {players.length}/{m.max_players}
              </span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(m.max_players, 4)}, minmax(0,1fr))` }}>
              {seats.map((_, i) => {
                const p = players[i];
                const isMe = !!p && p.user_id === user?.id;
                return (
                  <div key={i}
                    className="rounded-xl p-4 flex flex-col items-center text-center transition"
                    style={{
                      background: p ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
                      border: p
                        ? `1px solid ${isMe ? "var(--neon-purple)" : "rgba(124,58,237,0.3)"}`
                        : "1px dashed rgba(255,255,255,0.08)",
                      minHeight: 128,
                    }}>
                    {p ? (
                      <>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                          style={{ background: "var(--arena-glow)", border: "2px solid var(--neon-purple)" }}>
                          {p.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="mt-2 text-[13px] font-semibold text-white truncate max-w-full">
                          {p.username}{isMe && <span className="text-white/40"> (you)</span>}
                        </div>
                        <div className="text-[11px] text-white/40">{p.arena_rank}</div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.1)" }}>
                          <Zap className="w-4 h-4 text-white/20" />
                        </div>
                        <div className="mt-2 text-[12px] text-white/30 italic">Waiting…</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!isMember && m.status === "waiting" && (
            <div className="text-[12px] text-white/40">
              You are watching. Hit Join from the Arena lobby to take a seat.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
