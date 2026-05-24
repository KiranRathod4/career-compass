import { createFileRoute } from "@tanstack/react-router";
import { BADGES } from "@/lib/badges";
import { useEarnedBadges } from "@/hooks/use-badges";
import { useXP } from "@/hooks/use-gamification";
import { Trophy, Lock } from "lucide-react";
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

function AchievementsPage() {
  const { data: earned = [] } = useEarnedBadges();
  const { data: level } = useXP();
  const earnedMap = new Map(earned.map((b) => [b.badge_id, b.earned_at]));
  const total = BADGES.length;
  const got = earned.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Achievements</h1>
          <p className="text-sm text-muted-foreground">Badges aur milestones — keep grinding 💪</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-primary">{got}<span className="text-base text-muted-foreground">/{total}</span></div>
          <div className="text-xs text-muted-foreground">unlocked</div>
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
