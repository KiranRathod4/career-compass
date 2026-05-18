import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useRouterState } from "@tanstack/react-router";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/timer": "Focus Timer",
  "/planner": "Daily Planner",
  "/dsa": "DSA Tracker",
  "/aptitude": "Aptitude Tracker",
  "/sql": "SQL Tracker",
  "/devops": "DevOps Hub",
  "/qa": "QA Hub",
  "/resources": "Resource Hub",
  "/skills": "Skill Matrix",
  "/jobs": "Job Tracker",
  "/companies": "Company Prep",
  "/network": "Network & Referrals",
  "/resumes": "Resume Vault",
  "/projects": "Project Tracker",
  "/interview": "Interview Prep",
  "/linkedin": "LinkedIn Planner",
  "/analytics": "Analytics",
  "/review": "Weekly Review",
  "/sprints": "Sprint Planner",
  "/settings": "Settings",
};

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Placement OS";
  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0]?.toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-2">
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
