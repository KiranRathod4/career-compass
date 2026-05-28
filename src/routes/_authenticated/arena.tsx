import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAwardXP } from "@/hooks/use-gamification";
import { Gamepad2, Brain, Calculator, Shuffle, Trophy, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UNSCRAMBLE_WORDS, scramble, randomMathProblem } from "@/lib/arena-data";

export const Route = createFileRoute("/_authenticated/arena")({ component: ArenaPage });

type Game = "puzzles" | "math" | "memory" | "unscramble";

function ArenaPage() {
  const [game, setGame] = useState<Game>("puzzles");
  const { user } = useAuth();

  // Check study windows lock
  const { data: profile } = useQuery({
    queryKey: ["profile-study-windows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("study_windows").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const locked = useMemo(() => isInStudyWindow((profile as any)?.study_windows ?? []), [profile]);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="card-flat p-5 bg-zinc-900 text-zinc-50 border-zinc-800">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-xl font-semibold">Arena</h1>
            <p className="text-xs text-zinc-400">Pehle padh lo, phir khelo. Daily puzzles solve karke XP kamao.</p>
          </div>
        </div>
      </div>

      {locked && (
        <div className="card-flat p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          <div className="text-sm">
            <div className="font-medium">Study window active hai — Arena locked.</div>
            <div className="text-xs text-muted-foreground">Pehle padhai khatam karo. 📚 → 🎮</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GameTile icon={<Brain className="h-5 w-5" />} title="Daily Puzzles" desc="3 questions/day" active={game === "puzzles"} onClick={() => setGame("puzzles")} />
        <GameTile icon={<Calculator className="h-5 w-5" />} title="Math Sprint" desc="60s, kitne kar sakte ho?" active={game === "math"} onClick={() => setGame("math")} />
        <GameTile icon={<Shuffle className="h-5 w-5" />} title="Word Unscramble" desc="Tech vocab" active={game === "unscramble"} onClick={() => setGame("unscramble")} />
        <GameTile icon={<Trophy className="h-5 w-5" />} title="Memory" desc="Sequence yaad rakho" active={game === "memory"} onClick={() => setGame("memory")} />
      </div>

      <div className={locked ? "opacity-40 pointer-events-none" : ""}>
        {game === "puzzles" && <DailyPuzzles />}
        {game === "math" && <MathSprint />}
        {game === "unscramble" && <Unscramble />}
        {game === "memory" && <MemoryGame />}
      </div>
    </div>
  );
}

function GameTile({ icon, title, desc, active, onClick }: { icon: React.ReactNode; title: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`card-flat p-4 text-left transition-all ${active ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30"}`}>
      <div className="flex items-center gap-2 text-primary">{icon}<span className="font-medium text-sm text-foreground">{title}</span></div>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </button>
  );
}

function isInStudyWindow(windows: Array<{ day: string; start: string; end: string }>): boolean {
  if (!Array.isArray(windows) || windows.length === 0) return false;
  const now = new Date();
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const hm = now.toTimeString().slice(0, 5);
  return windows.some((w) => w.day === day && hm >= w.start && hm <= w.end);
}

/* ------------------ Daily Puzzles ------------------ */
function DailyPuzzles() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const award = useAwardXP();
  const today = new Date().toISOString().slice(0, 10);

  const { data: questions } = useQuery({
    queryKey: ["arena-questions-today"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("arena_questions").select("*").eq("type", "puzzle").limit(50);
      // Pick 3 stable by date seed
      const seed = Number(today.replace(/-/g, ""));
      const shuffled = [...(data ?? [])].sort((a, b) => hash(a.id + seed) - hash(b.id + seed));
      return shuffled.slice(0, 3);
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["puzzle-attempts", today, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("daily_puzzle_attempts").select("*").eq("user_id", user!.id).eq("puzzle_date", today);
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async ({ q, answer }: { q: any; answer: string }) => {
      const correct = answer === q.correct_answer;
      await (supabase as any).from("daily_puzzle_attempts").insert({
        user_id: user!.id, question_id: q.id, puzzle_date: today, correct,
      });
      if (correct) await award.mutateAsync({ action: "arena_puzzle", xp: 15, metadata: { question_id: q.id } });
      return correct;
    },
    onSuccess: (correct) => {
      qc.invalidateQueries({ queryKey: ["puzzle-attempts"] });
      if (correct) toast.success("Sahi! +15 XP. Dimaag tez hai 🧠");
      else toast.error("Galat. Par +15 XP toh mila nahi. Dobara nahi mil sakta.");
    },
  });

  const allDone = (attempts?.length ?? 0) >= (questions?.length ?? 3);

  return (
    <div className="card-flat p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Aaj ke 3 puzzles</h2>
        <span className="text-xs text-muted-foreground">{attempts?.length ?? 0} / {questions?.length ?? 3} solved</span>
      </div>
      {allDone && <div className="text-sm p-3 rounded bg-primary/10 text-primary">Aaj ke sab puzzles solve! Kal naye milenge. 💡</div>}
      {questions?.map((q: any) => {
        const attempt = attempts?.find((a: any) => a.question_id === q.id);
        return <PuzzleCard key={q.id} q={q} attempted={!!attempt} attemptCorrect={attempt?.correct} onSubmit={(a) => submit.mutate({ q, answer: a })} />;
      })}
    </div>
  );
}

function PuzzleCard({ q, attempted, attemptCorrect, onSubmit }: { q: any; attempted: boolean; attemptCorrect?: boolean; onSubmit: (a: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options: string[] = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
  return (
    <div className="border-t pt-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{q.question}</p>
        <span className="text-xs px-2 py-0.5 rounded bg-muted">{q.difficulty}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        {options.map((opt) => {
          const isCorrect = attempted && opt === q.correct_answer;
          const isWrong = attempted && opt === selected && opt !== q.correct_answer;
          return (
            <button
              key={opt}
              disabled={attempted}
              onClick={() => { setSelected(opt); onSubmit(opt); }}
              className={`text-left text-sm p-2 rounded border ${
                isCorrect ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400" :
                isWrong ? "bg-destructive/10 border-destructive text-destructive" :
                "hover:bg-accent border-border"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {attempted && q.explanation && (
        <p className="text-xs text-muted-foreground mt-2">💡 {q.explanation}</p>
      )}
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

/* ------------------ Math Sprint ------------------ */
function MathSprint() {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState(() => randomMathProblem());
  const [answer, setAnswer] = useState("");
  const [finished, setFinished] = useState(false);
  const award = useAwardXP();

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setRunning(false); setFinished(true);
      if (score > 0) award.mutate({ action: "math_sprint", xp: Math.min(score * 2, 50), metadata: { score } });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, timeLeft]);

  const start = () => { setScore(0); setTimeLeft(60); setFinished(false); setProblem(randomMathProblem()); setAnswer(""); setRunning(true); };
  const submit = () => {
    if (Number(answer) === problem.answer) setScore((s) => s + 1);
    setAnswer(""); setProblem(randomMathProblem());
  };

  return (
    <div className="card-flat p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Math Sprint — 60 seconds</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{timeLeft}s</span>
          <span>Score: <b>{score}</b></span>
        </div>
      </div>
      {!running && !finished && (
        <Button onClick={start}>Shuru karo</Button>
      )}
      {running && (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-center py-6 bg-muted/50 rounded">{problem.q} = ?</div>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
            <Input autoFocus type="number" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Jawab likho..." />
            <Button type="submit">Submit</Button>
          </form>
        </div>
      )}
      {finished && (
        <div className="space-y-3">
          <div className="text-center p-6 bg-muted/50 rounded">
            <div className="text-4xl font-bold">{score}</div>
            <div className="text-sm text-muted-foreground mt-1">sahi jawab • +{Math.min(score * 2, 50)} XP</div>
          </div>
          <Button onClick={start} variant="outline" className="w-full">Phir try karo</Button>
        </div>
      )}
    </div>
  );
}

/* ------------------ Word Unscramble ------------------ */
function Unscramble() {
  const [idx, setIdx] = useState(0);
  const item = UNSCRAMBLE_WORDS[idx];
  const [scrambled, setScrambled] = useState(() => scramble(item.word));
  const [guess, setGuess] = useState("");
  const [solved, setSolved] = useState(false);
  const award = useAwardXP();

  const next = () => {
    const n = (idx + 1) % UNSCRAMBLE_WORDS.length;
    setIdx(n); setScrambled(scramble(UNSCRAMBLE_WORDS[n].word)); setGuess(""); setSolved(false);
  };

  const submit = () => {
    if (guess.trim().toUpperCase() === item.word) {
      setSolved(true);
      award.mutate({ action: "unscramble", xp: 10, metadata: { word: item.word } });
    } else {
      toast.error("Galat — fir try karo.");
    }
  };

  return (
    <div className="card-flat p-5">
      <h2 className="font-semibold mb-4">Word Unscramble</h2>
      <p className="text-xs text-muted-foreground mb-2">Hint: {item.hint}</p>
      <div className="text-3xl font-bold text-center py-6 bg-muted/50 rounded tracking-widest">{scrambled}</div>
      {!solved ? (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 mt-3">
          <Input autoFocus value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Sahi word..." />
          <Button type="submit">Check</Button>
        </form>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="p-3 rounded bg-green-500/10 text-green-700 dark:text-green-400 text-sm">Sahi! +10 XP. Word tha: <b>{item.word}</b></div>
          <Button onClick={next} className="w-full">Agla word</Button>
        </div>
      )}
    </div>
  );
}

/* ------------------ Memory Sequence ------------------ */
function MemoryGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [showIdx, setShowIdx] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "done">("idle");
  const [level, setLevel] = useState(0);
  const award = useAwardXP();

  const start = () => {
    const newSeq = [Math.floor(Math.random() * 4)];
    setSequence(newSeq); setUserInput([]); setLevel(1); playSequence(newSeq);
  };

  const playSequence = (seq: number[]) => {
    setPhase("show"); setUserInput([]);
    seq.forEach((n, i) => {
      setTimeout(() => setShowIdx(n), i * 700);
      setTimeout(() => setShowIdx(null), i * 700 + 400);
    });
    setTimeout(() => setPhase("input"), seq.length * 700);
  };

  const handleClick = (n: number) => {
    if (phase !== "input") return;
    const next = [...userInput, n];
    setUserInput(next);
    if (sequence[next.length - 1] !== n) {
      setPhase("done");
      if (level > 1) award.mutate({ action: "memory_game", xp: level * 5, metadata: { level } });
      toast.error(`Game over! Level ${level} reach kiya.`);
      return;
    }
    if (next.length === sequence.length) {
      const newSeq = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(newSeq); setLevel(level + 1);
      setTimeout(() => playSequence(newSeq), 500);
    }
  };

  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500"];
  return (
    <div className="card-flat p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Memory Sequence</h2>
        <span className="text-sm">Level: <b>{level}</b></span>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            disabled={phase !== "input"}
            onClick={() => handleClick(n)}
            className={`h-24 rounded transition-opacity ${colors[n]} ${showIdx === n ? "opacity-100" : "opacity-40"} disabled:cursor-not-allowed`}
          />
        ))}
      </div>
      <div className="mt-4 text-center">
        {phase === "idle" && <Button onClick={start}>Shuru karo</Button>}
        {phase === "show" && <p className="text-sm text-muted-foreground">Dhyaan se dekho...</p>}
        {phase === "input" && <p className="text-sm text-muted-foreground">Ab apni baari — sequence dohrao</p>}
        {phase === "done" && <Button onClick={start}>Phir try karo</Button>}
      </div>
    </div>
  );
}
