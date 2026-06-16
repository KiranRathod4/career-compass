import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ZONES } from "@/lib/arena-zones";
import { ArrowLeft, Clock, Crown, Flame, Radio, Trophy, Users, Zap, Check, X, LogIn, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/arena/battle/$battleId")({
  component: LiveBattle,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-red-400">Battle failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm text-zinc-400">Battle not found.</div>,
});

interface MCQ {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

interface Participant {
  user_id: string;
  score: number;
  rank: number | null;
  answers: any;
  joined_at: string;
}

const QUESTION_TIME_SEC = 25;
const CORRECT_XP = 100;
const SPEED_BONUS_MAX = 50;

function LiveBattle() {
  const { battleId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [questionStart, setQuestionStart] = useState<number>(() => Date.now());
  const answeredRef = useRef<Set<number>>(new Set());

  // tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // battle
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ["battle", battleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("arena_battles")
        .select("id, battle_type, title, zone, status, max_participants, question_count, duration_minutes, starts_at, ends_at, questions")
        .eq("id", battleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // questions: from battle.questions or pull from arena_questions deterministically by battleId
  const { data: questions = [] } = useQuery<MCQ[]>({
    queryKey: ["battle-questions", battleId, battle?.question_count],
    enabled: !!battle,
    queryFn: async () => {
      const seeded = (battle?.questions as any[]) ?? [];
      if (Array.isArray(seeded) && seeded.length > 0) return seeded as MCQ[];
      const { data } = await (supabase as any)
        .from("arena_questions")
        .select("id, question, options, correct_answer, explanation");
      const pool: MCQ[] = (data ?? []).map((r: any) => ({
        id: r.id,
        question: r.question,
        options: Array.isArray(r.options) ? r.options : [],
        correct_answer: String(r.correct_answer),
        explanation: r.explanation,
      }));
      // deterministic shuffle by battleId
      const seed = battleId.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
      const sorted = pool
        .map((q, i) => ({ q, k: ((i + 1) * 9301 + seed * 49297) % 233280 }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.q);
      return sorted.slice(0, battle?.question_count ?? 5);
    },
  });

  // participants
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["battle-participants", battleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("battle_participants")
        .select("user_id, score, rank, answers, joined_at")
        .eq("battle_id", battleId)
        .order("score", { ascending: false });
      return (data ?? []) as Participant[];
    },
  });

  // profiles for participants
  const pids = participants.map((p) => p.user_id);
  const { data: profMap = {} } = useQuery({
    queryKey: ["battle-profiles", pids.join(",")],
    enabled: pids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, city")
        .in("id", pids);
      const m: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p; });
      return m;
    },
  });

