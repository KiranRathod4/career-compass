import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Zap, Flame, Trophy, Check, X, Clock, RotateCw, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/arena/training")({
  component: TrainingRoute,
});

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  category: string;
  difficulty: string;
  explanation: string | null;
};

const QUESTION_COUNT = 10;
const SECONDS_PER_Q = 20;

function TrainingRoute() {
  return <Training key={Math.random()} />;
}

function Training() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [remaining, setRemaining] = useState(SECONDS_PER_Q);
  const [done, setDone] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  // Load random-ish set of questions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("arena_questions")
        .select("id, question, options, correct_answer, category, difficulty, explanation")
        .limit(60);
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        toast.error("No questions available yet");
        setLoading(false);
        return;
      }
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, QUESTION_COUNT);
      const normalized: Question[] = shuffled.map((q) => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        correct_answer: q.correct_answer,
        category: q.category,
        difficulty: q.difficulty,
        explanation: q.explanation,
      }));
      setQuestions(normalized);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = questions?.[idx] ?? null;

  // Per-question timer
  useEffect(() => {
    if (!q || locked || done) return;
    setRemaining(SECONDS_PER_Q);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, SECONDS_PER_Q - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        handleAnswer(null);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, q?.id]);

  function handleAnswer(choice: string | null) {
    if (!q || locked) return;
    setLocked(true);
    setSelected(choice);
    const correct = choice !== null && choice === q.correct_answer;
    if (correct) {
      const timeBonus = Math.round(remaining * 2); // up to +40
      const diffMul = q.difficulty === "Hard" ? 20 : q.difficulty === "Medium" ? 15 : 10;
      const streakBonus = Math.min(streak * 3, 30);
      const gained = diffMul + timeBonus + streakBonus;
      setScore((s) => s + gained);
      setCorrectCount((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  }

  function nextQuestion() {
    if (!questions) return;
    if (idx + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setLocked(false);
  }

  function restart() {
    setQuestions(null);
    setIdx(0);
    setSelected(null);
    setLocked(false);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setDone(false);
    setXpAwarded(false);
    // Re-run loader
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("arena_questions")
        .select("id, question, options, correct_answer, category, difficulty, explanation")
        .limit(60);
      if (data && data.length) {
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, QUESTION_COUNT);
        setQuestions(
          shuffled.map((sq) => ({
            id: sq.id,
            question: sq.question,
            options: Array.isArray(sq.options) ? (sq.options as string[]) : [],
            correct_answer: sq.correct_answer,
            category: sq.category,
            difficulty: sq.difficulty,
            explanation: sq.explanation,
          })),
        );
      }
      setLoading(false);
    })();
  }

  // Award XP once when finished
  useEffect(() => {
    if (!done || xpAwarded || !user) return;
    const xp = Math.round(score / 4) + correctCount * 2; // modest solo reward
    setXpAwarded(true);
    (async () => {
      try {
        await supabase.from("xp_transactions").insert({
          user_id: user.id,
          xp_amount: xp,
          action_type: "arena_training",
          metadata: { correct: correctCount, total: QUESTION_COUNT, score, best_streak: bestStreak },
        });
        // Optimistic bump on arena_profiles.arena_xp
        const { data: prof } = await supabase
          .from("arena_profiles")
          .select("arena_xp")
          .eq("user_id", user.id)
          .maybeSingle();
        const currentXp = (prof?.arena_xp as number | undefined) ?? 0;
        await supabase
          .from("arena_profiles")
          .update({ arena_xp: currentXp + xp })
          .eq("user_id", user.id);
        toast.success(`+${xp} XP earned`);
      } catch {
        /* silent */
      }
    })();
  }, [done, xpAwarded, user, score, correctCount, bestStreak]);

  const accuracy = useMemo(
    () => (questions ? Math.round((correctCount / questions.length) * 100) : 0),
    [correctCount, questions],
  );

  if (loading || !questions) {
    return (
      <div className="arena-root arena-scanlines">
        <div className="arena-ambient min-h-screen flex items-center justify-center text-white/50 text-sm">
          Loading training set…
        </div>
      </div>
    );
  }

  return (
    <div className="arena-root arena-scanlines">
      <div className="arena-ambient min-h-screen flex flex-col">
        <header
          className="sticky top-0 z-40 h-[52px] flex items-center px-4 gap-3 backdrop-blur-xl"
          style={{ background: "rgba(6,6,15,0.85)", borderBottom: "1px solid rgba(124,58,237,0.18)" }}
        >
          <Link to="/arena" className="p-1.5 rounded-md hover:bg-white/5 transition" aria-label="Back">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </Link>
          <div className="arena-label text-white/80" style={{ letterSpacing: "0.18em", fontSize: 12 }}>
            ARENA · SOLO TRAINING
          </div>
          <div className="flex-1" />
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--neon-purple)" }} />
            <span className="arena-mono text-[13px] text-white">
              {score} <span className="text-white/40">pts</span>
            </span>
          </div>
          {streak > 1 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="arena-mono text-[13px] text-amber-300">{streak}</span>
            </div>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center px-6 py-8 gap-6 w-full max-w-2xl mx-auto">
          {!done && q && (
            <>
              {/* Progress + timer */}
              <div className="w-full">
                <div className="flex items-center justify-between text-[11px] text-white/50 arena-mono mb-1.5">
                  <span>QUESTION {idx + 1} / {questions.length}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {remaining.toFixed(1)}s
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full transition-[width] duration-100"
                    style={{
                      width: `${(remaining / SECONDS_PER_Q) * 100}%`,
                      background: remaining < 5 ? "#ef4444" : "var(--neon-purple)",
                      boxShadow: remaining < 5 ? "0 0 10px rgba(239,68,68,0.6)" : "0 0 10px rgba(124,58,237,0.5)",
                    }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div
                className="w-full rounded-2xl p-6"
                style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}
                  >
                    {q.category}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      background: q.difficulty === "Hard" ? "rgba(239,68,68,0.15)" : q.difficulty === "Medium" ? "rgba(251,191,36,0.15)" : "rgba(52,211,153,0.15)",
                      color: q.difficulty === "Hard" ? "#fca5a5" : q.difficulty === "Medium" ? "#fcd34d" : "#6ee7b7",
                      border: `1px solid ${q.difficulty === "Hard" ? "rgba(239,68,68,0.3)" : q.difficulty === "Medium" ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
                    }}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <div className="text-[20px] font-bold text-white leading-snug mb-5">{q.question}</div>

                <div className="grid gap-2.5">
                  {q.options.map((opt) => {
                    const isSel = selected === opt;
                    const isCorrect = opt === q.correct_answer;
                    let bg = "rgba(255,255,255,0.03)";
                    let border = "rgba(255,255,255,0.08)";
                    let color = "rgba(255,255,255,0.9)";
                    if (locked) {
                      if (isCorrect) {
                        bg = "rgba(16,185,129,0.12)";
                        border = "rgba(16,185,129,0.6)";
                        color = "#6ee7b7";
                      } else if (isSel && !isCorrect) {
                        bg = "rgba(239,68,68,0.12)";
                        border = "rgba(239,68,68,0.6)";
                        color = "#fca5a5";
                      }
                    } else if (isSel) {
                      bg = "rgba(124,58,237,0.15)";
                      border = "rgba(124,58,237,0.5)";
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswer(opt)}
                        disabled={locked}
                        className="text-left px-4 py-3 rounded-lg transition-all disabled:cursor-not-allowed hover:brightness-110 flex items-center gap-3"
                        style={{ background: bg, border: `1px solid ${border}`, color }}
                      >
                        <span className="flex-1 text-[14px]">{opt}</span>
                        {locked && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                        {locked && isSel && !isCorrect && <X className="w-4 h-4 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>

                {locked && (
                  <div className="mt-5 pt-4 border-t border-white/5">
                    {q.explanation && (
                      <div className="text-[12px] text-white/60 mb-3">
                        <span className="arena-label text-white/40 mr-2">WHY</span>
                        {q.explanation}
                      </div>
                    )}
                    <button
                      onClick={nextQuestion}
                      className="w-full h-11 rounded-md font-semibold text-white transition hover:brightness-110"
                      style={{ background: "var(--neon-purple)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
                    >
                      {idx + 1 >= questions.length ? "See results" : "Next question →"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {done && (
            <div
              className="w-full rounded-2xl p-8 text-center"
              style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)" }}
            >
              <Trophy className="w-10 h-10 mx-auto mb-3" style={{ color: "#fbbf24" }} />
              <div className="arena-label text-white/40">TRAINING COMPLETE</div>
              <div className="mt-2 text-[42px] font-extrabold text-white arena-mono" style={{ textShadow: "0 0 30px rgba(124,58,237,0.5)" }}>
                {score}
              </div>
              <div className="text-[12px] text-white/50 mb-6">total score</div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                <MiniStat icon={<Target className="w-4 h-4" />} label="Accuracy" value={`${accuracy}%`} />
                <MiniStat icon={<Check className="w-4 h-4" />} label="Correct" value={`${correctCount}/${questions.length}`} />
                <MiniStat icon={<Flame className="w-4 h-4 text-amber-400" />} label="Best streak" value={`${bestStreak}`} />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={restart}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-white transition"
                  style={{ background: "var(--neon-purple)", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}
                >
                  <RotateCw className="w-4 h-4" />
                  Train again
                </button>
                <button
                  onClick={() => navigate({ to: "/arena" })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-white/80 transition"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Back to Arena
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-center gap-1 text-white/50 text-[10px] uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="mt-1 arena-mono text-[18px] font-bold text-white">{value}</div>
    </div>
  );
}
