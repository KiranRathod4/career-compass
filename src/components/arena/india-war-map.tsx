import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";

/**
 * Tactical "war map" of India for the Arena lobby.
 * Shows realtime players bucketed into 12 major battle zones (cities) with
 * animated markers that enter, exit, and transition smoothly as players
 * join the lobby, take seats, or drop.
 */

export type LivePlayer = {
  user_id: string;
  username: string;
  arena_rank?: string;
  status: "lobby" | "in_match";
};

type Zone = {
  id: string;
  name: string;
  x: number;
  y: number;
};

const ZONES: Zone[] = [
  { id: "del", name: "Delhi NCR", x: 470, y: 245 },
  { id: "mum", name: "Mumbai", x: 360, y: 510 },
  { id: "blr", name: "Bengaluru", x: 480, y: 700 },
  { id: "maa", name: "Chennai", x: 555, y: 700 },
  { id: "ccu", name: "Kolkata", x: 700, y: 440 },
  { id: "hyd", name: "Hyderabad", x: 500, y: 580 },
  { id: "pnq", name: "Pune", x: 395, y: 530 },
  { id: "amd", name: "Ahmedabad", x: 335, y: 425 },
  { id: "jai", name: "Jaipur", x: 405, y: 320 },
  { id: "lko", name: "Lucknow", x: 560, y: 320 },
  { id: "coc", name: "Kochi", x: 445, y: 770 },
  { id: "ghy", name: "Guwahati", x: 800, y: 360 },
];

function hashToInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

type PlacedPlayer = LivePlayer & {
  zoneId: string;
  // orbit position around the zone center
  ox: number;
  oy: number;
};

// Performance caps — tune here.
const THROTTLE_MS = 250;            // min ms between marker re-layouts
const MAX_ANIMATED = 60;            // markers using framer-motion springs
const MAX_HEARTBEATS = 12;          // pulsing rings for in-combat players
const MAX_JOIN_BURSTS = 8;          // simultaneous join-ring FX

