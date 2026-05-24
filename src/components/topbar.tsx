import { Moon, Sun, LogOut, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useRouterState } from "@tanstack/react-router";
import { useXP } from "@/hooks/use-gamification";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/timer": "Focus Timer",
  "/planner": "Daily Planner",
  "/dsa": "DSA Tracker",
  "/aptitude": "Aptitude Tracker",
  "/sql": "SQL Tracker",
  "/devops": "DevOps Hub",
  "/qa": "QA Hub",
  "/resources": "Resources",
  "/skills": "Skill Matrix",
  "/jobs": "Job Tracker",
  "/companies": "Company Prep",
  "/network": "Network",
  "/resumes": "Resume Vault",
  "/projects": "Projects",
  "/interview": "Interview Prep",
  "/linkedin": "LinkedIn Plan",
  "/analytics": "Analytics",
  "/review": "Weekly Review",
  "/sprints": "Sprints",
  "/achievements": "Achievements",
  "/challenges": "Challenges",
  "/pod": "My Pod",
  "/settings": "Settings & Plan",
};

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Taiyaar";
  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0]?.toUpperCase();
  const { data: level } = useXP();

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-3">
        {level && (
          <div
            className="hidden md:flex items-center gap-2 group"
            title={`${level.xp.toLocaleString()} / ${level.next_threshold.toLocaleString()} XP to Lv. ${level.level + 1}`}
          >
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
