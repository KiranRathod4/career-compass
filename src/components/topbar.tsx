import { Moon, Sun, LogOut, Sparkles, Gift } from "lucide-react";
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
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <LevelRewardModal unlock={unlock} onClose={dismiss} />
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-3">
        {plan?.source === "reward" && plan.rewardEnd && (
          <Link to="/pricing" className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-warning/10 text-warning text-xs font-medium" title={`Reward Elite ends ${plan.rewardEnd}`}>
            <Gift className="h-3.5 w-3.5" />
            Elite reward · {formatDistanceToNowStrict(new Date(plan.rewardEnd))} left
          </Link>
        )}
        <DistractionButton />
        {level && (
          <div className="hidden md:flex items-center gap-2" title={`${level.xp.toLocaleString()} / ${level.next_threshold.toLocaleString()} XP to Lv. ${level.level + 1}`}>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{level.xp.toLocaleString()} XP</span>
            <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, level.progress_pct)}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground">Lv. {level.level}</span>
          </div>
        )}
        <button onClick={toggle} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground" title="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button onClick={signOut} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">{initial}</div>
      </div>
    </header>
  );
}
