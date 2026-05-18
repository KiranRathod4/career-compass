import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Timer, Calendar, Code2, Calculator, Database, Server, Beaker,
  BookOpen, BarChart3, Briefcase, Building2, Users, FolderOpen,
  Wrench, Mic, Megaphone, TrendingUp, RotateCcw, Settings, Target,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

type Item = { label: string; to: string; icon: typeof Home };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  { label: "Overview", items: [
    { label: "Dashboard", to: "/", icon: Home },
    { label: "Focus Timer", to: "/timer", icon: Timer },
    { label: "Daily Planner", to: "/planner", icon: Calendar },
  ]},
  { label: "Preparation", items: [
    { label: "DSA Tracker", to: "/dsa", icon: Code2 },
    { label: "Aptitude", to: "/aptitude", icon: Calculator },
    { label: "SQL Tracker", to: "/sql", icon: Database },
    { label: "DevOps Hub", to: "/devops", icon: Server },
    { label: "QA Hub", to: "/qa", icon: Beaker },
  ]},
  { label: "Learning", items: [
    { label: "Resource Hub", to: "/resources", icon: BookOpen },
    { label: "Skill Matrix", to: "/skills", icon: BarChart3 },
  ]},
  { label: "Career", items: [
    { label: "Job Tracker", to: "/jobs", icon: Briefcase },
    { label: "Company Prep", to: "/companies", icon: Building2 },
    { label: "Network", to: "/network", icon: Users },
    { label: "Resume Vault", to: "/resumes", icon: FolderOpen },
  ]},
  { label: "Build", items: [
    { label: "Projects", to: "/projects", icon: Wrench },
    { label: "Interview Prep", to: "/interview", icon: Mic },
    { label: "LinkedIn Planner", to: "/linkedin", icon: Megaphone },
  ]},
  { label: "Review", items: [
    { label: "Analytics", to: "/analytics", icon: TrendingUp },
    { label: "Weekly Review", to: "/review", icon: RotateCcw },
    { label: "Sprints", to: "/sprints", icon: Target },
  ]},
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-200"
      style={{ width: collapsed ? 56 : 240 }}
    >
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">P</div>
            <span className="text-sm font-semibold">Placement OS</span>
          </div>
        )}
        <button onClick={() => setCollapsed((c) => !c)} className="h-7 w-7 rounded-md hover:bg-sidebar-accent flex items-center justify-center text-muted-foreground">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            {!collapsed && <div className="section-label px-2 mb-1">{g.label}</div>}
            {g.items.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2 h-8 rounded-md text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-sidebar-accent"
                  }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <Link to="/settings" title="Settings"
          className={`flex items-center gap-2.5 px-2 h-8 rounded-md text-sm ${
            pathname === "/settings" ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-sidebar-accent"
          }`}>
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
