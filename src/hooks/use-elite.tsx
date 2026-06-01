import { useHasPlan, usePlan } from "./use-plan";

export function useIsElite(): boolean {
  return useHasPlan("elite");
}

export function useIsPro(): boolean {
  return useHasPlan("pro");
}

export function useEliteStatus() {
  const { data, isLoading } = usePlan();
  return {
    isElite: data?.plan === "elite",
    isPro: data?.plan === "pro" || data?.plan === "elite",
    plan: data?.plan ?? "free",
    source: data?.source,
    rewardEnd: data?.rewardEnd,
    isLoading,
  };
}
