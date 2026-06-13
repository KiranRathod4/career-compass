import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type LevelInfo = {
  level: number;
  name: string;
  xp: number;
  prev_threshold: number;
  next_threshold: number;
  progress_pct: number;
};

export const LEVELS = [
  { lvl: 1, name: "Fresher", min: 0, max: 500 },
  { lvl: 2, name: "Contender", min: 500, max: 1500 },
  { lvl: 3, name: "Candidate", min: 1500, max: 3000 },
  { lvl: 4, name: "Interview Ready", min: 3000, max: 6000 },
  { lvl: 5, name: "Offer Hunter", min: 6000, max: 10000 },
  { lvl: 6, name: "Placed", min: 10000, max: 999999 },
];

export function computeLevel(xp: number): LevelInfo {
  const tier = LEVELS.find((l) => xp < l.max) ?? LEVELS[LEVELS.length - 1];
  const next = tier.max;
  const prev = tier.min;
  const pct = next === prev ? 100 : Math.round(((xp - prev) / (next - prev)) * 100);
  return { level: tier.lvl, name: tier.name, xp, prev_threshold: prev, next_threshold: next, progress_pct: pct };
}

export function useXP() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["xp-total", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("xp_transactions")
        .select("xp_amount")
        .eq("user_id", user!.id);
      const total = (data ?? []).reduce((s: number, r: any) => s + (r.xp_amount ?? 0), 0);
      return computeLevel(total);
    },
  });

  // Realtime: refresh on new XP transaction for current user
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`xp-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "xp_transactions", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["xp-total", user.id] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return query;
}

export function useAwardXP() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, xp, metadata }: { action: string; xp: number; metadata?: any }) => {
      const { error } = await (supabase as any).from("xp_transactions").insert({
        user_id: user!.id,
        action_type: action,
        xp_amount: xp,
        metadata: metadata ?? {},
      });
      if (error) throw error;
      return xp;
    },
    onSuccess: (xp) => {
      qc.invalidateQueries({ queryKey: ["xp-total"] });
      toast.success(`+${xp} XP earned`);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add XP"),
  });
}