export function IndiaWarMap({ players: incomingPlayers }: { players: LivePlayer[] }) {
  const [hover, setHover] = useState<string | null>(null);

  // Throttle incoming presence updates: coalesce bursts into at most one
  // layout pass per THROTTLE_MS, but always honor the latest snapshot.
  const [players, setPlayers] = useState<LivePlayer[]>(incomingPlayers);
  const lastApplied = useRef<number>(0);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<LivePlayer[]>(incomingPlayers);

  useEffect(() => {
    latest.current = incomingPlayers;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsed = now - lastApplied.current;
    const apply = () => {
      lastApplied.current = typeof performance !== "undefined" ? performance.now() : Date.now();
      pendingTimer.current = null;
      setPlayers(latest.current);
    };
    if (elapsed >= THROTTLE_MS) {
      apply();
    } else if (!pendingTimer.current) {
      pendingTimer.current = setTimeout(apply, THROTTLE_MS - elapsed);
    }
    return () => {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
    };
  }, [incomingPlayers]);

  // Detect joins/leaves/status-change for transient FX (capped per tick)
  const prevIds = useRef<Map<string, LivePlayer["status"]>>(new Map());
  const [recentlyJoined, setRecentlyJoined] = useState<Set<string>>(new Set());
  const [statusChanged, setStatusChanged] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Map(players.map((p) => [p.user_id, p.status]));
    const joined = new Set<string>();
    const changed = new Set<string>();
    for (const [id, status] of next) {
      const prev = prevIds.current.get(id);
      if (prev === undefined) {
        if (joined.size < MAX_JOIN_BURSTS) joined.add(id);
      } else if (prev !== status) {
        if (changed.size < MAX_JOIN_BURSTS) changed.add(id);
      }
    }
    prevIds.current = next;
    if (joined.size) {
      setRecentlyJoined(joined);
      const t = setTimeout(() => setRecentlyJoined(new Set()), 1800);
      return () => clearTimeout(t);
    }
    if (changed.size) {
      setStatusChanged(changed);
      const t = setTimeout(() => setStatusChanged(new Set()), 1200);
      return () => clearTimeout(t);
    }
  }, [players]);

  // Place each player at a deterministic zone + orbital slot
  const placed = useMemo<PlacedPlayer[]>(() => {
    // Group by zone first to assign orbit slots without overlap
    const byZone = new Map<string, LivePlayer[]>();
    ZONES.forEach((z) => byZone.set(z.id, []));
    const sorted = [...players].sort((a, b) => a.user_id.localeCompare(b.user_id));
    for (const p of sorted) {
      const z = ZONES[hashToInt(p.user_id) % ZONES.length];
      byZone.get(z.id)!.push(p);
    }
    const out: PlacedPlayer[] = [];
    for (const z of ZONES) {
      const list = byZone.get(z.id) || [];
      list.forEach((p, i) => {
        const ring = Math.floor(i / 6); // 6 per ring
        const slot = i % 6;
        const radius = 14 + ring * 10;
        const baseAngle = (hashToInt(p.user_id) % 360) * (Math.PI / 180);
        const angle = baseAngle + slot * ((Math.PI * 2) / 6);
        out.push({
          ...p,
          zoneId: z.id,
          ox: z.x + Math.cos(angle) * radius,
          oy: z.y + Math.sin(angle) * radius,
        });
      });
    }
    return out;
  }, [players]);

  const zoneCounts = useMemo(() => {
    const m = new Map<string, number>();
    ZONES.forEach((z) => m.set(z.id, 0));
    for (const p of placed) m.set(p.zoneId, (m.get(p.zoneId) || 0) + 1);
    return m;
  }, [placed]);

  const maxCount = Math.max(1, ...Array.from(zoneCounts.values()));
  const totalInMatch = players.filter((p) => p.status === "in_match").length;

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(8,217,214,0.08), transparent 60%), linear-gradient(180deg, #050a18 0%, #02060f 100%)",
        border: "1px solid rgba(8,217,214,0.18)",
        boxShadow: "inset 0 0 60px rgba(8,217,214,0.05), 0 0 40px rgba(8,217,214,0.05)",
      }}
    >
      {/* HUD top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-2.5 backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, rgba(2,6,15,0.85), rgba(2,6,15,0))",
          borderBottom: "1px solid rgba(8,217,214,0.15)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-rose-400 arena-live-dot" />
          <span className="arena-mono text-[10px] tracking-[0.25em] text-rose-300/90 uppercase">
            LIVE OPS · BHARAT
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 ml-auto arena-mono text-[10px] text-white/50">
          <motion.span
            key={players.length}
            initial={{ scale: 1.3, color: "#08d9d6" }}
            animate={{ scale: 1, color: "rgba(255,255,255,0.5)" }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-cyan-300">{players.length}</span> active
          </motion.span>
          <span className="w-px h-3 bg-white/10" />
          <motion.span
            key={`m-${totalInMatch}`}
            initial={{ scale: 1.3, color: "#fbbf24" }}
            animate={{ scale: 1, color: "rgba(255,255,255,0.5)" }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-amber-300">{totalInMatch}</span> in combat
          </motion.span>
          <span className="w-px h-3 bg-white/10" />
          <span>
            <span className="text-emerald-300">{ZONES.length}</span> zones
          </span>
        </div>
      </div>

      {/* Map SVG */}
      <svg
        viewBox="0 0 1000 900"
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="India battle map showing online players by zone"
      >
        <defs>
          <pattern id="warGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(8,217,214,0.07)" strokeWidth="0.5" />
          </pattern>
          <pattern id="warGridBig" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(8,217,214,0.15)" strokeWidth="0.7" />
          </pattern>
          <linearGradient id="indiaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(8,217,214,0.10)" />
            <stop offset="100%" stopColor="rgba(255,46,99,0.07)" />
          </linearGradient>
          <radialGradient id="lobbyDot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0f766e" />
          </radialGradient>
          <radialGradient id="combatDot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>

        <rect width="1000" height="900" fill="url(#warGrid)" />
        <rect width="1000" height="900" fill="url(#warGridBig)" />

        <line x1="500" y1="0" x2="500" y2="900" stroke="rgba(8,217,214,0.08)" strokeDasharray="3 6" />
        <line x1="0" y1="450" x2="1000" y2="450" stroke="rgba(8,217,214,0.08)" strokeDasharray="3 6" />

        {/* India silhouette */}
        <g>
          <path
            d="M 410 120 L 470 110 L 540 130 L 600 145 L 650 165 L 695 190 L 740 215 L 790 245 L 815 285 L 825 330 L 815 365 L 790 395 L 780 430 L 760 455 L 730 475 L 715 500 L 700 540 L 670 575 L 640 605 L 605 645 L 580 685 L 555 720 L 525 750 L 495 775 L 470 790 L 450 760 L 440 720 L 430 680 L 415 640 L 400 600 L 385 560 L 365 525 L 345 495 L 325 465 L 310 440 L 305 410 L 315 385 L 335 360 L 360 335 L 370 305 L 365 275 L 355 245 L 360 215 L 380 185 L 395 150 Z"
            fill="url(#indiaFill)"
            stroke="rgba(8,217,214,0.55)"
            strokeWidth="1.5"
            style={{ filter: "drop-shadow(0 0 8px rgba(8,217,214,0.35))" }}
          />
          <ellipse cx="555" cy="810" rx="22" ry="32" fill="url(#indiaFill)" stroke="rgba(8,217,214,0.45)" strokeWidth="1.2" />
        </g>

        {/* Zone aura rings */}
        {ZONES.map((z) => {
          const count = zoneCounts.get(z.id) || 0;
          const intensity = count / maxCount;
          const isHot = count >= Math.max(2, maxCount * 0.6);
          const isHover = hover === z.id;
          const baseR = 4 + Math.min(12, count * 1.8);
          const color = count === 0 ? "rgba(120,140,160,0.45)" : isHot ? "#ff2e63" : "#08d9d6";
          return (
            <g
              key={z.id}
              onMouseEnter={() => setHover(z.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              {count > 0 && (
                <circle cx={z.x} cy={z.y} r={baseR} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" from={baseR} to={baseR + 28} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={z.x}
                cy={z.y}
                r={baseR + (isHover ? 6 : 0)}
                fill={color}
                opacity={count === 0 ? 0.25 : 0.15 + intensity * 0.22}
                style={{ filter: count > 0 ? `drop-shadow(0 0 10px ${color})` : undefined, transition: "r 0.25s ease" }}
              />
              <circle cx={z.x} cy={z.y} r={count > 0 ? 3 : 2} fill={color} />
              <text
                x={z.x + baseR + 10}
                y={z.y + 4}
                fill={count > 0 ? "#e7faff" : "rgba(255,255,255,0.45)"}
                fontSize="11"
                fontFamily="ui-monospace, 'JetBrains Mono', monospace"
                style={{ letterSpacing: "0.05em" }}
              >
                {z.name.toUpperCase()}
                {count > 0 && (
                  <tspan dx="6" fill={color} fontWeight="700">
                    {count}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}

        {/* Animated per-player markers (orbiting each zone center) */}
        <AnimatePresence>
          {placed.map((p) => {
            const isJoin = recentlyJoined.has(p.user_id);
            const isChange = statusChanged.has(p.user_id);
            const fill = p.status === "in_match" ? "url(#combatDot)" : "url(#lobbyDot)";
            const glow = p.status === "in_match" ? "#fbbf24" : "#34d399";
            return (
              <motion.g
                key={p.user_id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                {/* Joined burst */}
                {isJoin && (
                  <motion.circle
                    cx={p.ox}
                    cy={p.oy}
                    initial={{ r: 2, opacity: 0.9 }}
                    animate={{ r: 22, opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    fill="none"
                    stroke={glow}
                    strokeWidth={1.5}
                  />
                )}
                {/* Status-change flash */}
                {isChange && (
                  <motion.circle
                    cx={p.ox}
                    cy={p.oy}
                    initial={{ r: 2, opacity: 1 }}
                    animate={{ r: 16, opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    fill={glow}
                    opacity={0.5}
                  />
                )}
                {/* Smooth move between zones/status */}
                <motion.circle
                  animate={{ cx: p.ox, cy: p.oy }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  r={p.status === "in_match" ? 3.4 : 2.8}
                  fill={fill}
                  style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
                />
                {/* Heartbeat for in-match players */}
                {p.status === "in_match" && (
                  <motion.circle
                    animate={{ cx: p.ox, cy: p.oy }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    r={5}
                    fill="none"
                    stroke={glow}
                    strokeWidth={1}
                    opacity={0.6}
                  >
                    <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite" />
                  </motion.circle>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Corner brackets */}
        <g stroke="rgba(8,217,214,0.7)" strokeWidth="2" fill="none">
          <path d="M 20 20 L 60 20 M 20 20 L 20 60" />
          <path d="M 980 20 L 940 20 M 980 20 L 980 60" />
          <path d="M 20 880 L 60 880 M 20 880 L 20 840" />
          <path d="M 980 880 L 940 880 M 980 880 L 980 840" />
        </g>
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hover && (
          <motion.div
            key={hover}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-8 left-3 right-3 md:right-auto md:max-w-[260px] z-10 rounded-lg p-3 pointer-events-none"
            style={{
              background: "rgba(2,6,15,0.92)",
              border: "1px solid rgba(8,217,214,0.4)",
              boxShadow: "0 0 30px rgba(8,217,214,0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="arena-mono text-[10px] tracking-[0.25em] text-cyan-300/90">
                ZONE · {ZONES.find((z) => z.id === hover)?.name.toUpperCase()}
              </span>
              <span className="arena-mono text-[10px] text-white/50">
                {placed.filter((p) => p.zoneId === hover).length} active
              </span>
            </div>
            {placed.filter((p) => p.zoneId === hover).length === 0 ? (
              <div className="text-[11px] text-white/40 italic">No operatives in this sector.</div>
            ) : (
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {placed
                  .filter((p) => p.zoneId === hover)
                  .slice(0, 6)
                  .map((p) => (
                    <div key={p.user_id} className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: p.status === "in_match" ? "#fbbf24" : "#34d399" }}
                      />
                      <span className="text-[12px] text-white/85 truncate">{p.username}</span>
                      <span className="ml-auto text-[10px] text-white/30 uppercase">
                        {p.status === "in_match" ? "combat" : "lobby"}
                      </span>
                    </div>
                  ))}
                {placed.filter((p) => p.zoneId === hover).length > 6 && (
                  <div className="text-[10px] text-white/30 pt-1">
                    +{placed.filter((p) => p.zoneId === hover).length - 6} more
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-2 flex items-center justify-between arena-mono text-[10px]"
        style={{
          background: "linear-gradient(0deg, rgba(2,6,15,0.85), rgba(2,6,15,0))",
          borderTop: "1px solid rgba(8,217,214,0.12)",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        <span>LAT 20.5°N · LON 78.9°E</span>
        <span className="hidden sm:inline">FREQ 144.520 MHz · SECURE</span>
        <span className="text-cyan-300/80">▲ REAL-TIME SYNC</span>
      </div>
    </div>
  );
}
