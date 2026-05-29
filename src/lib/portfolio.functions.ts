import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPublicPortfolio = createServerFn({ method: "GET" })
  .inputValidator((data: { username: string }) => {
    if (!data?.username || !/^[a-zA-Z0-9_-]{2,40}$/.test(data.username)) {
      throw new Error("Invalid username");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, college_name, graduation_year, target_domains, linkedin_url, github_url, leaderboard_opt_in")
      .eq("username", data.username)
      .maybeSingle();

    if (!profile) throw new Error("Profile not found");

    const userId = profile.id;
    const [
      { data: xpRows },
      { data: badges },
      { data: projects },
      { data: skills },
      { data: dsa },
      { data: jobs },
      { data: daily },
    ] = await Promise.all([
      supabaseAdmin.from("xp_transactions").select("xp_amount, created_at").eq("user_id", userId),
      supabaseAdmin.from("user_badges").select("badge_id, earned_at").eq("user_id", userId),
      supabaseAdmin.from("projects").select("title, description, tech_stack, repo_url, demo_url, status").eq("user_id", userId).limit(20),
      supabaseAdmin.from("skills").select("name, category, current_level, target_level").eq("user_id", userId),
      supabaseAdmin.from("dsa_problems").select("id, status, difficulty, topic").eq("user_id", userId),
      supabaseAdmin.from("jobs").select("id, status").eq("user_id", userId),
      supabaseAdmin.from("daily_tracker").select("date, deep_work_hours").eq("user_id", userId).gte("date", new Date(Date.now() - 365 * 24 * 3600_000).toISOString().slice(0, 10)),
    ]);

    const totalXP = (xpRows ?? []).reduce((s: number, r: any) => s + (r.xp_amount || 0), 0);
    const { data: lvl } = await supabaseAdmin.rpc("get_user_level", { p_xp: totalXP });

    const dsaSolved = (dsa ?? []).filter((d: any) => d.status === "done").length;
    const appsTotal = (jobs ?? []).length;
    const interviews = (jobs ?? []).filter((j: any) => ["interview", "offer"].includes(j.status)).length;
    const offers = (jobs ?? []).filter((j: any) => j.status === "offer").length;

    const heatmap: Record<string, number> = {};
    (daily ?? []).forEach((d: any) => {
      heatmap[d.date] = Number(d.deep_work_hours || 0);
    });

    return {
      profile,
      level: lvl,
      totalXP,
      badges: badges ?? [],
      projects: projects ?? [],
      skills: skills ?? [],
      stats: { dsaSolved, appsTotal, interviews, offers },
      heatmap,
    };
  });
