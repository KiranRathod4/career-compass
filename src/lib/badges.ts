// Badge catalog with unlock rules
export type BadgeDef = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: "dsa" | "jobs" | "focus" | "streak" | "consistency" | "skill";
  check: (stats: BadgeStats) => boolean;
};

export type BadgeStats = {
  dsaSolved: number;
  dsaEasy: number;
  dsaMedium: number;
  dsaHard: number;
  jobsApplied: number;
  focusMinutes: number;
  focusSessions: number;
  dailyStreak: number;
  dsaStreak: number;
  applyStreak: number;
  totalXp: number;
};

export const BADGES: BadgeDef[] = [
  { id: "first_solve", name: "First Solve", emoji: "🎯", description: "Solved your first DSA problem", category: "dsa", check: (s) => s.dsaSolved >= 1 },
  { id: "dsa_10", name: "DSA Rookie", emoji: "💡", description: "10 problems solved", category: "dsa", check: (s) => s.dsaSolved >= 10 },
  { id: "dsa_50", name: "DSA Warrior", emoji: "⚔️", description: "50 problems solved", category: "dsa", check: (s) => s.dsaSolved >= 50 },
  { id: "dsa_100", name: "Century", emoji: "💯", description: "100 problems solved", category: "dsa", check: (s) => s.dsaSolved >= 100 },
  { id: "hard_5", name: "Hard Hitter", emoji: "🔥", description: "5 Hard problems solved", category: "dsa", check: (s) => s.dsaHard >= 5 },

  { id: "first_apply", name: "First Application", emoji: "📮", description: "Sent your first application", category: "jobs", check: (s) => s.jobsApplied >= 1 },
  { id: "apply_10", name: "Hunter", emoji: "🎯", description: "10 applications sent", category: "jobs", check: (s) => s.jobsApplied >= 10 },
  { id: "apply_50", name: "Apply Machine", emoji: "🚀", description: "50 applications sent", category: "jobs", check: (s) => s.jobsApplied >= 50 },

  { id: "focus_first", name: "Focused", emoji: "🧘", description: "Completed your first focus session", category: "focus", check: (s) => s.focusSessions >= 1 },
  { id: "focus_10h", name: "Deep Diver", emoji: "🌊", description: "10 hours of focus time", category: "focus", check: (s) => s.focusMinutes >= 600 },
  { id: "focus_50h", name: "Iron Focus", emoji: "🧠", description: "50 hours of deep work", category: "focus", check: (s) => s.focusMinutes >= 3000 },

  { id: "streak_3", name: "3-Day Streak", emoji: "🔥", description: "3 days of consistency", category: "streak", check: (s) => s.dailyStreak >= 3 },
  { id: "streak_7", name: "Week Warrior", emoji: "🔥", description: "7-day streak — keep it going", category: "streak", check: (s) => s.dailyStreak >= 7 },
  { id: "streak_30", name: "Monthly Beast", emoji: "👑", description: "30 days straight — taiyaar", category: "streak", check: (s) => s.dailyStreak >= 30 },

  { id: "xp_1k", name: "1K Club", emoji: "⭐", description: "1,000 XP earned", category: "consistency", check: (s) => s.totalXp >= 1000 },
  { id: "xp_5k", name: "5K Hero", emoji: "🌟", description: "5,000 XP earned", category: "consistency", check: (s) => s.totalXp >= 5000 },
  { id: "xp_10k", name: "Legend", emoji: "💎", description: "10,000 XP — interview ready", category: "consistency", check: (s) => s.totalXp >= 10000 },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b]));
