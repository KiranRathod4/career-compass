import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Plus, GripVertical, Trash2, Heading1, Heading2, Heading3, CheckSquare, List, ListOrdered, ChevronRight, Quote, Code, Lightbulb, Minus, Type } from "lucide-react";
import { Block, BlockType } from "./types";

const BLOCK_MENU: { type: BlockType; label: string; icon: any; hint: string }[] = [
  { type: "text", label: "Text", icon: Type, hint: "Plain paragraph" },
  { type: "h1", label: "Heading 1", icon: Heading1, hint: "Big section title" },
  { type: "h2", label: "Heading 2", icon: Heading2, hint: "Medium heading" },
  { type: "h3", label: "Heading 3", icon: Heading3, hint: "Small heading" },
  { type: "checkbox", label: "To-do", icon: CheckSquare, hint: "Track with checkbox" },
  { type: "bulleted", label: "Bulleted list", icon: List, hint: "Simple bullet point" },
  { type: "numbered", label: "Numbered list", icon: ListOrdered, hint: "1. 2. 3." },
  { type: "toggle", label: "Toggle", icon: ChevronRight, hint: "Collapsible block" },
  { type: "quote", label: "Quote", icon: Quote, hint: "Highlighted quote" },
  { type: "code", label: "Code", icon: Code, hint: "Monospace snippet" },
  { type: "callout", label: "Callout", icon: Lightbulb, hint: "Tinted info box" },
  { type: "divider", label: "Divider", icon: Minus, hint: "Horizontal line" },
];

export function BlockEditor({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: blocks = [] } = useQuery({
    queryKey: ["tm-blocks", taskId],
    queryFn: async () =>
      (await supabase.from("tm_blocks").select("*").eq("task_id", taskId).order("sort_order")).data ?? [],
  });

  const addBlock = useMutation({
    mutationFn: async ({ type, after }: { type: BlockType; after?: number }) => {
      const sort_order = (after ?? blocks.length - 1) + 1;
      // shift later blocks
      await Promise.all(
        (blocks as Block[])
          .filter((b) => b.sort_order >= sort_order)
          .map((b) => supabase.from("tm_blocks").update({ sort_order: b.sort_order + 1 }).eq("id", b.id)),
      );
      const { error } = await supabase.from("tm_blocks").insert({
        task_id: taskId, user_id: user!.id, type, sort_order, content: type === "checkbox" ? { text: "", checked: false } : { text: "" },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm-blocks", taskId] }),
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Block> }) => {
      await supabase.from("tm_blocks").update(patch as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm-blocks", taskId] }),
  });

  const delBlock = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tm_blocks").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm-blocks", taskId] }),
  });

  return (
    <div className="space-y-0.5">
      {(blocks as Block[]).map((b) => (
        <BlockRow key={b.id} block={b} onChange={(content) => updateBlock.mutate({ id: b.id, patch: { content } })} onTypeChange={(type) => updateBlock.mutate({ id: b.id, patch: { type } })} onDelete={() => delBlock.mutate(b.id)} onAddBelow={(type) => addBlock.mutate({ type, after: b.sort_order })} />
      ))}
      <AddBlockButton onAdd={(type) => addBlock.mutate({ type })} empty={blocks.length === 0} />
    </div>
  );
}

