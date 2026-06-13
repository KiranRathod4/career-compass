/**
 * Arena zone system — maps Indian states → 6 battle zones.
 * Used by the India Battle Map and zone leaderboards.
 */

export type ZoneId =
  | "north"
  | "south"
  | "west"
  | "east"
  | "central"
  | "northeast";

export interface Zone {
  id: ZoneId;
  name: string;          // Display name, e.g. "South Zone"
  short: string;         // Short label for the map, e.g. "SOUTH"
  accent: string;        // Hex accent color for the zone
  states: string[];      // Indian states grouped under this zone
  /** SVG polygon points for a 420x520 viewBox */
  points: string;
  /** Label anchor (cx, cy) inside the polygon */
  label: { x: number; y: number };
}

export const ZONES: Record<ZoneId, Zone> = {
  north: {
    id: "north",
    name: "North Zone",
    short: "NORTH",
    accent: "#7c3aed",
    states: ["Delhi", "Uttar Pradesh", "Haryana", "Punjab", "Rajasthan", "Uttarakhand", "Himachal Pradesh", "Jammu and Kashmir", "Ladakh"],
    // Top wide band
    points: "90,40 330,40 360,150 300,180 130,180 70,150",
    label: { x: 210, y: 110 },
  },
  northeast: {
    id: "northeast",
    name: "Northeast Zone",
    short: "NE",
    accent: "#06b6d4",
    states: ["Assam", "Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Sikkim"],
    // Small wing top-right
    points: "340,55 410,80 400,170 330,160 320,90",
    label: { x: 365, y: 115 },
  },
  west: {
    id: "west",
    name: "West Zone",
    short: "WEST",
    accent: "#f59e0b",
    states: ["Maharashtra", "Gujarat", "Goa", "Dadra and Nagar Haveli", "Daman and Diu"],
    // Left mid section
    points: "70,150 130,180 165,330 90,360 35,260",
    label: { x: 95, y: 260 },
  },
  central: {
    id: "central",
    name: "Central Zone",
    short: "CENTRAL",
    accent: "#10b981",
    states: ["Madhya Pradesh", "Chhattisgarh"],
    // Middle block
    points: "130,180 300,180 290,310 165,330",
    label: { x: 215, y: 250 },
  },
  east: {
    id: "east",
    name: "East Zone",
    short: "EAST",
    accent: "#ec4899",
    states: ["West Bengal", "Odisha", "Bihar", "Jharkhand"],
    // Right side
    points: "300,180 360,150 400,170 385,340 290,310",
    label: { x: 340, y: 245 },
  },
  south: {
    id: "south",
    name: "South Zone",
    short: "SOUTH",
    accent: "#3b82f6",
    states: ["Karnataka", "Tamil Nadu", "Andhra Pradesh", "Kerala", "Telangana", "Puducherry", "Andaman and Nicobar Islands", "Lakshadweep"],
    // Bottom tapered peninsula
    points: "90,360 165,330 290,310 385,340 300,440 220,490 140,440",
    label: { x: 215, y: 400 },
  },
};

export const ZONE_LIST: Zone[] = [
  ZONES.north, ZONES.northeast, ZONES.east, ZONES.central, ZONES.west, ZONES.south,
];

/** State → Zone lookup. Case-insensitive match via normaliseState. */
const STATE_TO_ZONE: Record<string, ZoneId> = {};
for (const z of ZONE_LIST) {
  for (const s of z.states) STATE_TO_ZONE[s.toLowerCase()] = z.id;
}

export function normaliseState(input: string | null | undefined): string | null {
  if (!input) return null;
  return input.trim().toLowerCase();
}

/** Resolve a zone id from a state name or free-text college/city string. */
export function resolveZone(stateOrFreeText: string | null | undefined): ZoneId | null {
  const norm = normaliseState(stateOrFreeText);
  if (!norm) return null;
  if (STATE_TO_ZONE[norm]) return STATE_TO_ZONE[norm];
  // fuzzy: check if any state name is contained in the free text
  for (const z of ZONE_LIST) {
    for (const s of z.states) {
      if (norm.includes(s.toLowerCase())) return z.id;
    }
  }
  return null;
}

export function zoneById(id: ZoneId | string | null | undefined): Zone | null {
  if (!id) return null;
  return (ZONES as Record<string, Zone>)[id] ?? null;
}

/** Monday-start ISO week key, used by zone_rankings.week_start */
export function arenaWeekStart(d: Date = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
