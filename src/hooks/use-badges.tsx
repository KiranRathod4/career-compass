import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BADGES, BADGE_MAP, type BadgeDef, type BadgeStats } from "@/lib/badges";
import confetti from "canvas-confetti";

export function useEarnedBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_badges").select("badge_id, earned_at").eq("user_id", user!.id);
      return (data ?? []) as Array<{ badge_id: string; earned_at: string }>;
    },
  });
}

export function fireConfetti() {
  const end = Date.now() + 800;
  const colors = ["#7c3aed", "#a78bfa", "#f59e0b", "#fbbf24"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function useBadgeUnlock() {
  const [unlocked, setUnlocked] = useState<BadgeDef | null>(null);
  return { unlocked, show: (b: BadgeDef) => { setUnlocked(b); fireConfetti(); }, close: () => setUnlocked(null) };
}

export function useCheckBadges() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<BadgeDef[]> => {
      if (!user) return [];
      const [dsa, jobs, focus, streaks, xp, earned] = await Promise.all([
        supabase.from("dsa_problems").select("status,difficulty").eq("user_id", user.id),
        supabase.from("jobs").select("status,applied_at").eq("user_id", user.id),
        supabase.from("focus_sessions").select("duration_minutes,completed").eq("user_id", user.id),
        (supabase as any).from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("xp_transactions").select("xp_amount").eq("user_id", user.id),
        (supabase as any).from("user_badges").select("badge_id").eq("user_id", user.id),
      ]);
      const dsaRows = (dsa.data ?? []) as any[];
      const jobRows = (jobs.data ?? []) as any[];
      const focusRows = (focus.data ?? []).filter((s: any) => s.completed) as any[];
      const streak = streaks.data ?? {};
      const totalXp = ((xp.data ?? []) as any[]).reduce((s, r) => s + (r.xp_amount ?? 0), 0);
      const earnedIds = new Set(((earned.data ?? []) as any[]).map((r) => r.badge_id));

      const stats: BadgeStats = {
        dsaSolved: dsaRows.filter((r) => r.status === "solved").length,
        dsaEasy: dsaRows.filter((r) => r.status === "solved" && r.difficulty === "Easy").length,
        dsaMedium: dsaRows.filter((r) => r.status === "solved" && r.difficulty === "Medium").length,
        dsaHard: dsaRows.filter((r) => r.status === "solved" && r.difficulty === "Hard").length,
        jobsApplied: jobRows.filter((r) => ["applied", "oa", "interview", "offer", "accepted"].includes(r.status)).length,
        focusMinutes: focusRows.reduce((s, r) => s + (r.duration_minutes ?? 0), 0),
        focusSessions: focusRows.length,
        dailyStreak: streak.daily_current ?? 0,
        dsaStreak: streak.dsa_current ?? 0,
        applyStreak: streak.apply_current ?? 0,
        totalXp,
      };

      const newlyEarned: BadgeDef[] = [];
      for (const b of BADGES) {
        if (!earnedIds.has(b.id) && b.check(stats)) {
          newlyEarned.push(b);
        }
      }
      if (newlyEarned.length > 0) {
        await (supabase as any).from("user_badges").insert(
          newlyEarned.map((b) => ({ user_id: user.id, badge_id: b.id }))
        );
      }
      return newlyEarned;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["badges"] }),
  });
}

export { BADGES, BADGE_MAP };
