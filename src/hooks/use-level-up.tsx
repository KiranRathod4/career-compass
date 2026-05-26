import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useXP, LEVELS } from "./use-gamification";
import { toast } from "sonner";

const REWARD_DAYS: Record<number, number> = { 2: 2, 3: 3, 4: 3, 5: 5, 6: 7 };
const KEY = "taiyaar:last-level";

export function useLevelUpDetector() {
  const { user } = useAuth();
  const { data: level } = useXP();
  const qc = useQueryClient();
  const lastSeen = useRef<number | null>(null);
  const [unlock, setUnlock] = useState<{ level: number; name: string; days: number } | null>(null);

  useEffect(() => {
    if (!user || !level) return;
    if (lastSeen.current === null) {
      const stored = parseInt(localStorage.getItem(`${KEY}:${user.id}`) ?? "0", 10);
      lastSeen.current = stored || level.level;
      localStorage.setItem(`${KEY}:${user.id}`, String(level.level));
      return;
    }
    if (level.level > lastSeen.current) {
      const newLevel = level.level;
      const days = REWARD_DAYS[newLevel] ?? 0;
      lastSeen.current = newLevel;
      localStorage.setItem(`${KEY}:${user.id}`, String(newLevel));
      const name = LEVELS.find((l) => l.lvl === newLevel)?.name ?? "Next Level";
      if (days > 0) {
        const eliteUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        (supabase as any).from("level_rewards").insert({
          user_id: user.id,
          level_reached: newLevel,
          reason: "level_up",
          elite_until: eliteUntil,
        }).then(() => qc.invalidateQueries({ queryKey: ["plan"] }));
        setUnlock({ level: newLevel, name, days });
      } else {
        toast.success(`Level Up! ${name} 🎉`);
      }
    }
  }, [level, user, qc]);

  return { unlock, dismiss: () => setUnlock(null) };
}
