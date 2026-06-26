import { useMemo, useState } from "react";
import { Radio } from "lucide-react";

/**
 * Tactical "war map" of India for the Arena lobby.
 * Shows realtime players bucketed into 12 major battle zones (cities).
 * Players have no geo data, so we deterministically hash user_id -> zone
 * so the same player always appears in the same city across renders.
 *
 * The SVG uses a 1000x900 viewBox. Coordinates are hand-tuned for a
 * simplified silhouette of India + Sri Lanka.
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
  x: number; // svg x
  y: number; // svg y
};

// Approximate positions inside the 1000x900 viewBox, calibrated against the
// silhouette below. Not geographically perfect — tactical, not cartographic.
const ZONES: Zone[] = [
  { id: "del", name: "Delhi NCR",      x: 470, y: 245 },
  { id: "mum", name: "Mumbai",         x: 360, y: 510 },
  { id: "blr", name: "Bengaluru",      x: 480, y: 700 },
  { id: "maa", name: "Chennai",        x: 555, y: 700 },
  { id: "ccu", name: "Kolkata",        x: 700, y: 440 },
  { id: "hyd", name: "Hyderabad",      x: 500, y: 580 },
  { id: "pnq", name: "Pune",           x: 395, y: 530 },
  { id: "amd", name: "Ahmedabad",      x: 335, y: 425 },
  { id: "jai", name: "Jaipur",         x: 405, y: 320 },
  { id: "lko", name: "Lucknow",        x: 560, y: 320 },
  { id: "coc", name: "Kochi",          x: 445, y: 770 },
  { id: "ghy", name: "Guwahati",       x: 800, y: 360 },
];

function hashToInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function IndiaWarMap({ players }: { players: LivePlayer[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const zoneMap = useMemo(() => {
    const map = new Map<string, LivePlayer[]>();
    ZONES.forEach((z) => map.set(z.id, []));
    for (const p of players) {
      const z = ZONES[hashToInt(p.user_id) % ZONES.length];
      map.get(z.id)!.push(p);
    }
    return map;
  }, [players]);

  const maxCount = Math.max(1, ...Array.from(zoneMap.values()).map((a) => a.length));
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
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-2.5 backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, rgba(2,6,15,0.85), rgba(2,6,15,0))",
          borderBottom: "1px solid rgba(8,217,214,0.15)",
        }}>
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-rose-400 arena-live-dot" />
          <span className="arena-mono text-[10px] tracking-[0.25em] text-rose-300/90 uppercase">
            LIVE OPS · BHARAT
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 ml-auto arena-mono text-[10px] text-white/50">
          <span><span className="text-cyan-300">{players.length}</span> active</span>
          <span className="w-px h-3 bg-white/10" />
          <span><span className="text-amber-300">{totalInMatch}</span> in combat</span>
          <span className="w-px h-3 bg-white/10" />
          <span><span className="text-emerald-300">{ZONES.length}</span> zones</span>
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
          {/* Tactical grid pattern */}
          <pattern id="warGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(8,217,214,0.07)" strokeWidth="0.5" />
          </pattern>
          <pattern id="warGridBig" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(8,217,214,0.15)" strokeWidth="0.7" />
          </pattern>

          {/* India fill gradient */}
          <linearGradient id="indiaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(8,217,214,0.10)" />
            <stop offset="100%" stopColor="rgba(255,46,99,0.07)" />
          </linearGradient>

          {/* Ping pulse animation kept as svg <animate> so it works without extra CSS */}
        </defs>

        {/* grid backdrop */}
        <rect width="1000" height="900" fill="url(#warGrid)" />
        <rect width="1000" height="900" fill="url(#warGridBig)" />

        {/* crosshair guides */}
        <line x1="500" y1="0" x2="500" y2="900" stroke="rgba(8,217,214,0.08)" strokeDasharray="3 6" />
        <line x1="0" y1="450" x2="1000" y2="450" stroke="rgba(8,217,214,0.08)" strokeDasharray="3 6" />

        {/* Simplified India + Sri Lanka silhouette. */}
        <g>
          <path
            d="
              M 410 120
              L 470 110
              L 540 130
              L 600 145
              L 650 165
              L 695 190
              L 740 215
              L 790 245
              L 815 285
              L 825 330
              L 815 365
              L 790 395
              L 780 430
              L 760 455
              L 730 475
              L 715 500
              L 700 540
              L 670 575
              L 640 605
              L 605 645
              L 580 685
              L 555 720
              L 525 750
              L 495 775
              L 470 790
              L 450 760
              L 440 720
              L 430 680
              L 415 640
              L 400 600
              L 385 560
              L 365 525
              L 345 495
              L 325 465
              L 310 440
              L 305 410
              L 315 385
              L 335 360
              L 360 335
              L 370 305
              L 365 275
              L 355 245
              L 360 215
              L 380 185
              L 395 150
              Z
            "
            fill="url(#indiaFill)"
            stroke="rgba(8,217,214,0.55)"
            strokeWidth="1.5"
            style={{ filter: "drop-shadow(0 0 8px rgba(8,217,214,0.35))" }}
          />
          {/* Sri Lanka */}
          <ellipse
            cx="555"
            cy="810"
            rx="22"
            ry="32"
            fill="url(#indiaFill)"
            stroke="rgba(8,217,214,0.45)"
            strokeWidth="1.2"
          />
        </g>

        {/* Zone pings */}
        {ZONES.map((z) => {
          const list = zoneMap.get(z.id) || [];
          const count = list.length;
          const intensity = count / maxCount;
          const isHot = count >= Math.max(2, maxCount * 0.6);
          const isHover = hover === z.id;
          const baseR = 4 + Math.min(12, count * 1.8);
          const color = count === 0
            ? "rgba(120,140,160,0.45)"
            : isHot
              ? "#ff2e63"
              : "#08d9d6";

          return (
            <g
              key={z.id}
              onMouseEnter={() => setHover(z.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* outer pulse ring (only when active) */}
              {count > 0 && (
                <circle cx={z.x} cy={z.y} r={baseR} fill="none" stroke={color} strokeWidth="1.5" opacity="0.7">
                  <animate attributeName="r" from={baseR} to={baseR + 24} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* mid glow */}
              <circle
                cx={z.x}
                cy={z.y}
                r={baseR + (isHover ? 4 : 0)}
                fill={color}
                opacity={count === 0 ? 0.35 : 0.18 + intensity * 0.25}
                style={{ filter: count > 0 ? `drop-shadow(0 0 8px ${color})` : undefined, transition: "r 0.2s" }}
              />
              {/* core dot */}
              <circle
                cx={z.x}
                cy={z.y}
                r={count > 0 ? 3.5 : 2.2}
                fill={color}
                style={{ filter: count > 0 ? `drop-shadow(0 0 4px ${color})` : undefined }}
              />
              {/* label */}
              <text
                x={z.x + baseR + 8}
                y={z.y + 4}
                fill={count > 0 ? "#e7faff" : "rgba(255,255,255,0.45)"}
                fontSize="11"
                fontFamily="ui-monospace, 'JetBrains Mono', monospace"
                style={{ letterSpacing: "0.05em" }}
              >
                {z.name.toUpperCase()}
                {count > 0 && (
                  <tspan dx="6" fill={color} fontWeight="700">{count}</tspan>
                )}
              </text>
            </g>
          );
        })}

        {/* Corner brackets — gives it the HUD targeting frame look */}
        <g stroke="rgba(8,217,214,0.7)" strokeWidth="2" fill="none">
          <path d="M 20 20 L 60 20 M 20 20 L 20 60" />
          <path d="M 980 20 L 940 20 M 980 20 L 980 60" />
          <path d="M 20 880 L 60 880 M 20 880 L 20 840" />
          <path d="M 980 880 L 940 880 M 980 880 L 980 840" />
        </g>
      </svg>

      {/* Hover tooltip — overlay panel listing players in the focused zone */}
      {hover && (
        <div
          className="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-[260px] z-10 rounded-lg p-3 pointer-events-none"
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
              {(zoneMap.get(hover) || []).length} active
            </span>
          </div>
          {(zoneMap.get(hover) || []).length === 0 ? (
            <div className="text-[11px] text-white/40 italic">No operatives in this sector.</div>
          ) : (
            <div className="space-y-1 max-h-[140px] overflow-y-auto">
              {(zoneMap.get(hover) || []).slice(0, 6).map((p) => (
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
              {(zoneMap.get(hover) || []).length > 6 && (
                <div className="text-[10px] text-white/30 pt-1">
                  +{(zoneMap.get(hover) || []).length - 6} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
