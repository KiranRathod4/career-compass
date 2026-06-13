import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ZONE_LIST, ZONES, arenaWeekStart, resolveZone, type Zone, type ZoneId } from "@/lib/arena-zones";
import { Trophy, MapPin, Users, Activity } from "lucide-react";

interface Props {
  onZoneSelect?: (zone: ZoneId) => void;
}

type ZoneStat = {
  totalXP: number;
  activeStudents: number;
  topName: string | null;
  topXP: number;
};

export function IndiaBattleMap({ onZoneSelect }: Props) {
  const { user } = useAuth();
  const [hoverZone, setHoverZone] = useState<ZoneId | null>(null);

  const weekStart = arenaWeekStart();

  // Pull all zone_rankings for the current week and aggregate per zone.
  const { data: rankings = [] } = useQuery({
    queryKey: ["zone-rankings-week", weekStart],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("zone_rankings")
        .select("user_id, zone, weekly_xp")
        .eq("week_start", weekStart);
      return (data ?? []) as Array<{ user_id: string; zone: string; weekly_xp: number }>;
    },
  });

  // User's own profile zone (or resolved from their state/college free text)
  const { data: myProfile } = useQuery({
    queryKey: ["arena-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("zone, city, college_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // For tooltip: look up top student names for each zone in one shot
  const topUserIds = useMemo(() => {
    const byZone = new Map<string, { user_id: string; weekly_xp: number }>();
    for (const r of rankings) {
      const cur = byZone.get(r.zone);
      if (!cur || r.weekly_xp > cur.weekly_xp) byZone.set(r.zone, { user_id: r.user_id, weekly_xp: r.weekly_xp });
    }
    return Array.from(byZone.values());
  }, [rankings]);

  const { data: topProfiles = {} } = useQuery({
    queryKey: ["arena-top-profiles", topUserIds.map((t) => t.user_id).join(",")],
    enabled: topUserIds.length > 0,
    queryFn: async () => {
      const ids = topUserIds.map((t) => t.user_id);
      const { data } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      const m: Record<string, { full_name?: string; username?: string }> = {};
      (data ?? []).forEach((p: any) => { m[p.id] = p; });
      return m;
    },
  });

  // Aggregate stats per zone
  const stats: Record<ZoneId, ZoneStat> = useMemo(() => {
    const empty: Record<ZoneId, ZoneStat> = {} as any;
    for (const z of ZONE_LIST) empty[z.id] = { totalXP: 0, activeStudents: 0, topName: null, topXP: 0 };

    const users = new Map<string, Set<string>>(); // zone → user set
    for (const r of rankings) {
      const z = r.zone as ZoneId;
      if (!empty[z]) continue;
      empty[z].totalXP += r.weekly_xp ?? 0;
      if (!users.has(z)) users.set(z, new Set());
      users.get(z)!.add(r.user_id);
    }
    for (const [z, set] of users) (empty as any)[z].activeStudents = set.size;

    for (const top of topUserIds) {
      const r = rankings.find((x) => x.user_id === top.user_id);
      if (!r) continue;
      const z = r.zone as ZoneId;
      if (!empty[z]) continue;
      const p = (topProfiles as any)[top.user_id];
      empty[z].topName = p?.full_name || p?.username || "Anonymous";
      empty[z].topXP = top.weekly_xp;
    }
    return empty;
  }, [rankings, topUserIds, topProfiles]);

  // Find winning zone (most XP this week)
  const winningZone = useMemo<ZoneId | null>(() => {
    let best: { zone: ZoneId | null; xp: number } = { zone: null, xp: -1 };
    for (const z of ZONE_LIST) {
      if (stats[z.id].totalXP > best.xp) best = { zone: z.id, xp: stats[z.id].totalXP };
    }
    return best.xp > 0 ? best.zone : null;
  }, [stats]);

  // User's zone — explicit profile.zone wins, else resolve from city/college
  const myZone: ZoneId | null = useMemo(() => {
    if (!myProfile) return null;
    if ((myProfile as any).zone) return (myProfile as any).zone as ZoneId;
    return resolveZone((myProfile as any).city) ?? resolveZone((myProfile as any).college_name);
  }, [myProfile]);

  // Sample "live" battle dots traveling between zones
  const dots = useMemo(() => {
    const list = ZONE_LIST;
    return Array.from({ length: 4 }, (_, i) => {
      const a = list[i % list.length];
      const b = list[(i + 2) % list.length];
      return { id: i, from: a.label, to: b.label, dur: 9 + i * 2 };
    });
  }, []);

  const hovered = hoverZone ? ZONES[hoverZone] : null;
  const hoveredStat = hoverZone ? stats[hoverZone] : null;

  return (
    <div className="arena-neon-card relative overflow-hidden" style={{ ["--arena-accent" as any]: "rgba(124,58,237,0.5)" }}>
      <div className="absolute inset-0 arena-grid-bg opacity-40 pointer-events-none" />
      <div className="absolute inset-0 arena-radial-glow pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0">
        {/* LEFT: Live battle feed */}
        <LiveBattleFeed />

        {/* CENTER: India map */}
        <div className="relative flex flex-col items-center justify-center px-4 py-6 lg:py-8 lg:border-x lg:border-white/5">
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[#a78bfa]" />
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-300">India Battle Map</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 arena-mono">Tap a zone to enter the war room</p>
          </div>

          <div className="relative">
            <svg
              viewBox="0 0 420 520"
              className="w-[300px] sm:w-[360px] lg:w-[400px] h-auto drop-shadow-[0_0_30px_rgba(124,58,237,0.25)]"
              role="img"
              aria-label="India battle map — six competitive zones"
            >
              <defs>
                <filter id="arena-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {ZONE_LIST.map((z) => {
                const isHover = hoverZone === z.id;
                const isWin = winningZone === z.id;
                const isMine = myZone === z.id;
                const stroke = isWin ? "#f59e0b" : isHover || isMine ? z.accent : "rgba(124,58,237,0.35)";
                const fill = isWin
                  ? "rgba(245,158,11,0.18)"
                  : isHover
                  ? `${z.accent}40`
                  : isMine
                  ? `${z.accent}28`
                  : "rgba(124,58,237,0.08)";
                return (
                  <g
                    key={z.id}
                    onMouseEnter={() => setHoverZone(z.id)}
                    onMouseLeave={() => setHoverZone(null)}
                    onClick={() => onZoneSelect?.(z.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <polygon
                      points={z.points}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isHover || isWin ? 2 : 1}
                      style={{ transition: "fill 200ms ease, stroke 200ms ease" }}
                      className={isWin ? "arena-zone-pulse" : ""}
                    />
                    <text
                      x={z.label.x}
                      y={z.label.y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={700}
                      letterSpacing="1.2"
                      fill={isHover || isMine || isWin ? "#ffffff" : "rgba(255,255,255,0.55)"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {z.short}
                    </text>
                    <text
                      x={z.label.x}
                      y={z.label.y + 10}
                      textAnchor="middle"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={600}
                      fill={isHover || isMine || isWin ? "#ffffff" : "rgba(255,255,255,0.75)"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {stats[z.id].activeStudents}
                    </text>
                    {isMine && (
                      <circle cx={z.label.x} cy={z.label.y + 22} r={3} fill="#a78bfa" filter="url(#arena-glow)">
                        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Animated battle dots */}
              {dots.map((d) => (
                <circle
                  key={d.id}
                  r={4}
                  fill="#a78bfa"
                  filter="url(#arena-glow)"
                  opacity={0.7}
                >
                  <animate
                    attributeName="cx"
                    values={`${d.from.x};${d.to.x};${d.from.x}`}
                    dur={`${d.dur}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values={`${d.from.y};${d.to.y};${d.from.y}`}
                    dur={`${d.dur}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            {/* Tooltip */}
            {hovered && hoveredStat && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-[220px] z-10 pointer-events-none">
                <div className="rounded-lg border border-[#7c3aed]/60 bg-[#0b0b14]/95 backdrop-blur p-3 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: hovered.accent }}>
                      {hovered.name}
                    </span>
                    {winningZone === hovered.id && (
                      <span className="text-[9px] arena-mono text-amber-400 flex items-center gap-1">
                        <Trophy className="h-2.5 w-2.5" /> #1
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <Row label="Active" value={`${hoveredStat.activeStudents}`} />
                    <Row label="Zone XP" value={hoveredStat.totalXP.toLocaleString()} />
                    {hoveredStat.topName && (
                      <Row label="Top" value={`${hoveredStat.topName} · ${hoveredStat.topXP} XP`} truncate />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[10px] text-zinc-500 arena-mono">
            <Legend swatch="#f59e0b" label="LEADING" />
            <Legend swatch="#a78bfa" label="YOUR ZONE" />
            <Legend swatch="rgba(124,58,237,0.35)" label="OTHER" />
          </div>
        </div>

        {/* RIGHT: Zone rankings */}
        <ZoneRankingsPanel stats={stats} myZone={myZone} />
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function Row({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500 uppercase tracking-wider text-[9px]">{label}</span>
      <span className={`text-white font-medium ${truncate ? "truncate max-w-[120px]" : ""}`}>{value}</span>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  );
}

function LiveBattleFeed() {
  // Pull last 30 puzzle attempts joined with profile names
  const { data: feed = [] } = useQuery({
    queryKey: ["arena-live-feed"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("daily_puzzle_attempts")
        .select("user_id, puzzle_type, attempted_at")
        .order("attempted_at", { ascending: false })
        .limit(30);
      const rows = (data ?? []) as Array<{ user_id: string; puzzle_type: string; attempted_at: string }>;
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username, city, zone").in("id", ids);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      return rows.map((r) => ({
        ...r,
        name: map[r.user_id]?.full_name || map[r.user_id]?.username || "Anonymous",
        city: map[r.user_id]?.city || map[r.user_id]?.zone || "India",
      }));
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="hidden lg:flex flex-col p-5 max-w-[260px]">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">Live Battles</span>
      </div>
      <div className="space-y-1 overflow-hidden relative max-h-[420px]">
        {feed.length === 0 ? (
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Battle feed wakes up as students drop into the Arena. Check back during peak hours.
          </p>
        ) : (
          feed.slice(0, 12).map((row: any, i: number) => (
            <div key={`${row.user_id}-${row.attempted_at}-${i}`} className="flex items-start gap-2 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 arena-spark" />
              <p className="text-[11px] leading-snug text-zinc-500">
                <span className="text-zinc-300 font-medium">{row.name}</span>
                <span className="text-zinc-600"> from </span>
                <span className="text-zinc-300">{row.city}</span>
                <span className="text-zinc-600"> · {row.puzzle_type}</span>
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ZoneRankingsPanel({ stats, myZone }: { stats: Record<ZoneId, ZoneStat>; myZone: ZoneId | null }) {
  const sorted = useMemo(
    () => [...ZONE_LIST].sort((a, b) => stats[b.id].totalXP - stats[a.id].totalXP),
    [stats],
  );
  const RANK_TONES = ["#f59e0b", "#9ca3af", "#cd7f32"];

  return (
    <div className="hidden lg:flex flex-col p-5 max-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300">This Week's Zones</span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((z, i) => {
          const tone = i < 3 ? RANK_TONES[i] : "rgba(255,255,255,0.06)";
          const isMine = myZone === z.id;
          return (
            <div
              key={z.id}
              className="flex items-center gap-3 px-2.5 py-2 rounded-md border border-white/5 bg-zinc-900/40"
              style={{ borderLeft: `3px solid ${isMine ? "#a78bfa" : tone}` }}
            >
              <span className="text-[11px] arena-mono font-bold w-5 text-center" style={{ color: i < 3 ? tone : "rgba(255,255,255,0.5)" }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                  {z.name}
                  {isMine && <span className="text-[9px] text-[#a78bfa] arena-mono">· YOU</span>}
                </div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {stats[z.id].activeStudents} active
                </div>
              </div>
              <div className="text-[11px] arena-mono font-bold text-zinc-300">
                {stats[z.id].totalXP.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
