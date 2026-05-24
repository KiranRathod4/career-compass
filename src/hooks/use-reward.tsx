import { useAwardXP } from "@/hooks/use-gamification";
import { useCheckBadges, useBadgeUnlock, fireConfetti } from "@/hooks/use-badges";
import { BadgeUnlockModal } from "@/components/badge-unlock-modal";

export function useReward() {
  const award = useAwardXP();
  const check = useCheckBadges();
  const unlock = useBadgeUnlock();

  const reward = async (action: string, xp: number, opts?: { confetti?: boolean; metadata?: any }) => {
    try {
      await award.mutateAsync({ action, xp, metadata: opts?.metadata });
      if (opts?.confetti) fireConfetti();
      const newBadges = await check.mutateAsync();
      if (newBadges.length > 0) unlock.show(newBadges[0]);
    } catch (e) {
      // toast handled by useAwardXP
    }
  };

  return { reward, unlocked: unlock.unlocked, closeUnlock: unlock.close };
}

export { BadgeUnlockModal };
