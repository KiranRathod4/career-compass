import { useEffect, useState } from "react";
import { useAwardXP } from "@/hooks/use-gamification";
import { UNSCRAMBLE_WORDS, scramble } from "@/lib/arena-data";
import { ArrowLeft } from "lucide-react";

type Tile = { letter: string; id: number; placed: boolean };

export function WordUnscramble({ onBack }: { onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const item = UNSCRAMBLE_WORDS[idx];
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(item.word));
  const [slots, setSlots] = useState<(Tile | null)[]>(() => Array(item.word.length).fill(null));
  const [state, setState] = useState<"playing" | "correct" | "wrong">("playing");
  const [timeLeft, setTimeLeft] = useState(30);
  const award = useAwardXP();

  useEffect(() => {
    if (state !== "playing") return;
    if (timeLeft <= 0) { setState("wrong"); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, state]);

  useEffect(() => {
    if (slots.every((s) => s !== null)) {
      const built = slots.map((s) => s!.letter).join("");
      if (built === item.word) {
        setState("correct");
        award.mutate({ action: "arena_unscramble", xp: 10, metadata: { word: item.word } });
      } else {
        setState("wrong");
      }
    }
  }, [slots]);

  const placeLetter = (tile: Tile) => {
    if (state !== "playing" || tile.placed) return;
    const empty = slots.findIndex((s) => s === null);
    if (empty < 0) return;
    setSlots((sl) => sl.map((s, i) => (i === empty ? tile : s)));
    setTiles((ts) => ts.map((t) => (t.id === tile.id ? { ...t, placed: true } : t)));
  };
  const removeFromSlot = (i: number) => {
    if (state !== "playing") return;
    const t = slots[i];
    if (!t) return;
    setSlots((sl) => sl.map((s, idx) => (idx === i ? null : s)));
    setTiles((ts) => ts.map((tt) => (tt.id === t.id ? { ...tt, placed: false } : tt)));
  };
  const next = () => {
    const n = (idx + 1) % UNSCRAMBLE_WORDS.length;
    setIdx(n);
    setTiles(buildTiles(UNSCRAMBLE_WORDS[n].word));
    setSlots(Array(UNSCRAMBLE_WORDS[n].word.length).fill(null));
    setState("playing");
    setTimeLeft(30);
  };
  const reset = () => {
    setTiles(buildTiles(item.word));
    setSlots(Array(item.word.length).fill(null));
    setState("playing");
    setTimeLeft(30);
  };

  const timerColor = timeLeft > 15 ? "bg-[#7c3aed]" : timeLeft > 7 ? "bg-[#f59e0b]" : "bg-[#e11d48]";

  return (
    <div className="relative max-w-2xl mx-auto">
      <button onClick={onBack} className="absolute -top-2 left-0 h-9 w-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /></button>

      <div className="text-center mt-2 mb-4">
        <span className="inline-block px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/40 text-teal-400 text-[10px] font-bold uppercase tracking-wider">Tech Vocabulary</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-8">
        <div className={`h-full ${timerColor} transition-all duration-1000`} style={{ width: `${(timeLeft / 30) * 100}%` }} />
      </div>

      <p className="text-center text-sm text-zinc-400 mb-3">{item.hint}</p>

      {/* Answer slots */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8 min-h-[64px]">
        {slots.map((t, i) => (
          <button
            key={i}
            onClick={() => removeFromSlot(i)}
            className={`arena-mono text-2xl font-bold w-12 h-16 rounded-xl flex items-center justify-center transition ${
              state === "correct" ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300" :
              state === "wrong" ? "bg-rose-500/20 border-2 border-rose-500 text-rose-300 arena-anim-shake" :
              t ? "bg-[#1e1e2e] border-2 border-[#7c3aed] text-white" :
              "border-2 border-dashed border-[#7c3aed]/40"
            }`}
          >
            {t?.letter}
          </button>
        ))}
      </div>

      {/* Scrambled tiles */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {tiles.map((t) => (
          <button
            key={t.id}
            onClick={() => placeLetter(t)}
            disabled={t.placed || state !== "playing"}
            className={`arena-mono text-2xl font-bold w-12 h-16 rounded-xl transition arena-tile-press ${
              t.placed ? "opacity-20 cursor-default" : "bg-[#1e1e2e] border border-[#7c3aed]/60 hover:bg-[#2a2a3e] hover:border-[#7c3aed]"
            }`}
          >
            {t.letter}
          </button>
        ))}
      </div>

      {state === "correct" && (
        <div className="text-center arena-anim-slide-in">
          <p className="text-emerald-400 font-semibold mb-3">Correct! {item.word} ✓</p>
          <button onClick={next} className="h-11 px-6 rounded-xl bg-[#7c3aed] text-white font-semibold">Next word →</button>
        </div>
      )}
      {state === "wrong" && (
        <div className="text-center arena-anim-slide-in">
          <p className="text-rose-400 font-semibold mb-3">Wrong. The word was: {item.word}</p>
          <button onClick={reset} className="h-11 px-6 rounded-xl border border-zinc-700 text-sm font-medium mr-2">Reset</button>
          <button onClick={next} className="h-11 px-6 rounded-xl bg-[#7c3aed] text-white font-semibold">Next word →</button>
        </div>
      )}
    </div>
  );
}

function buildTiles(word: string): Tile[] {
  const sc = scramble(word);
  return sc.split("").map((letter, id) => ({ letter, id, placed: false }));
}
