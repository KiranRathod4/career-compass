import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArenaHome, type GameKey } from "@/components/arena/arena-home";
import { ArenaLocked } from "@/components/arena/arena-locked";
import { MathSprint } from "@/components/arena/math-sprint";
import { DailyPuzzles } from "@/components/arena/daily-puzzles";
import { WordUnscramble } from "@/components/arena/word-unscramble";
import { MemoryGame } from "@/components/arena/memory-game";
import { LogicGrid } from "@/components/arena/logic-grid";
import { AptitudeDuel } from "@/components/arena/aptitude-duel";

export const Route = createFileRoute("/_authenticated/arena")({ component: ArenaPage });

function ArenaPage() {
  const { user } = useAuth();
  const [game, setGame] = useState<GameKey | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile-study-windows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("study_windows").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const windows = (profile as any)?.study_windows ?? [];
  const locked = useMemo(() => isInStudyWindow(windows), [windows]);

  return (
    <div className="arena-root">
      {locked ? (
        <ArenaLocked windows={windows} />
      ) : game === null ? (
        <ArenaHome onPick={setGame} />
      ) : (
        <div className="max-w-5xl mx-auto pt-2">
          {game === "puzzles" && <DailyPuzzles onBack={() => setGame(null)} />}
          {game === "math" && <MathSprint onBack={() => setGame(null)} />}
          {game === "unscramble" && <WordUnscramble onBack={() => setGame(null)} />}
          {game === "memory" && <MemoryGame onBack={() => setGame(null)} />}
          {game === "logic" && <LogicGrid onBack={() => setGame(null)} />}
          {game === "duel" && <AptitudeDuel onBack={() => setGame(null)} />}
        </div>
      )}
    </div>
  );
}

function isInStudyWindow(windows: Array<{ day: string; start: string; end: string }>): boolean {
  if (!Array.isArray(windows) || windows.length === 0) return false;
  const now = new Date();
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const hm = now.toTimeString().slice(0, 5);
  return windows.some((w) => w.day === day && hm >= w.start && hm <= w.end);
}
