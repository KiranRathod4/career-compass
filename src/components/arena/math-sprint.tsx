import { useEffect, useRef, useState } from "react";
import { useAwardXP } from "@/hooks/use-gamification";
import { randomMathProblem } from "@/lib/arena-data";
import { NumberPad } from "./number-pad";
import { ArrowLeft, Flame, RotateCcw } from "lucide-react";

type Phase = "intro" | "countdown" | "play" | "over";

export function MathSprint({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [problem, setProblem] = useState(() => randomMathProblem());
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"" | "green" | "red">("");
  const [scorePop, setScorePop] = useState(false);
  const xpRef = useRef<HTMLDivElement>(null);
  const award = useAwardXP();

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("play"); setTimeLeft(60); setScore(0); setWrong(0); setStreak(0); setBestStreak(0); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== "play") return;
    if (timeLeft <= 0) {
      setPhase("over");
      const xp = Math.min(score * 2, 50);
      if (xp > 0) award.mutate({ action: "arena_math", xp, metadata: { score, bestStreak } });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const submit = () => {
    if (!input) return;
    if (Number(input) === problem.answer) {
      setScore((s) => s + 1);
      setStreak((s) => { const n = s + 1; setBestStreak((b) => Math.max(b, n)); return n; });
      setFlash("green");
      setScorePop(true);
      setTimeout(() => setScorePop(false), 220);
      setTimeout(() => setFlash(""), 200);
      setProblem(randomMathProblem());
      setInput("");
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
      setFlash("red");
      setTimeout(() => setFlash(""), 400);
      setInput("");
    }
  };

  const start = () => { setCountdown(3); setPhase("countdown"); };

  const ringColor = timeLeft > 20 ? "#7c3aed" : timeLeft > 10 ? "#f59e0b" : "#e11d48";
  const ringPct = (timeLeft / 60) * 283;

  if (phase === "intro") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
        <BackBtn onBack={onBack} />
        <div className="text-8xl mb-2 arena-mono text-[#f59e0b] font-bold">Σ</div>
        <h2 className="text-2xl font-extrabold tracking-wide mb-2">MATH SPRINT</h2>
        <p className="text-sm text-zinc-400 mb-6 text-center">60 seconds. Solve as many as you can.</p>
        <div className="flex gap-2 mb-8">
          {(["Easy", "Medium", "Hard"] as const).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${difficulty === d ? "bg-[#7c3aed] border-[#7c3aed] text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>{d}</button>
          ))}
        </div>
        <button onClick={start} className="h-12 px-12 rounded-xl bg-[#f59e0b] text-black font-bold text-base tracking-wide hover:brightness-110 active:scale-95 transition">SHURU KARO</button>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="arena-mono text-9xl font-bold text-[#f59e0b] arena-anim-pop" key={countdown}>{countdown > 0 ? countdown : "GO!"}</div>
      </div>
    );
  }

  if (phase === "over") {
    const xp = Math.min(score * 2, 50);
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <BackBtn onBack={onBack} />
        <p className="text-sm text-zinc-400">You solved</p>
        <div className="arena-mono text-7xl font-bold text-[#f59e0b] my-2">{score}</div>
        <p className="text-sm text-zinc-400">questions</p>
        <div className="mt-6 px-6 py-3 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/50 text-[#a78bfa] font-semibold">+{xp} XP</div>
        <div className="mt-8 grid grid-cols-3 gap-4 text-center max-w-md">
          <Stat label="Correct" value={score} color="text-emerald-400" />
          <Stat label="Wrong" value={wrong} color="text-rose-400" />
          <Stat label="Best Streak" value={bestStreak} color="text-amber-400" />
        </div>
        <div className="flex gap-2 mt-8">
          <button onClick={start} className="h-11 px-6 rounded-xl bg-[#f59e0b] text-black font-bold text-sm inline-flex items-center gap-2"><RotateCcw className="h-4 w-4" />Play again</button>
          <button onClick={onBack} className="h-11 px-6 rounded-xl border border-zinc-700 text-sm font-medium">Back to Arena</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <BackBtn onBack={onBack} />
      {flash === "green" && <div className="fixed inset-0 pointer-events-none arena-anim-flash-green z-50" />}
      {flash === "red" && <div className="fixed inset-0 pointer-events-none arena-anim-flash-red z-50" />}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 mt-4">
        <div className="arena-mono text-5xl font-bold text-[#f59e0b]" style={{ transform: scorePop ? "scale(1.3)" : "scale(1)", transition: "transform 200ms" }}>{score}</div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold"><Flame className="h-4 w-4" />{streak}</div>
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" stroke="#1e1e2e" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="45" stroke={ringColor} strokeWidth="8" fill="none" strokeDasharray="283" strokeDashoffset={283 - ringPct} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear, stroke 300ms" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center arena-mono text-xl font-bold">{timeLeft}</div>
        </div>
      </div>

      {/* Question */}
      <div className={`arena-card p-8 mb-6 text-center ${timeLeft < 10 ? "arena-anim-glow" : ""}`} style={{ background: "#1a1a24", borderColor: "rgba(124,58,237,0.4)" }}>
        <div key={problem.q} className="arena-mono text-5xl font-bold arena-anim-slide-in">{problem.q} = ?</div>
      </div>

      {/* Answer display */}
      <div className="text-center mb-6">
        <div className="arena-mono text-4xl font-bold min-h-[3rem] text-white inline-block arena-cursor">{input || <span className="text-zinc-600">_</span>}</div>
      </div>

      <NumberPad value={input} onChange={setInput} onSubmit={submit} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`arena-mono text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="absolute top-0 left-0 h-9 w-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition">
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
