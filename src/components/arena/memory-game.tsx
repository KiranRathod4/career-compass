import { useEffect, useState } from "react";
import { useAwardXP } from "@/hooks/use-gamification";
import { ArrowLeft, Heart } from "lucide-react";

const COLORS = ["#7c3aed", "#f59e0b", "#0d9488", "#db2777", "#2563eb"];

type Phase = "idle" | "show" | "input" | "gameover";

export function MemoryGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userIdx, setUserIdx] = useState(0);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const award = useAwardXP();

  const start = () => {
    const seq = [randTile()];
    setSequence(seq); setLevel(1); setLives(3); setUserIdx(0);
    playSeq(seq);
  };

  const playSeq = (seq: number[]) => {
    setPhase("show");
    setUserIdx(0);
    seq.forEach((tile, i) => {
      setTimeout(() => setFlashIdx(tile), i * 700 + 400);
      setTimeout(() => setFlashIdx(null), i * 700 + 900);
    });
    setTimeout(() => setPhase("input"), seq.length * 700 + 500);
  };

  const tap = (i: number) => {
    if (phase !== "input") return;
    const expected = sequence[userIdx];
    if (i !== expected) {
      setWrongTile(i);
      setTimeout(() => setWrongTile(null), 400);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setPhase("gameover");
        if (level > 1) award.mutate({ action: "arena_memory", xp: level * 5, metadata: { level } });
      }
      return;
    }
    setFlashIdx(i);
    setTimeout(() => setFlashIdx(null), 250);
    const nextIdx = userIdx + 1;
    if (nextIdx === sequence.length) {
      const newSeq = [...sequence, randTile()];
      setSequence(newSeq);
      setLevel((l) => l + 1);
      setTimeout(() => playSeq(newSeq), 800);
    } else {
      setUserIdx(nextIdx);
    }
  };

  return (
    <div className="relative max-w-md mx-auto">
      <button onClick={onBack} className="absolute -top-2 left-0 h-9 w-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /></button>

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Level</div>
          <div className="arena-mono text-3xl font-bold text-[#7c3aed]">{level}</div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`h-5 w-5 transition ${i < lives ? "text-rose-500 fill-rose-500" : "text-zinc-700"}`} />
          ))}
        </div>
      </div>

      {phase === "idle" && (
        <div className="text-center py-16">
          <h2 className="text-2xl font-extrabold tracking-wide mb-2">MEMORY</h2>
          <p className="text-sm text-zinc-400 mb-6">Sequence dekho. Phir dohrao.</p>
          <button onClick={start} className="h-12 px-10 rounded-xl bg-[#7c3aed] text-white font-bold">SHURU KARO</button>
        </div>
      )}

      {phase !== "idle" && (
        <>
          <div className="text-center mb-4 text-sm font-medium text-zinc-300 h-5">
            {phase === "show" && "Dekho!"}
            {phase === "input" && "Yaad karo! Ab tumhari baari."}
            {phase === "gameover" && `Game over! Level ${level} tak pahuncha.`}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => {
              const color = COLORS[i % COLORS.length];
              const isFlash = flashIdx === i;
              const isWrong = wrongTile === i;
              return (
                <button
                  key={i}
                  onClick={() => tap(i)}
                  disabled={phase !== "input"}
                  className={`aspect-square rounded-xl border transition-all duration-150 ${isWrong ? "border-rose-500 arena-anim-shake" : "border-[#7c3aed]/30"}`}
                  style={{
                    background: isFlash ? color : isWrong ? "rgba(225,29,72,0.3)" : "#1a1a24",
                    transform: isFlash ? "scale(1.06)" : "scale(1)",
                    boxShadow: isFlash ? `0 0 24px ${color}` : "none",
                  }}
                />
              );
            })}
          </div>
        </>
      )}

      {phase === "gameover" && (
        <div className="text-center mt-8">
          <div className="text-sm text-zinc-400 mb-1">+{level * 5} XP earned</div>
          <button onClick={start} className="mt-4 h-11 px-6 rounded-xl bg-[#7c3aed] text-white font-semibold">Phir try karo</button>
        </div>
      )}
    </div>
  );
}

function randTile(): number {
  return Math.floor(Math.random() * 9);
}
