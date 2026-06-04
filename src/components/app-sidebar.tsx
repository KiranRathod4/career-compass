import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Timer, Calendar, Code2, Calculator, Database, Server, Beaker,
  BookOpen, Radar as RadarIcon, BarChart3, Briefcase, Building2, Users, FolderOpen,
  GitBranch, Mic, TrendingUp, RotateCcw, Settings, Target, Trophy, Users2,
  PanelLeftClose, PanelLeftOpen, ArrowUpRight, Sparkles, Gamepad2, Medal, CalendarDays, Bot,
} from "lucide-react";
import { useXP } from "@/hooks/use-gamification";

type Item = { label: string; to: string; icon: typeof Home };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  { label: "Overview", items: [
    { label: "Dashboard", to: "/", icon: Home },
    { label: "Focus Timer", to: "/timer", icon: Timer },
    { label: "Daily Planner", to: "/planner", icon: Calendar },
    { label: "Calendar", to: "/calendar", icon: CalendarDays },
  ]},
  { label: "Prepare", items: [
    { label: "DSA Tracker", to: "/dsa", icon: Code2 },
    { label: "Aptitude", to: "/aptitude", icon: Calculator },
    { label: "SQL", to: "/sql", icon: Database },
    { label: "DevOps Hub", to: "/devops", icon: Server },
    { label: "QA Hub", to: "/qa", icon: Beaker },
    { label: "Custom Tracks", to: "/tracks", icon: BookOpen },
  ]},
  { label: "Career", items: [
    { label: "Job Tracker", to: "/jobs", icon: Briefcase },
    { label: "Company Prep", to: "/companies", icon: Building2 },
    { label: "Resume Vault", to: "/resumes", icon: FolderOpen },
    { label: "Network", to: "/network", icon: Users },
  ]},
  { label: "Grow", items: [
    { label: "AI Coach", to: "/coach", icon: Bot },
    { label: "Probability", to: "/probability", icon: TrendingUp },
    { label: "Resources", to: "/resources", icon: BookOpen },
    { label: "Projects", to: "/projects", icon: GitBranch },
    { label: "Interview Prep", to: "/interview", icon: Mic },
    { label: "LinkedIn Plan", to: "/linkedin", icon: TrendingUp },
  ]},
  { label: "Insights", items: [
    { label: "Skill Matrix", to: "/skills", icon: RadarIcon },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
    { label: "Weekly Review", to: "/review", icon: RotateCcw },
    { label: "Sprints", to: "/sprints", icon: Target },
  ]},
  { label: "Rewards", items: [
    { label: "Achievements", to: "/achievements", icon: Trophy },
    { label: "Challenges", to: "/challenges", icon: Target },
    { label: "Arena", to: "/arena", icon: Gamepad2 },
    { label: "Rankings", to: "/rankings", icon: Medal },
    { label: "My Pod", to: "/pod", icon: Users2 },
    { label: "Pricing", to: "/pricing", icon: Sparkles },
  ]},
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: level } = useXP();

  return (
    <aside
      className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-200"
      style={{ width: collapsed ? 52 : 232 }}
    >
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-0.5">
            <span className="text-[15px] font-bold tracking-[-0.3px] text-foreground leading-none">T</span>
            <ArrowUpRight className="h-3 w-3 -ml-0.5 -mt-2 text-primary" strokeWidth={3} />
            <span className="text-[15px] font-bold tracking-[-0.3px] leading-none">aiyaar</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="h-7 w-7 rounded-md hover:bg-sidebar-accent flex items-center justify-center text-muted-foreground transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && level && (
        <div className="mx-3 mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[var(--p-alpha-08)] text-primary text-[11px] font-medium w-fit">
          <span>{level.name}</span>
          <span className="text-primary/60">·</span>
          <span>Lv. {level.level}</span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            {!collapsed && (
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[color:var(--text-3)]">
                {g.label}
              </div>
            )}
            {g.items.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={`mx-1.5 flex items-center gap-2 px-2.5 h-[30px] rounded-md text-[13px] transition-[background-color,color] duration-[80ms] ${
                    active
                      ? "bg-[var(--p-alpha-08)] text-primary font-medium shadow-[inset_2px_0_0_var(--p-6)]"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border py-3">
        <Link
          to="/settings"
          title="Settings"
          className={`mx-1.5 flex items-center gap-2 px-2.5 h-[30px] rounded-md text-[13px] transition-colors ${
            pathname === "/settings"
              ? "bg-[var(--p-alpha-08)] text-primary font-medium shadow-[inset_2px_0_0_var(--p-6)]"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings & Plan</span>}
        </Link>
      </div>
    </aside>
  );
}

