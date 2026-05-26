import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type PlanTier = "free" | "pro" | "elite";

export function usePlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ plan: PlanTier; active: boolean; periodEnd: string | null; source: "subscription" | "reward" | "free"; rewardEnd: string | null }> => {
      const [subRes, rewardRes] = await Promise.all([
        supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", user!.id).maybeSingle(),
        (supabase as any).from("level_rewards").select("elite_until").eq("user_id", user!.id).eq("active", true).gte("elite_until", new Date().toISOString()).order("elite_until", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const sub = subRes.data;
      const subActive = sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      const subPlan: PlanTier = subActive ? (sub!.plan as PlanTier) : "free";

      const reward = rewardRes.data as { elite_until: string } | null;
      if (reward && TIER_RANK[subPlan] < TIER_RANK.elite) {
        return { plan: "elite", active: true, periodEnd: sub?.current_period_end ?? null, source: "reward", rewardEnd: reward.elite_until };
      }
      return {
        plan: subPlan,
        active: subActive,
        periodEnd: sub?.current_period_end ?? null,
        source: subActive ? "subscription" : "free",
        rewardEnd: reward?.elite_until ?? null,
      };
    },
  });
}

const TIER_RANK: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

export function useHasPlan(min: PlanTier): boolean {
  const { data } = usePlan();
  if (!data) return false;
  return TIER_RANK[data.plan] >= TIER_RANK[min];
}
