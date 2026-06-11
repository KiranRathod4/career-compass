import { useState } from "react";
import { localDateKey } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAwardXP } from "@/hooks/use-gamification";
import { ArrowLeft, Check, X } from "lucide-react";

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h; }

export function DailyPuzzles({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const award = useAwardXP();
  const today = new Date().toISOString().slice(0, 10);
  const [active, setActive] = useState(0);

  const { data: questions } = useQuery({
    queryKey: ["arena-questions-today", today],
    queryFn: async () => {
      const { data } = await (supabase as any).from("arena_questions").select("*").limit(80);
      const seed = Number(today.replace(/-/g, ""));
      return [...(data ?? [])].sort((a, b) => hash(a.id + seed) - hash(b.id + seed)).slice(0, 3);
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
      await (supabase as any).from("daily_puzzle_attempts").insert({ user_id: user!.id, question_id: q.id, puzzle_date: today, correct });
      if (correct) await award.mutateAsync({ action: "arena_puzzle", xp: 15, metadata: { question_id: q.id } });
      return correct;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["puzzle-attempts"] }),
  });

  const q = questions?.[active];
  const attempt = attempts?.find((a: any) => a.question_id === q?.id);
  const total = questions?.length ?? 3;
  const done = attempts?.length ?? 0;

  return (
    <div className="relative max-w-2xl mx-auto">
      <button onClick={onBack} className="absolute -top-2 left-0 h-9 w-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /></button>

      <div className="text-center mb-6 mt-2">
        <h2 className="text-2xl font-extrabold tracking-wide">DAILY PUZZLES</h2>
        <div className="flex items-center justify-center gap-2 mt-3">
          {Array.from({ length: total }).map((_, i) => {
            const att = attempts?.find((a: any) => a.question_id === questions?.[i]?.id);
            return <button key={i} onClick={() => setActive(i)} className={`h-2.5 w-2.5 rounded-full transition ${att ? (att.correct ? "bg-emerald-500" : "bg-rose-500") : i === active ? "bg-[#7c3aed]" : "bg-zinc-700"}`} />;
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-2">{done} / {total} solved today</p>
      </div>

      {done >= total && (
        <div className="arena-card p-6 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold">Aaj ke puzzles complete!</h3>
          <p className="text-sm text-zinc-400 mt-2">Kal phir aana for new puzzles.</p>
        </div>
      )}

      {q && (
        <PuzzleQuestion key={q.id} q={q} attempt={attempt} onAnswer={(ans) => submit.mutate({ q, answer: ans })} onNext={() => setActive((a) => Math.min(a + 1, total - 1))} hasNext={active < total - 1} />
      )}
    </div>
  );
}

function PuzzleQuestion({ q, attempt, onAnswer, onNext, hasNext }: { q: any; attempt: any; onAnswer: (a: string) => void; onNext: () => void; hasNext: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(!!attempt);
  const options: string[] = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
  const attempted = !!attempt;

  const pick = (opt: string) => {
    if (attempted || selected) return;
    setSelected(opt);
    setTimeout(() => { setRevealed(true); onAnswer(opt); }, 400);
  };

  const chosen = selected ?? (attempted ? options.find((o) => attempt?.correct ? o === q.correct_answer : o !== q.correct_answer) : null);

  return (
    <div className="arena-card p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <p className="text-lg font-semibold leading-snug">{q.question}</p>
        <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">{q.difficulty}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isCorrect = revealed && opt === q.correct_answer;
          const isWrong = revealed && opt === chosen && opt !== q.correct_answer;
          const isSelected = selected === opt && !revealed;
          return (
            <button
              key={opt}
              disabled={attempted || !!selected}
              onClick={() => pick(opt)}
              className={`relative min-h-[72px] p-4 rounded-xl border-2 text-left text-base font-medium transition-all ${
                isCorrect ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" :
                isWrong ? "border-rose-500 bg-rose-500/15 text-rose-300 arena-anim-shake" :
                isSelected ? "border-[#7c3aed] bg-[#7c3aed]/15" :
                "border-white/10 bg-[#1a1a24] hover:border-white/30 hover:bg-[#22222e]"
              }`}
            >
              {opt}
              {isCorrect && <Check className="absolute top-2 right-2 h-4 w-4" />}
              {isWrong && <X className="absolute top-2 right-2 h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {revealed && q.explanation && (
        <p className="text-sm text-zinc-400 mt-5 arena-anim-slide-in">💡 {q.explanation}</p>
      )}
      {revealed && hasNext && (
        <button onClick={() => { setSelected(null); setRevealed(false); onNext(); }} className="mt-6 w-full h-11 rounded-xl bg-[#7c3aed] text-white font-semibold">Agla question →</button>
      )}
    </div>
  );
}
