import { createFileRoute } from "@tanstack/react-router";
import { localDateKey } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PlanGate } from "@/components/plan-gate";
import { PodChat } from "@/components/pod-chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users2, Trophy, Target, Flame, Calendar,
  Copy, Crown, Sparkles, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/pod")({ component: PodPage });

function PodPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PlanGate min="elite" feature="My Pod">
        <PodContent />
      </PlanGate>
    </div>
  );
}

function PodContent() {
  const { user } = useAuth();
  const podCode = useMemo(() => `POD-${(user?.id ?? "").slice(0, 6).toUpperCase()}`, [user]);

  const { data: profile } = useQuery({
    queryKey: ["pod-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name, college_name").eq("id", user!.id).maybeSingle()).data,
  });

  // Stats for the lone-wolf pod (just self until peers join)
  const ws = getWeekStart();
  const { data: stats } = useQuery({
    queryKey: ["pod-stats", user?.id, ws],
    enabled: !!user,
    queryFn: async () => {
      const wsIso = new Date(ws).toISOString();
      const [dsa, apps, focus, daily] = await Promise.all([
        supabase.from("dsa_problems").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "done").gte("updated_at", wsIso),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user!.id).gte("applied_at", ws),
        supabase.from("focus_sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("completed", true).gte("started_at", wsIso),
        supabase.from("daily_tracker").select("date,dsa_done,aptitude_done,mock_done").eq("user_id", user!.id).gte("date", ws),
      ]);
      return {
        dsa: dsa.count ?? 0,
        apps: apps.count ?? 0,
        focus: focus.count ?? 0,
        active_days: (daily.data ?? []).length,
      };
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(podCode);
    toast.success("Pod code copied — share with your squad");
  };

  const me = {
    name: profile?.full_name ?? "You",
    college: profile?.college_name ?? "—",
    isOwner: true,
  };

  // 4 placeholder slots for future pod members
  const emptySlots = [0, 1, 2, 3];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-flat p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
              <Users2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">My Pod</h1>
                <Badge variant="secondary" className="gap-1"><Crown className="h-3 w-3" /> Elite</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                A 5-student squad. Grow together, hit weekly goals, push each other.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 h-9 rounded-md border border-border bg-background text-sm font-mono flex items-center">
              {podCode}
            </code>
            <Button size="sm" variant="outline" onClick={copyCode}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
            </Button>
          </div>
        </div>
      </div>

      {/* Pod stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="h-4 w-4" />} label="DSA this week" value={stats?.dsa ?? 0} />
        <StatCard icon={<Target className="h-4 w-4" />} label="Applications" value={stats?.apps ?? 0} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Focus sessions" value={stats?.focus ?? 0} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Active days" value={stats?.active_days ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card-flat p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="section-label">Pod members (1 / 5)</div>
              <Button size="sm" variant="ghost" onClick={copyCode}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Invite
              </Button>
            </div>

            <div className="space-y-2">
              <MemberRow {...me} weekly_score={(stats?.dsa ?? 0) * 3 + (stats?.apps ?? 0) * 5} />
              {emptySlots.map((i) => (
                <EmptySlot key={i} index={i + 2} onInvite={copyCode} />
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="card-flat p-5">
            <div className="section-label mb-4">Pod activity</div>
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
              When your pod members join, their wins show up here —
              DSA solves, applications, mock interviews, streaks.
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* Weekly goal */}
          <div className="card-flat p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-primary" />
              <div className="section-label">Weekly pod goal</div>
            </div>
            <GoalRow label="50 DSA solves" done={stats?.dsa ?? 0} target={50} />
            <GoalRow label="25 applications" done={stats?.apps ?? 0} target={25} />
            <GoalRow label="20 focus sessions" done={stats?.focus ?? 0} target={20} />
          </div>

          {/* Realtime chat */}
          <PodChat podCode={podCode} myName={me.name} />

          {/* Standup */}
          <div className="card-flat p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div className="section-label">Daily standup</div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 mt-2">
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> What did you do yesterday?</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> What will you do today?</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Any blockers?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1 font-mono">{value}</div>
    </div>
  );
}

function MemberRow({ name, college, isOwner, weekly_score }: { name: string; college: string; isOwner?: boolean; weekly_score: number }) {
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "ME";
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
      <Avatar><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-medium text-sm truncate">{name}</div>
          {isOwner && <Crown className="h-3 w-3 text-amber-500" />}
        </div>
        <div className="text-xs text-muted-foreground truncate">{college}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold flex items-center gap-1 justify-end"><Flame className="h-3 w-3 text-primary" />{weekly_score}</div>
        <div className="text-[10px] text-muted-foreground">this week</div>
      </div>
    </div>
  );
}

function EmptySlot({ index, onInvite }: { index: number; onInvite: () => void }) {
  return (
    <button
      onClick={onInvite}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition group text-left"
    >
      <div className="h-10 w-10 rounded-full border border-dashed border-border grid place-items-center text-muted-foreground text-xs">
        {index}
      </div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground group-hover:text-foreground">Empty slot</div>
        <div className="text-xs text-muted-foreground">Click to invite — share pod code</div>
      </div>
      <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
    </button>
  );
}

function GoalRow({ label, done, target }: { label: string; done: number; target: number }) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground font-mono">{done}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateKey(d);
}
