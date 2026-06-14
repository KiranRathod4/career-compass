import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ZONES, ZONE_LIST, arenaWeekStart, type ZoneId } from "@/lib/arena-zones";
import { ArrowLeft, Trophy, Users, Swords, Radio, Clock, Flame, Crown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/arena/zone/$zoneId")({
  component: ZoneWarRoom,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-red-400">War room failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm text-zinc-400">Zone not found.</div>,
});

function ZoneWarRoom() {
  const { zoneId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const zone = (ZONES as Record<string, typeof ZONES.north>)[zoneId];
  const weekStart = arenaWeekStart();

  if (!zone) {
    return (
      <div className="arena-root p-8">
        <p className="text-zinc-300">Unknown zone.</p>
        <Link to="/arena" className="text-[#a78bfa] text-sm underline mt-3 inline-block">Back to Arena</Link>
      </div>
    );
  }

  // Weekly zone leaderboard
  const { data: rankings = [] } = useQuery({
    queryKey: ["zone-warroom-rankings", zoneId, weekStart],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("zone_rankings")
        .select("user_id, weekly_xp, zone_rank")
        .eq("zone", zoneId)
        .eq("week_start", weekStart)
        .order("weekly_xp", { ascending: false })
        .limit(25);
      return (data ?? []) as Array<{ user_id: string; weekly_xp: number; zone_rank: number | null }>;
    },
  });

  const ids = rankings.map((r) => r.user_id);
  const { data: profMap = {} } = useQuery({
    queryKey: ["zone-warroom-profiles", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, city")
        .in("id", ids);
      const m: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p; });
      return m;
    },
  });

  // Battles in this zone (or zone-agnostic with same prefix)
  const { data: battles = [] } = useQuery({
    queryKey: ["zone-warroom-battles", zoneId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("arena_battles")
        .select("id, battle_type, title, zone, status, max_participants, question_count, duration_minutes, starts_at, ends_at")
        .or(`zone.eq.${zoneId},zone.is.null`)
        .in("status", ["live", "upcoming"])
        .order("starts_at", { ascending: true })
        .limit(20);
      return (data ?? []) as any[];
    },
    refetchInterval: 30_000,
  });

  // Participant counts per battle
  const battleIds = battles.map((b: any) => b.id);
  const { data: counts = {} } = useQuery({
    queryKey: ["zone-warroom-counts", battleIds.join(",")],
    enabled: battleIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("battle_participants")
        .select("battle_id")
        .in("battle_id", battleIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.battle_id] = (map[r.battle_id] ?? 0) + 1; });
      return map;
    },
  });

  // Realtime: refresh battles + participants live
  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase
      .channel(`zone-warroom-${zoneId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_battles" }, () => {
        qc.invalidateQueries({ queryKey: ["zone-warroom-battles", zoneId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["zone-warroom-counts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "zone_rankings", filter: `zone=eq.${zoneId}` }, () => {
        qc.invalidateQueries({ queryKey: ["zone-warroom-rankings", zoneId, weekStart] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, zoneId, weekStart, qc]);

  const totalXP = useMemo(() => rankings.reduce((s, r) => s + (r.weekly_xp ?? 0), 0), [rankings]);
  const myRow = rankings.find((r) => r.user_id === user?.id);
  const live = battles.filter((b: any) => b.status === "live");
  const upcoming = battles.filter((b: any) => b.status === "upcoming");

  return (
    <div className="arena-root">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate({ to: "/arena" })}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Arena
          </button>
          <div className="flex items-center gap-2 text-[10px] arena-mono text-zinc-500">
            <MapPin className="h-3 w-3" /> Week of {weekStart}
          </div>
        </div>

        {/* Hero */}
        <div
          className="arena-neon-card relative overflow-hidden p-6 md:p-8 mb-6"
          style={{ ["--arena-accent" as any]: `${zone.accent}80` }}
        >
          <div className="absolute inset-0 arena-grid-bg opacity-30 pointer-events-none" />
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: zone.accent }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded border"
                  style={{ color: zone.accent, borderColor: `${zone.accent}66`, background: `${zone.accent}14` }}
                >
                  {zone.short} ZONE · WAR ROOM
                </span>
                {live.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] arena-mono text-emerald-400">
                    <Radio className="h-3 w-3 arena-spark" /> {live.length} LIVE
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{zone.name}</h1>
              <p className="text-sm text-zinc-400 mt-1.5 max-w-md">
                Battles, rankings and weekly XP for {zone.states.length} states. Climb the board, defend your zone.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-[280px]">
              <Stat label="Active" value={rankings.length.toString()} icon={<Users className="h-3 w-3" />} />
              <Stat label="Zone XP" value={totalXP.toLocaleString()} icon={<Flame className="h-3 w-3" />} />
              <Stat
                label="Your Rank"
                value={myRow ? `#${rankings.findIndex((r) => r.user_id === user?.id) + 1}` : "—"}
                icon={<Crown className="h-3 w-3" />}
                accent={zone.accent}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* LEFT: Battles */}
          <div className="space-y-6">
            <Section title="Live Battles" icon={<Radio className="h-3.5 w-3.5 text-emerald-400" />} count={live.length}>
              {live.length === 0 ? (
                <Empty text="No live battles right now. Check the upcoming list below." />
              ) : (
                <div className="space-y-2">
                  {live.map((b: any) => (
                    <BattleRow
                      key={b.id}
                      battle={b}
                      count={counts[b.id] ?? 0}
                      accent={zone.accent}
                      live
                      onEnter={() => navigate({ to: "/arena/battle/$battleId", params: { battleId: b.id } })}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Upcoming" icon={<Clock className="h-3.5 w-3.5 text-amber-400" />} count={upcoming.length}>
              {upcoming.length === 0 ? (
                <Empty text="No battles scheduled. New blitz drops every evening at 8 PM IST." />
              ) : (
                <div className="space-y-2">
                  {upcoming.map((b: any) => (
                    <BattleRow
                      key={b.id}
                      battle={b}
                      count={counts[b.id] ?? 0}
                      accent={zone.accent}
                      onEnter={() => navigate({ to: "/arena/battle/$battleId", params: { battleId: b.id } })}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Zone hopper */}
            <div className="arena-neon-card p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-400 mb-3">
                Jump to Another Zone
              </div>
              <div className="flex flex-wrap gap-2">
                {ZONE_LIST.filter((z) => z.id !== zoneId).map((z) => (
                  <Link
                    key={z.id}
                    to="/arena/zone/$zoneId"
                    params={{ zoneId: z.id }}
                    className="text-[11px] arena-mono px-2.5 py-1 rounded border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition"
                    style={{ borderLeft: `3px solid ${z.accent}` }}
                  >
                    {z.short}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Leaderboard */}
          <div className="arena-neon-card p-5 self-start">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-300">
                Top Operatives · This Week
              </span>
            </div>
            {rankings.length === 0 ? (
              <Empty text="Be the first to score this week. Play any game and your name lands here." />
            ) : (
              <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                {rankings.map((r, i) => {
                  const p = (profMap as any)[r.user_id];
                  const name = p?.full_name || p?.username || "Anonymous";
                  const city = p?.city || "—";
                  const isMe = r.user_id === user?.id;
                  const tone = i === 0 ? "#f59e0b" : i === 1 ? "#cbd5e1" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.08)";
                  return (
                    <div
                      key={r.user_id}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-md border border-white/5 bg-zinc-900/40"
                      style={{ borderLeft: `3px solid ${isMe ? zone.accent : tone}` }}
                    >
                      <span
                        className="text-[11px] arena-mono font-bold w-6 text-center"
                        style={{ color: i < 3 ? tone : "rgba(255,255,255,0.4)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-zinc-100 truncate flex items-center gap-1.5">
                          {name}
                          {isMe && (
                            <span className="text-[9px] arena-mono" style={{ color: zone.accent }}>
                              · YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">{city}</div>
                      </div>
                      <div className="text-[11px] arena-mono font-bold text-zinc-200">
                        {r.weekly_xp.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Stat({
  label, value, icon, accent,
}: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-zinc-900/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </div>
      <div
        className="text-lg font-bold arena-mono mt-0.5"
        style={{ color: accent ?? "#ffffff" }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title, icon, count, children,
}: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-300">{title}</span>
        <span className="text-[10px] arena-mono text-zinc-500">· {count}</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="arena-neon-card p-5 text-[12px] text-zinc-500 leading-relaxed">
      {text}
    </div>
  );
}

function BattleRow({
  battle, count, accent, live,
}: { battle: any; count: number; accent: string; live?: boolean }) {
  const starts = new Date(battle.starts_at);
  const now = new Date();
  const diffMs = starts.getTime() - now.getTime();
  const inMin = Math.max(0, Math.round(diffMs / 60000));
  const timeText = live
    ? "LIVE NOW"
    : inMin < 60
    ? `in ${inMin}m`
    : inMin < 60 * 24
    ? `in ${Math.round(inMin / 60)}h`
    : starts.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="arena-neon-card p-4 flex items-center gap-4"
      style={{ ["--arena-accent" as any]: `${accent}66` }}
    >
      <div
        className="h-10 w-10 rounded-md flex items-center justify-center border"
        style={{ background: `${accent}18`, borderColor: `${accent}44`, color: accent }}
      >
        <Swords className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-zinc-100 truncate">{battle.title}</span>
          <span className="text-[9px] arena-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
            {battle.battle_type}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-3 arena-mono">
          <span>{battle.question_count} Q · {battle.duration_minutes}m</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {count}/{battle.max_participants}</span>
        </div>
      </div>
      <div className="text-right">
        <div
          className="text-[10px] arena-mono font-bold uppercase"
          style={{ color: live ? "#34d399" : accent }}
        >
          {timeText}
        </div>
        <Button
          size="sm"
          className="mt-1.5 h-7 text-[11px] font-bold"
          style={{ background: accent, color: "#0b0b14" }}
          disabled={count >= battle.max_participants}
        >
          {live ? "Enter" : "Join"}
        </Button>
      </div>
    </div>
  );
}