  // realtime
  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase
      .channel(`battle-${battleId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_participants", filter: `battle_id=eq.${battleId}` }, () => {
        qc.invalidateQueries({ queryKey: ["battle-participants", battleId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_battles", filter: `id=eq.${battleId}` }, () => {
        qc.invalidateQueries({ queryKey: ["battle", battleId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, battleId, qc]);

  const me = participants.find((p) => p.user_id === user?.id);
  const joined = !!me;
  const isLive = battle?.status === "live";
  const isUpcoming = battle?.status === "upcoming";
  const isEnded = battle?.status === "completed" || (battle && new Date(battle.ends_at).getTime() < now);

  // auto-join on mount when live or upcoming
  useEffect(() => {
    if (!user || !battle || joined) return;
    if (isEnded) return;
    if (participants.length >= (battle.max_participants ?? 99)) return;
    (async () => {
      const { error } = await (supabase as any)
        .from("battle_participants")
        .insert({ battle_id: battleId, user_id: user.id, score: 0, answers: [] });
      if (!error) {
        qc.invalidateQueries({ queryKey: ["battle-participants", battleId] });
      }
    })();
  }, [user, battle, joined, isEnded, participants.length, battleId, qc]);

  // restore answered index from server state
  useEffect(() => {
    if (!me) return;
    const arr = Array.isArray(me.answers) ? (me.answers as any[]) : [];
    arr.forEach((_, i) => answeredRef.current.add(i));
    if (arr.length > qIdx) setQIdx(arr.length);
  }, [me?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // reset selection on question change
  useEffect(() => {
    setSelected(null);
    setLocked(false);
    setQuestionStart(Date.now());
  }, [qIdx]);

  const zone = battle?.zone ? (ZONES as any)[battle.zone] : null;
  const accent = zone?.accent ?? "#a78bfa";

  // timers
  const startsAt = battle ? new Date(battle.starts_at).getTime() : 0;
  const endsAt = battle ? new Date(battle.ends_at).getTime() : 0;
  const msToStart = Math.max(0, startsAt - now);
  const msToEnd = Math.max(0, endsAt - now);
  const qElapsed = (now - questionStart) / 1000;
  const qRemaining = Math.max(0, QUESTION_TIME_SEC - qElapsed);

  const currentQ = questions[qIdx];
  const done = qIdx >= questions.length;

  // auto-advance when question timer runs out without answer
  useEffect(() => {
    if (!isLive || locked || done || !currentQ) return;
    if (qRemaining <= 0) {
      submitAnswer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qRemaining, isLive, locked, done]);

  async function submitAnswer(choice: string | null) {
    if (!user || !me || !currentQ || locked) return;
    setLocked(true);
    setSelected(choice);
    const isCorrect = choice !== null && String(choice).trim() === String(currentQ.correct_answer).trim();
    const speedBonus = Math.max(0, Math.round((qRemaining / QUESTION_TIME_SEC) * SPEED_BONUS_MAX));
    const gained = isCorrect ? CORRECT_XP + speedBonus : 0;
    const newAnswers = [
      ...(Array.isArray(me.answers) ? (me.answers as any[]) : []),
      { idx: qIdx, choice, correct: isCorrect, gained, t: Date.now() },
    ];
    const newScore = (me.score ?? 0) + gained;
    const { error } = await (supabase as any)
      .from("battle_participants")
      .update({ score: newScore, answers: newAnswers })
      .eq("battle_id", battleId)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Could not save answer");
      setLocked(false);
      return;
    }
    qc.invalidateQueries({ queryKey: ["battle-participants", battleId] });
    answeredRef.current.add(qIdx);
    setTimeout(() => setQIdx((i) => i + 1), 1400);
  }

  if (battleLoading || !battle) {
    return (
      <div className="arena-root p-10 text-sm text-zinc-400 arena-mono">
        Booting battle…
      </div>
    );
  }

  // ranked participants
  const ranked = [...participants].sort((a, b) => b.score - a.score);
  const myRank = ranked.findIndex((p) => p.user_id === user?.id);

  return (
    <div className="arena-root">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => zone ? navigate({ to: "/arena/zone/$zoneId", params: { zoneId: battle.zone } }) : navigate({ to: "/arena" })}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-3 arena-mono text-[10px]">
            <BattleStatusPill status={battle.status} live={isLive} ended={isEnded} />
            {isLive && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> ENDS IN {fmtMS(msToEnd)}
              </span>
            )}
            {isUpcoming && (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> STARTS IN {fmtMS(msToStart)}
              </span>
            )}
          </div>
        </div>

        {/* Hero */}
        <div
          className="arena-neon-card relative overflow-hidden p-5 md:p-6 mb-5"
          style={{ ["--arena-accent" as any]: `${accent}80` }}
        >
          <div className="absolute inset-0 arena-grid-bg opacity-30 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded border"
                  style={{ color: accent, borderColor: `${accent}66`, background: `${accent}14` }}>
                  {(battle.battle_type as string).toUpperCase()}
                </span>
                {zone && (
                  <span className="text-[10px] arena-mono text-zinc-500">· {zone.short}</span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{battle.title}</h1>
              <p className="text-[11px] text-zinc-500 arena-mono mt-1">
                {questions.length} questions · {battle.duration_minutes}m · {participants.length}/{battle.max_participants} operatives
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 min-w-[280px]">
              <MiniStat label="Your Score" value={(me?.score ?? 0).toLocaleString()} accent={accent} icon={<Flame className="h-3 w-3" />} />
              <MiniStat label="Rank" value={myRank >= 0 ? `#${myRank + 1}` : "—"} icon={<Crown className="h-3 w-3" />} />
              <MiniStat label="Players" value={participants.length.toString()} icon={<Users className="h-3 w-3" />} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* LEFT: arena */}
          <div className="space-y-4">
            {!user && (
              <div className="arena-neon-card p-6 text-center text-zinc-400 text-sm">
                <LogIn className="h-5 w-5 mx-auto mb-2" />
                Sign in to join this battle.
              </div>
            )}

