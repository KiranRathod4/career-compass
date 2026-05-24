import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Target, CheckCircle2, Zap } from "lucide-react";
import { startOfWeek, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/challenges")({ component: ChallengesPage });

function ChallengesPage() {
  const { user } = useAuth();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: challenges = [] } = useQuery({
    queryKey: ["weekly-challenges", weekStart],
    queryFn: async () => {
      const { data } = await (supabase as any).from("weekly_challenges").select("*").eq("active", true).lte("week_start_date", weekStart).order("week_start_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["challenge-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_challenge_progress").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const progressMap = new Map<string, any>(progress.map((p: any) => [p.challenge_id, p]));
  const completed = challenges.filter((c: any) => progressMap.get(c.id)?.completed).length;
  const totalXp = challenges.reduce((s: number, c: any) => s + (progressMap.get(c.id)?.completed ? c.xp_reward : 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Weekly Challenges</h1>
        <p className="text-sm text-muted-foreground">Har hafte naye targets. Complete karo, XP earn karo.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat icon={Target} label="Active" value={challenges.length} />
        <Stat icon={CheckCircle2} label="Completed" value={completed} accent="text-success" />
        <Stat icon={Zap} label="XP Earned" value={totalXp.toLocaleString()} accent="text-primary" />
      </div>

      {challenges.length === 0 ? (
        <div className="card-flat p-10 text-center">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Is hafte ke liye koi challenge nahi hai. Naye challenges jaldi aayenge!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {challenges.map((c: any) => {
            const p = progressMap.get(c.id);
            const current = p?.current_count ?? 0;
            const pct = Math.min(100, Math.round((current / c.target_count) * 100));
            const done = p?.completed;
            return (
              <div key={c.id} className={`card-flat p-5 ${done ? "border-success/30" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.category ?? "Challenge"}</div>
                    <h3 className="font-medium mt-0.5">{c.title}</h3>
                  </div>
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">+{c.xp_reward} XP</div>
                </div>
                {c.description && <p className="text-sm text-muted-foreground mb-3">{c.description}</p>}
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">{current}/{c.target_count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
                {done && <div className="mt-3 text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed!</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
