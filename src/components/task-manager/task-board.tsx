import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Board, Task, Property, Status, PROPERTY_TYPE_META, PropType, PropOption, PALETTE } from "./types";
import { PropertyCell, StatusPill, OptionPicker } from "./property-cell";
import { BlockEditor } from "./block-editor";
import {
  Plus, Filter, Search, Table2, LayoutGrid, MoreHorizontal, Trash2, X, ChevronDown, Settings2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const EMOJIS = ["🎯","🚀","💡","🧠","📚","🛠","🔥","⚡","✨","📈","🧪","💼","🎨","🧩","🪐","🌱"];

export function TaskBoard({ scope, projectId, defaultName = "Task Board", defaultIcon = "🎯" }: {
  scope: "planner" | "project" | "standalone";
  projectId?: string | null;
  defaultName?: string;
  defaultIcon?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // load or create the board
  const { data: board, isLoading } = useQuery({
    queryKey: ["tm-board", user!.id, scope, projectId ?? null],
    queryFn: async () => {
      let q = supabase.from("task_boards").select("*").eq("user_id", user!.id).eq("scope", scope);
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q.maybeSingle();
      if (data) return data as unknown as Board;
      const { data: created, error } = await supabase
        .from("task_boards")
        .insert({
          user_id: user!.id, scope, project_id: projectId ?? null, name: defaultName, icon: defaultIcon,
          properties: [
            { id: "priority", name: "Priority", type: "select", options: [
              { id: "high", label: "High", color: "red" },
              { id: "medium", label: "Medium", color: "yellow" },
              { id: "low", label: "Low", color: "blue" },
            ]},
            { id: "tags", name: "Tags", type: "multi_select", options: [] },
          ],
        })
        .select("*").single();
      if (error) throw error;
      return created as unknown as Board;
    },
  });

  const { data: tasks = [] } = useQuery({
    enabled: !!board,
    queryKey: ["tm-tasks", board?.id],
    queryFn: async () =>
      (await supabase.from("tm_tasks").select("*").eq("board_id", board!.id).order("sort_order")).data as unknown as Task[] ?? [],
  });

  const updateBoard = useMutation({
    mutationFn: async (patch: Partial<Board>) => { await supabase.from("task_boards").update(patch as any).eq("id", board!.id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm-board"] }),
  });

  const addTask = useMutation({
    mutationFn: async ({ statusId }: { statusId?: string } = {}) => {
      const { data, error } = await supabase.from("tm_tasks").insert({
        board_id: board!.id, user_id: user!.id, title: "New task", emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        status_id: statusId ?? board!.statuses[0].id, sort_order: tasks.length,
      }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (t: any) => { qc.invalidateQueries({ queryKey: ["tm-tasks", board?.id] }); setOpenTask(t.id); },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => { await supabase.from("tm_tasks").update(patch as any).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm-tasks", board?.id] }),
  });

  const delTask = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tm_tasks").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm-tasks", board?.id] }),
  });

  const [openTask, setOpenTask] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | "">("");

  const filtered = useMemo(() => {
    return (tasks as Task[]).filter((t) =>
      (!filterStatus || t.status_id === filterStatus) &&
      (!search || t.title.toLowerCase().includes(search.toLowerCase()))
    );
  }, [tasks, search, filterStatus]);

  if (isLoading || !board) return <div className="card-flat p-8 text-center text-sm text-muted-foreground">Loading workspace…</div>;

  const openedTask = (tasks as Task[]).find((t) => t.id === openTask) ?? null;

  return (
    <div className="space-y-4">
      <Header board={board} onPatch={(p) => updateBoard.mutate(p)} />

      <Toolbar
        board={board}
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onAddTask={() => addTask.mutate({})}
        onAddProperty={(prop) => updateBoard.mutate({ properties: [...board.properties, prop] })}
        onRemoveProperty={(id) => updateBoard.mutate({ properties: board.properties.filter((p) => p.id !== id) })}
        onSetView={(v) => updateBoard.mutate({ view_type: v })}
        onUpdateStatuses={(statuses) => updateBoard.mutate({ statuses })}
      />

      {board.view_type === "table" ? (
        <TableView
          board={board}
          tasks={filtered}
          onOpen={setOpenTask}
          onUpdate={(id, patch) => updateTask.mutate({ id, patch })}
          onDelete={(id) => delTask.mutate(id)}
          onAddTask={() => addTask.mutate({})}
          onAddOption={(propId, label, color) => {
            const props = board.properties.map((p) => p.id === propId ? { ...p, options: [...(p.options ?? []), { id: crypto.randomUUID(), label, color }] } : p);
            updateBoard.mutate({ properties: props });
          }}
        />
      ) : (
        <KanbanView
          board={board}
          tasks={filtered}
          onOpen={setOpenTask}
          onUpdate={(id, patch) => updateTask.mutate({ id, patch })}
          onDelete={(id) => delTask.mutate(id)}
          onAddTask={(statusId) => addTask.mutate({ statusId })}
        />
      )}

      {openedTask && (
        <TaskDrawer
          task={openedTask}
          board={board}
          onClose={() => setOpenTask(null)}
          onUpdate={(patch) => updateTask.mutate({ id: openedTask.id, patch })}
          onDelete={() => { delTask.mutate(openedTask.id); setOpenTask(null); }}
          onAddOption={(propId, label, color) => {
            const props = board.properties.map((p) => p.id === propId ? { ...p, options: [...(p.options ?? []), { id: crypto.randomUUID(), label, color }] } : p);
            updateBoard.mutate({ properties: props });
          }}
        />
      )}
    </div>
  );
}

function Header({ board, onPatch }: { board: Board; onPatch: (p: Partial<Board>) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [emojiOpen, setEmojiOpen] = useState(false);
  useEffect(() => setName(board.name), [board.name]);
  return (
    <div className="flex items-center gap-3 relative">
      <button onClick={() => setEmojiOpen((o) => !o)} className="text-3xl hover:bg-accent rounded-md h-12 w-12 flex items-center justify-center">{board.icon}</button>
      {emojiOpen && (
        <div className="absolute left-0 top-14 z-40 bg-popover border border-border rounded-lg shadow-xl p-2 grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => <button key={e} onClick={() => { onPatch({ icon: e }); setEmojiOpen(false); }} className="text-xl h-8 w-8 hover:bg-accent rounded">{e}</button>)}
        </div>
      )}
      {editing ? (
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { setEditing(false); if (name !== board.name) onPatch({ name }); }} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="text-3xl font-bold tracking-tight bg-transparent outline-none border-b border-primary" />
      ) : (
        <h1 onClick={() => setEditing(true)} className="text-3xl font-bold tracking-tight cursor-text hover:bg-accent/30 rounded px-1">{board.name}</h1>
      )}
    </div>
  );
}

type ToolbarProps = {
  board: Board;
  search: string;
  setSearch: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  onAddTask: () => void;
  onAddProperty: (p: Property) => void;
  onRemoveProperty: (id: string) => void;
  onSetView: (v: Board["view_type"]) => void;
  onUpdateStatuses: (s: Status[]) => void;
};
function Toolbar({ board, search, setSearch, filterStatus, setFilterStatus, onAddTask, onAddProperty, onRemoveProperty, onSetView, onUpdateStatuses }: ToolbarProps) {
  const [propMenu, setPropMenu] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
      <button onClick={() => onSetView("table")} className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${board.view_type === "table" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}>
        <Table2 className="h-3.5 w-3.5" /> Table
      </button>
      <button onClick={() => onSetView("board")} className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${board.view_type === "board" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}>
        <LayoutGrid className="h-3.5 w-3.5" /> Board
      </button>
      <div className="h-5 w-px bg-border mx-1" />
      <div className="relative">
        <button onClick={() => setPropMenu(true)} className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:bg-accent inline-flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Properties
        </button>
        {propMenu && <PropertyManager board={board} onAdd={onAddProperty} onRemove={onRemoveProperty} onClose={() => setPropMenu(false)} />}
      </div>
      <div className="relative">
        <button onClick={() => setStatusMenu(true)} className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:bg-accent inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Statuses
        </button>
        {statusMenu && <StatusManager statuses={board.statuses} onUpdate={onUpdateStatuses} onClose={() => setStatusMenu(false)} />}
      </div>
      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
        <option value="">All statuses</option>
        {board.statuses.map((s: Status) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="relative ml-auto">
        <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-8 pl-7 pr-2 rounded-md border border-border bg-background text-xs w-44" />
      </div>
      <button onClick={onAddTask} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> New task
      </button>
    </div>
  );
}

function PropertyManager({ board, onAdd, onRemove, onClose }: { board: Board; onAdd: (p: Property) => void; onRemove: (id: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PropType>("text");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  return (
    <div ref={ref} className="absolute z-50 top-full mt-1 left-0 w-72 rounded-lg border border-border bg-popover shadow-xl p-3 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Existing properties</div>
      <div className="space-y-1 max-h-40 overflow-auto">
        {board.properties.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-accent">
            <span><span className="text-muted-foreground mr-1.5">{PROPERTY_TYPE_META.find((m) => m.type === p.type)?.icon}</span>{p.name}</span>
            <button onClick={() => onRemove(p.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {board.properties.length === 0 && <div className="text-xs text-muted-foreground px-2">No properties yet.</div>}
      </div>
      <div className="border-t border-border pt-2 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Add property</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Property name" className="w-full h-8 px-2 rounded border border-border bg-background text-xs outline-none" />
        <div className="grid grid-cols-4 gap-1">
          {PROPERTY_TYPE_META.map((m) => (
            <button key={m.type} onClick={() => setType(m.type)} className={`h-12 rounded border text-[11px] flex flex-col items-center justify-center gap-0.5 ${type === m.type ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
              <span className="text-sm">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <button disabled={!name.trim()} onClick={() => { onAdd({ id: crypto.randomUUID(), name: name.trim(), type, options: (type === "select" || type === "multi_select") ? [] : undefined }); setName(""); onClose(); }} className="w-full h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">Add property</button>
      </div>
    </div>
  );
}

function StatusManager({ statuses, onUpdate, onClose }: { statuses: Status[]; onUpdate: (s: Status[]) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  return (
    <div ref={ref} className="absolute z-50 top-full mt-1 left-0 w-64 rounded-lg border border-border bg-popover shadow-xl p-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Statuses</div>
      {statuses.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <select value={s.color} onChange={(e) => onUpdate(statuses.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} className="h-7 rounded border border-border bg-background text-xs">
            {PALETTE.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={s.name} onChange={(e) => onUpdate(statuses.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 h-7 px-2 rounded border border-border bg-background text-xs" />
          {statuses.length > 1 && <button onClick={() => onUpdate(statuses.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>}
        </div>
      ))}
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New status…" className="flex-1 h-7 px-2 rounded border border-border bg-background text-xs" />
        <button disabled={!name.trim()} onClick={() => { onUpdate([...statuses, { id: crypto.randomUUID(), name: name.trim(), color: PALETTE[statuses.length % PALETTE.length] }]); setName(""); }} className="h-7 px-2 rounded bg-primary text-primary-foreground text-xs disabled:opacity-50">Add</button>
      </div>
    </div>
  );
}

/* ---------------- Table view ---------------- */

type ViewProps = {
  board: Board;
  tasks: Task[];
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAddTask: (statusId?: string) => void;
  onAddOption?: (propId: string, label: string, color: string) => void;
};

function TableView({ board, tasks, onOpen, onUpdate, onDelete, onAddTask, onAddOption }: ViewProps) {
  return (
    <div className="card-flat overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left px-3 py-2 font-medium w-[34%]">Aa Task</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
            {board.properties.map((p: Property) => <th key={p.id} className="text-left px-3 py-2 font-medium">{PROPERTY_TYPE_META.find((m) => m.type === p.type)?.icon} {p.name}</th>)}
            <th className="text-left px-3 py-2 font-medium w-24">Progress</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t: Task) => (
            <tr key={t.id} className="border-b border-border hover:bg-accent/30 group">
              <td className="px-3 py-2">
                <button onClick={() => onOpen(t.id)} className="flex items-center gap-2 text-left w-full">
                  <span>{t.emoji ?? "📝"}</span>
                  <span className="truncate hover:underline">{t.title}</span>
                </button>
              </td>
              <td className="px-3 py-2">
                <StatusSelector board={board} value={t.status_id} onChange={(v) => onUpdate(t.id, { status_id: v })} />
              </td>
              {board.properties.map((p: Property) => (
                <td key={p.id} className="px-3 py-2 min-w-[140px]">
                  <PropertyCellWithCreate prop={p} value={t.properties?.[p.id]} onChange={(v) => onUpdate(t.id, { properties: { ...t.properties, [p.id]: v } })} onAddOption={(label, color) => onAddOption(p.id, label, color)} />
                </td>
              ))}
              <td className="px-3 py-2">
                <ProgressBar value={t.progress} onChange={(v) => onUpdate(t.id, { progress: v })} />
              </td>
              <td className="px-3 py-2">
                <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={board.properties.length + 4} className="px-3 py-2">
              <button onClick={onAddTask} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New row</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PropertyCellWithCreate({ prop, value, onChange, onAddOption }: { prop: Property; value: unknown; onChange: (v: unknown) => void; onAddOption: (label: string, color: string) => void }) {
  // For select / multi_select, intercept to add options
  if (prop.type === "select" || prop.type === "multi_select") {
    const [open, setOpen] = useState(false);
    const isMulti = prop.type === "multi_select";
    const selected = isMulti ? ((value as string[]) ?? []) : (value ? [value as string] : []);
    return (
      <div className="relative">
        <button onClick={() => setOpen(true)} className="w-full text-left flex flex-wrap gap-1 min-h-[20px]">
          {selected.length === 0 && <span className="text-xs text-muted-foreground/60">Empty</span>}
          {selected.map((id) => { const o = prop.options?.find((x) => x.id === id); return o ? <StatusPill key={id} name={o.label} color={o.color} /> : null; })}
        </button>
        {open && (
          <OptionPicker prop={prop} selected={selected} multi={isMulti} onAddOption={(label, color) => { onAddOption(label, color); setTimeout(() => {/* picker will rerender */}, 0); }} onPick={(id) => {
            if (isMulti) { onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]); }
            else { onChange(id); setOpen(false); }
          }} onClose={() => setOpen(false)} />
        )}
      </div>
    );
  }
  return <PropertyCell prop={prop} value={value} onChange={onChange} />;
}

function ProgressBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
      <input type="number" min={0} max={100} value={value} onChange={(e) => onChange(Math.max(0, Math.min(100, +e.target.value)))} className="w-10 text-[11px] bg-transparent outline-none tabular-nums text-right" />
    </div>
  );
}

function StatusSelector({ board, value, onChange }: { board: Board; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const cur = board.statuses.find((s) => s.id === value) ?? board.statuses[0];
  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(true)}><StatusPill name={cur.name} color={cur.color} /></button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-44 rounded-lg border border-border bg-popover shadow-xl p-1">
          {board.statuses.map((s) => (
            <button key={s.id} onClick={() => { onChange(s.id); setOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-accent">
              <StatusPill name={s.name} color={s.color} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Kanban ---------------- */

function KanbanView({ board, tasks, onOpen, onUpdate, onDelete, onAddTask }: any) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {board.statuses.map((s: Status) => {
        const list = (tasks as Task[]).filter((t) => t.status_id === s.id);
        return (
          <div key={s.id} className="min-w-[280px] w-[280px] shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2"><StatusPill name={s.name} color={s.color} /><span className="text-xs text-muted-foreground">{list.length}</span></div>
              <button onClick={() => onAddTask(s.id)} className="text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-2">
              {list.map((t) => (
                <button key={t.id} onClick={() => onOpen(t.id)} className="block w-full text-left card-flat p-3 hover:border-primary/40 transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm flex items-center gap-1.5"><span>{t.emoji ?? "📝"}</span> {t.title}</div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  {t.due_date && <div className="text-[11px] text-muted-foreground mt-1">{t.due_date}</div>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {board.properties.filter((p: Property) => p.type === "multi_select" || p.type === "select").map((p: Property) => {
                      const v = t.properties?.[p.id];
                      const ids = Array.isArray(v) ? v : v ? [v as string] : [];
                      return ids.map((id) => { const o = p.options?.find((x) => x.id === id); return o ? <StatusPill key={id} name={o.label} color={o.color} /> : null; });
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${t.progress}%` }} /></div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{t.progress}%</span>
                  </div>
                </button>
              ))}
              <button onClick={() => onAddTask(s.id)} className="w-full text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1.5 rounded hover:bg-accent/50 inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Task drawer ---------------- */

function TaskDrawer({ task, board, onClose, onUpdate, onDelete, onAddOption }: { task: Task; board: Board; onClose: () => void; onUpdate: (p: Partial<Task>) => void; onDelete: () => void; onAddOption: (propId: string, label: string, color: string) => void }) {
  const [title, setTitle] = useState(task.title);
  useEffect(() => setTitle(task.title), [task.id]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl bg-background border-l border-border overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 bg-background border-b border-border px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{board.icon}</span><span>{board.name}</span><span>/</span><span className="text-foreground">{task.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="h-7 w-7 rounded hover:bg-accent text-muted-foreground hover:text-destructive flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
            <button onClick={onClose} className="h-7 w-7 rounded hover:bg-accent flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => onUpdate({ emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)] })} className="text-4xl hover:bg-accent rounded h-14 w-14 flex items-center justify-center" title="Random emoji">{task.emoji ?? "📝"}</button>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== task.title && onUpdate({ title })} className="flex-1 text-3xl font-bold tracking-tight bg-transparent outline-none" />
          </div>

          <div className="card-flat p-4 space-y-2">
            <div className="grid grid-cols-[120px_1fr] gap-y-2 items-center text-sm">
              <div className="text-xs text-muted-foreground">Status</div>
              <StatusSelector board={board} value={task.status_id} onChange={(v) => onUpdate({ status_id: v })} />
              <div className="text-xs text-muted-foreground">Due</div>
              <input type="date" value={task.due_date ?? ""} onChange={(e) => onUpdate({ due_date: e.target.value || null })} className="bg-transparent outline-none text-sm w-fit" />
              <div className="text-xs text-muted-foreground">Assignee</div>
              <input value={task.assignee ?? ""} onChange={(e) => onUpdate({ assignee: e.target.value })} placeholder="Empty" className="bg-transparent outline-none text-sm" />
              <div className="text-xs text-muted-foreground">Progress</div>
              <ProgressBar value={task.progress} onChange={(v) => onUpdate({ progress: v })} />
              {board.properties.map((p) => (
                <>
                  <div key={`l-${p.id}`} className="text-xs text-muted-foreground">{p.name}</div>
                  <div key={`v-${p.id}`}>
                    <PropertyCellWithCreate prop={p} value={task.properties?.[p.id]} onChange={(v) => onUpdate({ properties: { ...task.properties, [p.id]: v } })} onAddOption={(label, color) => onAddOption(p.id, label, color)} />
                  </div>
                </>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Notes & blocks</div>
            <BlockEditor taskId={task.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