            {user && isUpcoming && (
              <LobbyView msToStart={msToStart} accent={accent} joined={joined} />
            )}

            {user && isLive && !done && currentQ && joined && (
              <QuestionCard
                index={qIdx}
                total={questions.length}
                q={currentQ}
                selected={selected}
                locked={locked}
                remaining={qRemaining}
                accent={accent}
                onPick={submitAnswer}
              />
            )}

            {user && isLive && !joined && participants.length >= (battle.max_participants ?? 99) && (
              <div className="arena-neon-card p-6 text-center text-zinc-400 text-sm">
                This battle is full. Jump into the next one from the war room.
              </div>
            )}

            {user && (done || isEnded) && joined && (
              <ResultsCard
                score={me?.score ?? 0}
                rank={myRank + 1}
                total={participants.length}
                accent={accent}
                onReturn={() => zone ? navigate({ to: "/arena/zone/$zoneId", params: { zoneId: battle.zone } }) : navigate({ to: "/arena" })}
              />
            )}
          </div>

          {/* RIGHT: live leaderboard */}
          <div className="arena-neon-card p-4 self-start">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-300">Live Standings</span>
              <Radio className="h-3 w-3 text-emerald-400 arena-spark ml-auto" />
            </div>
            {ranked.length === 0 ? (
              <div className="text-[12px] text-zinc-500 leading-relaxed">Waiting for operatives…</div>
            ) : (
              <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                {ranked.map((p, i) => {
                  const prof = (profMap as any)[p.user_id];
                  const name = prof?.full_name || prof?.username || "Operative";
                  const isMe = p.user_id === user?.id;
                  const tone = i === 0 ? "#f59e0b" : i === 1 ? "#cbd5e1" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.08)";
                  return (
                    <div
                      key={p.user_id}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-md border border-white/5 bg-zinc-900/40 transition"
                      style={{ borderLeft: `3px solid ${isMe ? accent : tone}` }}
                    >
                      <span className="text-[11px] arena-mono font-bold w-5 text-center"
                        style={{ color: i < 3 ? tone : "rgba(255,255,255,0.4)" }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-zinc-100 truncate flex items-center gap-1.5">
                          {name}
                          {isMe && <span className="text-[9px] arena-mono" style={{ color: accent }}>· YOU</span>}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">{prof?.city || "—"}</div>
                      </div>
                      <div className="text-[12px] arena-mono font-bold text-zinc-100">
                        {p.score.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-zinc-500 arena-mono">
              Updates in real time
            </div>
            <Link
              to="/arena"
              className="mt-3 block text-[10px] arena-mono text-zinc-500 hover:text-white"
            >
              ← Back to Arena
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function BattleStatusPill({ status, live, ended }: { status: string; live: boolean; ended: boolean }) {
  const label = ended ? "ENDED" : live ? "LIVE" : status.toUpperCase();
  const color = ended ? "#71717a" : live ? "#34d399" : "#f59e0b";
  return (
    <span
      className="text-[10px] arena-mono font-bold uppercase px-2 py-0.5 rounded border"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      {label}
    </span>
  );
}

function MiniStat({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-zinc-900/40 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </div>
      <div className="text-base font-bold arena-mono mt-0.5" style={{ color: accent ?? "#fff" }}>{value}</div>
    </div>
  );
}

function LobbyView({ msToStart, accent, joined }: { msToStart: number; accent: string; joined: boolean }) {
  return (
    <div className="arena-neon-card p-8 text-center" style={{ ["--arena-accent" as any]: `${accent}66` }}>
      <Zap className="h-8 w-8 mx-auto mb-3" style={{ color: accent }} />
      <div className="text-[10px] uppercase tracking-[0.2em] arena-mono text-zinc-500 mb-1">Battle starts in</div>
      <div className="text-5xl font-bold arena-mono text-white tracking-tight">{fmtMS(msToStart)}</div>
      <div className="mt-4 text-[12px] text-zinc-400">
        {joined ? "You're locked in. Hold position." : "Joining you to the battle…"}
      </div>
    </div>
  );
}

function QuestionCard({
  index, total, q, selected, locked, remaining, accent, onPick,
}: {
  index: number; total: number; q: MCQ; selected: string | null; locked: boolean;
  remaining: number; accent: string; onPick: (v: string | null) => void;
}) {
  const pct = (remaining / QUESTION_TIME_SEC) * 100;
  const isCorrect = (opt: string) => locked && String(opt).trim() === String(q.correct_answer).trim();
  const isWrongPick = (opt: string) => locked && selected === opt && !isCorrect(opt);
  return (
    <div className="arena-neon-card p-5 md:p-6" style={{ ["--arena-accent" as any]: `${accent}66` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] arena-mono uppercase tracking-[0.14em] text-zinc-400">
          Question {index + 1} / {total}
        </span>
        <span className="text-[11px] arena-mono font-bold" style={{ color: remaining < 5 ? "#f87171" : accent }}>
          {Math.ceil(remaining)}s
        </span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded overflow-hidden mb-5">
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${pct}%`, background: remaining < 5 ? "#f87171" : accent }}
        />
      </div>
      <h2 className="text-lg md:text-xl font-semibold text-white leading-snug mb-5">{q.question}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {q.options.map((opt, i) => {
          const correct = isCorrect(opt);
          const wrong = isWrongPick(opt);
          const picked = selected === opt;
          return (
            <button
              key={i}
              disabled={locked}
              onClick={() => onPick(opt)}
              className="text-left rounded-md border px-4 py-3 transition arena-mono text-[13px] flex items-center gap-3 disabled:cursor-default"
              style={{
                borderColor: correct ? "#34d399" : wrong ? "#f87171" : picked ? accent : "rgba(255,255,255,0.1)",
                background: correct ? "rgba(52,211,153,0.10)" : wrong ? "rgba(248,113,113,0.10)" : picked ? `${accent}14` : "rgba(255,255,255,0.02)",
                color: "#e4e4e7",
              }}
            >
              <span className="h-6 w-6 rounded-sm flex items-center justify-center text-[10px] font-bold border"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: "#a1a1aa" }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {correct && <Check className="h-4 w-4 text-emerald-400" />}
              {wrong && <X className="h-4 w-4 text-red-400" />}
            </button>
          );
        })}
      </div>
      {locked && q.explanation && (
        <div className="mt-4 p-3 rounded border border-white/5 bg-zinc-900/40 text-[11px] text-zinc-400 leading-relaxed">
          <span className="arena-mono uppercase text-[9px] tracking-wider text-zinc-500 mr-2">Why</span>
          {q.explanation}
        </div>
      )}
    </div>
  );
}

function ResultsCard({
  score, rank, total, accent, onReturn,
}: { score: number; rank: number; total: number; accent: string; onReturn: () => void }) {
  const podium = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎯";
  return (
    <div className="arena-neon-card p-8 text-center" style={{ ["--arena-accent" as any]: `${accent}66` }}>
      <div className="text-5xl mb-3">{podium}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] arena-mono text-zinc-500 mb-1">Battle Complete</div>
      <div className="text-4xl font-bold text-white arena-mono">{score.toLocaleString()} XP</div>
      <div className="mt-2 text-[12px] text-zinc-400">
        Finished <span className="text-white font-semibold">#{rank}</span> of {total} operatives
      </div>
      <Button
        className="mt-5 h-9 px-5 font-bold"
        style={{ background: accent, color: "#0b0b14" }}
        onClick={onReturn}
      >
        Back to War Room
      </Button>
    </div>
  );
}

function fmtMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}:${ss.toString().padStart(2, "0")}`;
}
