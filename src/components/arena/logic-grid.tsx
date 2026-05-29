import { useEffect, useMemo, useState } from "react";
import { useAwardXP } from "@/hooks/use-gamification";
import { ArrowLeft } from "lucide-react";

// 4x4 mini-sudoku. Numbers 1-4. Each row/col/2x2 box must contain 1..4.
type Cell = { value: number; given: boolean; wrong?: boolean };

const PUZZLES: number[][][] = [
  [[1,0,0,4],[0,3,2,0],[0,2,3,0],[4,0,0,1]],
  [[0,2,0,4],[3,0,1,0],[0,3,0,2],[4,0,2,0]],
  [[2,0,0,1],[0,1,3,0],[0,4,2,0],[3,0,0,4]],
];

export function LogicGrid({ onBack }: { onBack: () => void }) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>(() => makeGrid(PUZZLES[0]));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const award = useAwardXP();

  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [solved]);

  const placeNumber = (n: number) => {
    if (!selected) return;
    const { r, c } = selected;
    if (grid[r][c].given) return;
    const conflict = hasConflict(grid, r, c, n);
    const next = grid.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? { ...cell, value: n, wrong: conflict } : cell)));
    setGrid(next);
    if (conflict) {
      setTimeout(() => setGrid((g) => g.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? { ...cell, value: 0, wrong: false } : cell)))), 500);
    } else if (isComplete(next)) {
      setSolved(true);
      award.mutate({ action: "arena_logic", xp: 20, metadata: { seconds } });
    }
  };

  const newPuzzle = () => {
    const n = (puzzleIdx + 1) % PUZZLES.length;
    setPuzzleIdx(n); setGrid(makeGrid(PUZZLES[n])); setSelected(null); setSeconds(0); setSolved(false);
  };

  return (
    <div className="relative max-w-md mx-auto">
      <button onClick={onBack} className="absolute -top-2 left-0 h-9 w-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /></button>

      <div className="text-center mt-2 mb-4">
        <h2 className="text-2xl font-extrabold tracking-wide">LOGIC GRID</h2>
        <p className="text-xs text-zinc-500 mt-1">Mini Sudoku · 4×4 · Numbers 1–4</p>
        <div className="arena-mono text-2xl font-bold text-[#2563eb] mt-3">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div>
      </div>

      <div className={`inline-grid grid-cols-4 gap-0.5 p-1 mx-auto rounded-xl bg-[#2563eb]/30 ${solved ? "arena-anim-tile-flash" : ""}`}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isSel = selected?.r === r && selected?.c === c;
            const boxBorder = (r === 1 || r === 3) ? "border-b-2 border-[#2563eb]/60" : "";
            const boxBorderR = (c === 1 || c === 3) ? "border-r-2 border-[#2563eb]/60" : "";
            return (
              <button
                key={`${r}${c}`}
                onClick={() => !cell.given && setSelected({ r, c })}
                className={`w-14 h-14 rounded-sm arena-mono text-2xl font-bold flex items-center justify-center transition ${boxBorder} ${boxBorderR} ${
                  cell.wrong ? "bg-rose-500/40 text-rose-200" :
                  cell.given ? "bg-[#1e1e2e] text-white" :
                  isSel ? "bg-[#7c3aed]/25 border border-[#7c3aed]" :
                  "bg-[#12121a] text-[#a78bfa] hover:bg-[#1a1a24]"
                }`}
              >
                {cell.value > 0 ? cell.value : ""}
              </button>
            );
          })
        )}
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => placeNumber(n)} disabled={!selected || solved} className="arena-tile arena-tile-press w-12 h-12 arena-mono text-xl font-bold disabled:opacity-30">{n}</button>
        ))}
        <button onClick={() => selected && placeNumber(0)} disabled={!selected || solved} className="arena-tile arena-tile-press w-12 h-12 text-xs disabled:opacity-30">CLR</button>
      </div>

      {solved && (
        <div className="mt-6 text-center arena-anim-slide-in">
          <p className="text-emerald-400 font-bold text-lg">Puzzle solved! ✓</p>
          <p className="text-sm text-zinc-400">Solved in {seconds}s · +20 XP</p>
          <button onClick={newPuzzle} className="mt-4 h-11 px-6 rounded-xl bg-[#7c3aed] text-white font-semibold">New puzzle</button>
        </div>
      )}
    </div>
  );
}

function makeGrid(p: number[][]): Cell[][] {
  return p.map((row) => row.map((v) => ({ value: v, given: v > 0 })));
}

function hasConflict(g: Cell[][], r: number, c: number, n: number): boolean {
  if (n === 0) return false;
  for (let i = 0; i < 4; i++) {
    if (i !== c && g[r][i].value === n) return true;
    if (i !== r && g[i][c].value === n) return true;
  }
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 2) * 2;
  for (let i = br; i < br + 2; i++)
    for (let j = bc; j < bc + 2; j++)
      if ((i !== r || j !== c) && g[i][j].value === n) return true;
  return false;
}

function isComplete(g: Cell[][]): boolean {
  return g.every((row) => row.every((c) => c.value > 0 && !c.wrong));
}
