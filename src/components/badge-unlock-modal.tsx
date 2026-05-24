import type { BadgeDef } from "@/lib/badges";

export function BadgeUnlockModal({ badge, onClose }: { badge: BadgeDef | null; onClose: () => void }) {
  if (!badge) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="card-flat p-8 max-w-sm mx-4 text-center animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-4">{badge.emoji}</div>
        <div className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Badge Unlocked!</div>
        <h2 className="text-xl font-semibold">{badge.name}</h2>
        <p className="text-sm text-muted-foreground mt-2">{badge.description}</p>
        <button onClick={onClose} className="mt-6 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium">
          Shabaash! 🎉
        </button>
      </div>
    </div>
  );
}
