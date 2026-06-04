import { Moon, Sun, LogOut, Gift } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useRouterState, Link } from "@tanstack/react-router";
import { useXP } from "@/hooks/use-gamification";
import { usePlan } from "@/hooks/use-plan";
import { useLevelUpDetector } from "@/hooks/use-level-up";
import { DistractionButton } from "./distraction-button";
import { LevelRewardModal } from "./level-reward-modal";
import { PortfolioDrawer } from "./portfolio-drawer";
import { formatDistanceToNowStrict } from "date-fns";


const titles: Record<string, string> = {
  "/": "Dashboard", "/timer": "Focus Timer", "/planner": "Daily Planner",
  "/dsa": "DSA Tracker", "/aptitude": "Aptitude Tracker", "/sql": "SQL Tracker",
  "/devops": "DevOps Hub", "/qa": "QA Hub", "/resources": "Resources",
  "/skills": "Skill Matrix", "/jobs": "Job Tracker", "/companies": "Company Prep",
  "/network": "Network", "/resumes": "Resume Vault", "/projects": "Projects",
  "/interview": "Interview Prep", "/linkedin": "LinkedIn Plan", "/analytics": "Analytics",
  "/review": "Weekly Review", "/sprints": "Sprints", "/achievements": "Achievements",
  "/challenges": "Challenges", "/pod": "My Pod", "/settings": "Settings & Plan",
  "/pricing": "Pricing", "/calendar": "Calendar", "/arena": "Arena", "/rankings": "Taiyaar Rankings",
  "/coach": "AI Career Coach",
};

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Taiyaar";
  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0]?.toUpperCase();
  const { data: level } = useXP();
  const { data: plan } = usePlan();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { unlock, dismiss } = useLevelUpDetector();

  return (
    <header className="h-[52px] sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-[12px] flex items-center justify-between px-6 shrink-0">
      <LevelRewardModal unlock={unlock} onClose={dismiss} />
      <h1 className="text-[14px] font-medium text-foreground tracking-[-0.1px]">{title}</h1>
      <div className="flex items-center gap-2">
        {plan?.source === "reward" && plan.rewardEnd && (
          <Link
            to="/pricing"
            className="hidden md:inline-flex items-center gap-1.5 h-7 px-2 rounded-sm bg-[var(--a-alpha-10)] text-[color:var(--a-6)] text-[11px] font-medium"
            title={`Reward Elite ends ${plan.rewardEnd}`}
          >
            <Gift className="h-3 w-3" />
            Elite · {formatDistanceToNowStrict(new Date(plan.rewardEnd))} left
          </Link>
        )}
        <DistractionButton />
        {level && (
          <div
            className="hidden lg:flex items-center gap-2 mr-1"
            title={`${level.xp.toLocaleString()} / ${level.next_threshold.toLocaleString()} XP to Lv. ${level.level + 1}`}
          >
            <span className="text-[12px] text-[color:var(--text-3)]">{level.name}</span>
            <div className="w-[140px] h-[3px] rounded-full bg-[color:var(--border-2)] overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: `${Math.min(100, level.progress_pct)}%` }}
              />
            </div>
            <span className="text-[12px] font-mono text-[color:var(--text-3)]">{level.xp.toLocaleString()} XP</span>
          </div>
        )}
        <button
          onClick={toggle}
          className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={signOut}
          className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="h-7 w-7 rounded-full bg-[var(--p-alpha-12)] text-primary flex items-center justify-center text-[11px] font-semibold hover:bg-[var(--p-alpha-08)] transition-colors"
          title="My portfolio"
        >
          {initial}
        </button>
      </div>
      <PortfolioDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );

}