function BlockRow({ block, onChange, onTypeChange, onDelete, onAddBelow }: {
  block: Block;
  onChange: (c: Block["content"]) => void;
  onTypeChange: (t: BlockType) => void;
  onDelete: () => void;
  onAddBelow: (t: BlockType) => void;
}) {
  const [local, setLocal] = useState(block.content.text ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => setLocal(block.content.text ?? ""), [block.id]);

  const commit = () => { if (local !== block.content.text) onChange({ ...block.content, text: local }); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "/" && local === "") { e.preventDefault(); setMenuOpen(true); }
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") { e.preventDefault(); commit(); onAddBelow("text"); }
    if (e.key === "Backspace" && local === "") { e.preventDefault(); onDelete(); }
  };

  const inputCls = "w-full bg-transparent outline-none resize-none border-none";

  const renderInput = () => {
    if (block.type === "code") {
      return <textarea value={local} onChange={(e) => setLocal(e.target.value)} onBlur={commit} className={`${inputCls} font-mono text-[13px] min-h-[60px] p-3 rounded-md bg-muted/50 border border-border`} placeholder="Code…" />;
    }
    const style: Record<BlockType, string> = {
      text: "text-[14px]",
      h1: "text-2xl font-bold tracking-tight",
      h2: "text-xl font-semibold tracking-tight",
      h3: "text-base font-semibold",
      checkbox: "text-[14px]",
      bulleted: "text-[14px]",
      numbered: "text-[14px]",
      toggle: "text-[14px] font-medium",
      quote: "text-[14px] italic border-l-2 border-primary pl-3",
      code: "",
      callout: "text-[14px]",
      divider: "",
    };
    return <input value={local} onChange={(e) => setLocal(e.target.value)} onBlur={commit} onKeyDown={onKey} className={`${inputCls} ${style[block.type]}`} placeholder={block.type === "text" ? "Type '/' for commands" : "Untitled"} />;
  };

  if (block.type === "divider") {
    return (
      <div className="group flex items-center gap-2 py-2">
        <GripCol onDelete={onDelete} onAddBelow={onAddBelow} />
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-2 py-1 rounded-md hover:bg-accent/30 px-1">
      <GripCol onDelete={onDelete} onAddBelow={onAddBelow} />
      {block.type === "checkbox" && (
        <input type="checkbox" checked={!!block.content.checked} onChange={(e) => onChange({ ...block.content, checked: e.target.checked })} className="mt-1.5 h-4 w-4 accent-[var(--color-primary)]" />
      )}
      {block.type === "bulleted" && <span className="mt-1 text-muted-foreground">•</span>}
      {block.type === "numbered" && <span className="mt-1 text-muted-foreground text-sm">1.</span>}
      {block.type === "toggle" && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1.5 text-muted-foreground"><ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} /></button>
      )}
      {block.type === "callout" && <span className="mt-1.5">💡</span>}
      <div className={`flex-1 ${block.type === "callout" ? "rounded-md bg-warning/10 border border-warning/30 p-3" : ""} ${block.type === "checkbox" && block.content.checked ? "line-through text-muted-foreground" : ""}`}>
        {renderInput()}
      </div>
      {menuOpen && <SlashMenu onPick={(t) => { onTypeChange(t); setMenuOpen(false); }} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

function GripCol({ onDelete, onAddBelow }: { onDelete: () => void; onAddBelow: (t: BlockType) => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1.5 relative">
      <button onClick={() => setMenu(true)} className="text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} title="Delete" className="text-muted-foreground hover:text-destructive"><GripVertical className="h-3.5 w-3.5" /></button>
      {menu && <SlashMenu onPick={(t) => { onAddBelow(t); setMenu(false); }} onClose={() => setMenu(false)} />}
    </div>
  );
}

function AddBlockButton({ onAdd, empty }: { onAdd: (t: BlockType) => void; empty: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pt-1">
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent">
        <Plus className="h-3.5 w-3.5" /> {empty ? "Add a block — type / for the menu" : "Add block"}
      </button>
      {open && <SlashMenu onPick={(t) => { onAdd(t); setOpen(false); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

function SlashMenu({ onPick, onClose }: { onPick: (t: BlockType) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const items = BLOCK_MENU.filter((b) => b.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="absolute z-50 top-full mt-1 left-0 w-72 rounded-lg border border-border bg-popover shadow-xl p-2">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter blocks…" className="w-full h-8 px-2 mb-1 rounded border border-border bg-background text-xs outline-none" />
      <div className="max-h-72 overflow-y-auto">
        {items.map((b) => (
          <button key={b.type} onClick={() => onPick(b.type)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-accent text-left">
            <span className="h-7 w-7 rounded-md border border-border bg-card flex items-center justify-center"><b.icon className="h-3.5 w-3.5" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px]">{b.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">{b.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
