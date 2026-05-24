import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type PlanTier = "free" | "pro" | "elite";

export function usePlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ plan: PlanTier; active: boolean; periodEnd: string | null }> => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!data) return { plan: "free", active: false, periodEnd: null };
      const active = data.status === "active" &&
        (!data.current_period_end || new Date(data.current_period_end) > new Date());
      return {
        plan: (active ? (data.plan as PlanTier) : "free"),
        active,
        periodEnd: data.current_period_end,
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
