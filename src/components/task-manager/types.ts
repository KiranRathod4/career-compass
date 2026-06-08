export type PropType = "text" | "number" | "select" | "multi_select" | "date" | "checkbox" | "url" | "person";

export type PropOption = { id: string; label: string; color: string };

export type Property = {
  id: string;
  name: string;
  type: PropType;
  options?: PropOption[]; // for select / multi_select
};

export type Status = { id: string; name: string; color: string };

export type Board = {
  id: string;
  user_id: string;
  scope: "planner" | "project" | "standalone";
  project_id: string | null;
  name: string;
  icon: string;
  view_type: "table" | "board" | "calendar";
  properties: Property[];
  statuses: Status[];
};

export type Task = {
  id: string;
  board_id: string;
  user_id: string;
  title: string;
  emoji: string | null;
  status_id: string;
  due_date: string | null;
  assignee: string | null;
  progress: number;
  properties: Record<string, unknown>;
  sort_order: number;
};

export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "checkbox"
  | "bulleted"
  | "numbered"
  | "toggle"
  | "quote"
  | "code"
  | "callout"
  | "divider";

export type Block = {
  id: string;
  task_id: string;
  user_id: string;
  type: BlockType;
  content: { text?: string; checked?: boolean; emoji?: string };
  sort_order: number;
};

export const COLOR_MAP: Record<string, string> = {
  gray: "bg-muted text-muted-foreground",
  red: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  yellow: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  pink: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};
export const COLORS = Object.keys(COLOR_MAP);
export const PALETTE = ["violet", "blue", "green", "yellow", "orange", "red", "pink", "gray"];

export const PROPERTY_TYPE_META: { type: PropType; label: string; icon: string }[] = [
  { type: "text", label: "Text", icon: "Aa" },
  { type: "number", label: "Number", icon: "#" },
  { type: "select", label: "Select", icon: "⦿" },
  { type: "multi_select", label: "Multi-select", icon: "≡" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "checkbox", label: "Checkbox", icon: "☑" },
  { type: "url", label: "URL", icon: "🔗" },
  { type: "person", label: "Person", icon: "👤" },
];
