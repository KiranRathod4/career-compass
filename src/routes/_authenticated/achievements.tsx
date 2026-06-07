import { createFileRoute } from "@tanstack/react-router";
import { BADGES } from "@/lib/badges";
import { useEarnedBadges } from "@/hooks/use-badges";
import { useXP } from "@/hooks/use-gamification";
import { Trophy, Lock, Star, Gem } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/achievements")({ component: AchievementsPage });

const CATEGORIES = [
  { id: "dsa", label: "DSA" },
  { id: "jobs", label: "Jobs" },
  { id: "focus", label: "Focus" },
  { id: "streak", label: "Streaks" },
  { id: "consistency", label: "XP & Levels" },
  { id: "skill", label: "Skills" },
];

// Tier classification: which badge ids belong to which medal tier
const TIER_MAP: Record<string, "bronze" | "silver" | "gold" | "diamond"> = {
  first_solve: "bronze", first_apply: "bronze", focus_first: "bronze", streak_3: "bronze",
  dsa_10: "silver", apply_10: "silver", focus_10h: "silver", streak_7: "silver", xp_1k: "silver",
  dsa_50: "gold", apply_50: "gold", focus_50h: "gold", streak_30: "gold", xp_5k: "gold", hard_5: "gold",
  dsa_100: "diamond", xp_10k: "diamond",
};

function AchievementsPage() {
  const { data: earned = [] } = useEarnedBadges();
  const { data: level } = useXP();
  const earnedMap = new Map(earned.map((b) => [b.badge_id, b.earned_at]));
  const total = BADGES.length;
  const got = earned.length;

  const medals = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  earned.forEach((b) => {
    const t = TIER_MAP[b.badge_id];
    if (t) medals[t] += 1;
  });
  const totalMedals = medals.bronze + medals.silver + medals.gold + medals.diamond;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Achievements</h1>
          <p className="text-sm text-muted-foreground">Badges and milestones — keep grinding</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-primary">{got}<span className="text-base text-muted-foreground">/{total}</span></div>
          <div className="text-xs text-muted-foreground">unlocked</div>
        </div>
      </div>

      {/* Medals showcase */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#14101e] to-[#0d0a16] p-6">
        <div className="flex items-baseline gap-2 mb-5">
          <h2 className="text-lg font-bold">Medals</h2>
          <span className="text-sm text-muted-foreground">({totalMedals})</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MedalTier tier="Bronze" count={medals.bronze} from="#cd7f32" to="#7a4a1f" />
          <MedalTier tier="Silver" count={medals.silver} from="#e5e7eb" to="#9ca3af" />
          <MedalTier tier="Gold" count={medals.gold} from="#fbbf24" to="#d97706" />
          <MedalTier tier="Diamond" count={medals.diamond} from="#a78bfa" to="#7c3aed" diamond />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Trophy} label="Level" value={level?.level ?? 1} sub={level?.name ?? "Fresher"} />
        <Stat icon={Trophy} label="Total XP" value={(level?.xp ?? 0).toLocaleString()} sub="lifetime" />
        <Stat icon={Trophy} label="Badges" value={got} sub={`of ${total}`} />
        <Stat icon={Trophy} label="Progress" value={`${Math.round((got/total)*100)}%`} sub="completion" />
      </div>

      {CATEGORIES.map((cat) => {
        const items = BADGES.filter((b) => b.category === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id} className="card-flat p-5">
            <div className="section-label mb-4">{cat.label}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((b) => {
                const isEarned = earnedMap.has(b.id);
                const earnedAt = earnedMap.get(b.id);
                return (
                  <div key={b.id} className={`p-4 rounded-lg border text-center transition ${isEarned ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-70"}`}>
                    <div className="relative inline-block">
                      <div className="text-4xl">{isEarned ? b.emoji : "🔒"}</div>
                      {!isEarned && <Lock className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className={`mt-2 text-sm font-medium ${isEarned ? "" : "text-muted-foreground"}`}>{b.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{b.description}</div>
                    {isEarned && earnedAt && (
                      <div className="text-[10px] text-primary mt-2">{format(new Date(earnedAt), "dd MMM yyyy")}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function MedalTier({ tier, count, from, to, diamond }: { tier: string; count: number; from: string; to: string; diamond?: boolean }) {
  const earned = count > 0;
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/20 border border-white/5">
      <div className="relative">
        {/* Ribbon */}
        <svg className="absolute -bottom-3 left-1/2 -translate-x-1/2" width="48" height="20" viewBox="0 0 48 20" style={{ opacity: earned ? 0.9 : 0.3 }}>
          <polygon points="4,0 20,0 12,20 0,12" fill={from} />
          <polygon points="44,0 28,0 36,20 48,12" fill={to} />
        </svg>
        {/* Medal */}
        <div
          className={`relative h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition ${earned ? "" : "grayscale opacity-40"}`}
          style={{
            background: `radial-gradient(circle at 35% 30%, ${from}, ${to})`,
            boxShadow: earned ? `0 0 20px ${from}40, inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,255,255,0.3)` : "none",
          }}
        >
          {diamond ? (
            <Gem className="h-7 w-7 text-white drop-shadow" fill="currentColor" />
          ) : (
            <Star className="h-7 w-7 text-white drop-shadow" fill="currentColor" />
          )}
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{tier}</div>
        <div className="text-xl font-extrabold tabular-nums" style={{ color: earned ? from : undefined }}>{count}</div>
      </div>
    </div>
  );
}
