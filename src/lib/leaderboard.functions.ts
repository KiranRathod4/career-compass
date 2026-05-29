import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export const snapshotLeaderboards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const ws = weekStart();
    const weekStartDate = new Date(ws);

    const [{ data: profile }, { data: dsa }, { data: jobs }, { data: focus }, { data: daily }, { data: xp }] = await Promise.all([
      supabase.from("profiles").select("leaderboard_opt_in, college_name").eq("id", userId).maybeSingle(),
      supabase.from("dsa_problems").select("id, status, updated_at").eq("user_id", userId).eq("status", "done").gte("updated_at", weekStartDate.toISOString()),
      supabase.from("jobs").select("id, applied_at, status").eq("user_id", userId).gte("applied_at", ws),
      supabase.from("focus_sessions").select("id, completed").eq("user_id", userId).eq("completed", true).gte("started_at", weekStartDate.toISOString()),
      supabase.from("daily_tracker").select("date, dsa_done, aptitude_done, mock_done, applications_count").eq("user_id", userId).gte("date", ws),
      supabase.from("xp_transactions").select("xp_amount, action_type, metadata").eq("user_id", userId).gte("created_at", weekStartDate.toISOString()),
    ]);

    const dsaCount = (dsa ?? []).length;
    const appsCount = (jobs ?? []).length;
    const focusCount = (focus ?? []).length;
    const mockCount = (daily ?? []).filter((d: any) => d.mock_done).length;
    const days = (daily ?? []).length;
    const trackerPct = days > 0 ? Math.round(((daily ?? []).reduce((s: number, d: any) => s + (Number(d.dsa_done) + Number(d.aptitude_done) + Number(d.mock_done)) / 3, 0) / days) * 100) : 0;

    const consistency = Math.round(dsaCount * 3 + appsCount * 5 + focusCount * 2 + mockCount * 10 + trackerPct * 0.5);

    const optIn = profile?.leaderboard_opt_in === true;

    await supabase.from("study_leaderboard").upsert(
      {
        user_id: userId,
        week_start: ws,
        college_name: profile?.college_name ?? null,
        opt_in: optIn,
        dsa_count: dsaCount,
        apps_count: appsCount,
        focus_sessions: focusCount,
        mock_tests: mockCount,
        tracker_completion_pct: trackerPct,
        consistency_score: consistency,
      },
      { onConflict: "user_id,week_start" }
    );

    // Arena snapshot
    const arenaXP = (xp ?? []).filter((x: any) => x.action_type?.startsWith("arena_")).reduce((s: number, x: any) => s + (x.xp_amount || 0), 0);
    const puzzleScore = (xp ?? []).filter((x: any) => x.action_type === "arena_puzzle").reduce((s: number, x: any) => s + (x.xp_amount || 0), 0);
    const mathBest = Math.max(0, ...(xp ?? []).filter((x: any) => x.action_type === "arena_math").map((x: any) => x.metadata?.score ?? 0));
    const memoryBest = Math.max(0, ...(xp ?? []).filter((x: any) => x.action_type === "arena_memory").map((x: any) => x.metadata?.level ?? 0));

    await supabase.from("arena_leaderboard").upsert(
      {
        user_id: userId,
        week_start: ws,
        total_arena_xp: arenaXP,
        puzzle_score: puzzleScore,
        math_sprint_best: mathBest,
        memory_best: memoryBest,
      },
      { onConflict: "user_id,week_start" }
    );

    return { ok: true, consistency, dsaCount, appsCount };
  });
