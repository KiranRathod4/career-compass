import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, Medal, Flame, Lock, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { snapshotLeaderboards } from "@/lib/leaderboard.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rankings")({ component: RankingsPage });

type Tab = "study" | "arena";

function RankingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("study");

  const { data: profile } = useQuery({
    queryKey: ["profile-rank", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("leaderboard_opt_in, college_name, full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const optedIn = (profile as any)?.leaderboard_opt_in === true;
  const weekStart = getWeekStart();

  const { data: study } = useQuery({
    queryKey: ["study-leaderboard", weekStart],
    enabled: optedIn,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("study_leaderboard")
        .select("user_id, college_name, dsa_count, apps_count, focus_sessions, mock_tests, tracker_completion_pct, consistency_score")
        .eq("week_start", weekStart)
        .eq("opt_in", true)
        .order("consistency_score", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: arena } = useQuery({
    queryKey: ["arena-leaderboard", weekStart],
    enabled: optedIn,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("arena_leaderboard")
        .select("user_id, total_arena_xp, math_sprint_best, memory_best, duel_wins, puzzle_score")
        .eq("week_start", weekStart)
        .order("total_arena_xp", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (!optedIn) {
    return (
      <div className="max-w-2xl mx-auto card-flat p-10 text-center">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-semibold">Rankings locked hain</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-4">Leaderboard pe aane ke liye Settings mein opt-in karo. Tumhara naam aur college dikhega.</p>
        <Button asChild>
          <Link to="/settings">Settings kholo</Link>
        </Button>
      </div>
    );
  }

  const rows = tab === "study" ? (study ?? []) : (arena ?? []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="card-flat p-5">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Taiyaar Rankings</h1>
            <p className="text-xs text-muted-foreground">Hafte ki rankings — Monday ko reset hoti hain.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "study" ? "default" : "outline"} size="sm" onClick={() => setTab("study")}>📚 Study</Button>
        <Button variant={tab === "arena" ? "default" : "outline"} size="sm" onClick={() => setTab("arena")}>🎮 Arena</Button>
      </div>

      <div className="card-flat overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Is hafte abhi koi data nahi. Tum pehle ho — kuch karo, top par aao! 🚀
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 w-12">#</th>
                <th className="text-left p-3">User</th>
                {tab === "study" ? (
                  <>
                    <th className="text-right p-3 hidden md:table-cell">DSA</th>
                    <th className="text-right p-3 hidden md:table-cell">Apps</th>
                    <th className="text-right p-3 hidden md:table-cell">Focus</th>
                    <th className="text-right p-3">Score</th>
                  </>
                ) : (
                  <>
                    <th className="text-right p-3 hidden md:table-cell">Math</th>
                    <th className="text-right p-3 hidden md:table-cell">Memory</th>
                    <th className="text-right p-3 hidden md:table-cell">Duels</th>
                    <th className="text-right p-3">XP</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => {
                const isMe = r.user_id === user?.id;
                return (
                  <tr key={r.user_id} className={`border-t ${isMe ? "bg-primary/5 font-medium" : ""}`}>
                    <td className="p-3">
                      {i === 0 ? <Medal className="h-4 w-4 text-yellow-500" /> :
                       i === 1 ? <Medal className="h-4 w-4 text-zinc-400" /> :
                       i === 2 ? <Medal className="h-4 w-4 text-amber-700" /> :
                       <span className="text-muted-foreground">{i + 1}</span>}
                    </td>
                    <td className="p-3">
                      <div>{isMe ? "Tum" : `User ${r.user_id.slice(0, 6)}`}</div>
                      {r.college_name && <div className="text-xs text-muted-foreground">{r.college_name}</div>}
                    </td>
                    {tab === "study" ? (
                      <>
                        <td className="text-right p-3 hidden md:table-cell">{r.dsa_count}</td>
                        <td className="text-right p-3 hidden md:table-cell">{r.apps_count}</td>
                        <td className="text-right p-3 hidden md:table-cell">{r.focus_sessions}</td>
                        <td className="text-right p-3 font-semibold flex items-center justify-end gap-1"><Flame className="h-3 w-3 text-primary" />{Math.round(r.consistency_score)}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right p-3 hidden md:table-cell">{r.math_sprint_best}</td>
                        <td className="text-right p-3 hidden md:table-cell">{r.memory_best}</td>
                        <td className="text-right p-3 hidden md:table-cell">{r.duel_wins}</td>
                        <td className="text-right p-3 font-semibold">{r.total_arena_xp}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">Rankings opt-in based hain. Apna data hide karne ke liye Settings mein toggle band karo.</p>
    </div>
  );
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
