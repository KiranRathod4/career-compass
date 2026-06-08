import { useEffect, useRef, useState } from "react";
import { Property, COLOR_MAP, PALETTE, PropOption } from "./types";
import { Check, Plus, X } from "lucide-react";

export function PropertyCell({ prop, value, onChange }: { prop: Property; value: unknown; onChange: (v: unknown) => void }) {
  switch (prop.type) {
    case "text":
      return <TextCell value={(value as string) ?? ""} onChange={onChange} />;
    case "number":
      return <NumberCell value={(value as number) ?? null} onChange={onChange} />;
    case "url":
      return <UrlCell value={(value as string) ?? ""} onChange={onChange} />;
    case "date":
      return <DateCell value={(value as string) ?? ""} onChange={onChange} />;
    case "checkbox":
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />;
    case "select":
      return <SelectCell prop={prop} value={value as string} onChange={onChange} />;
    case "multi_select":
      return <MultiSelectCell prop={prop} value={(value as string[]) ?? []} onChange={onChange} />;
    case "person":
      return <TextCell value={(value as string) ?? ""} onChange={onChange} placeholder="Name…" />;
  }
}

function TextCell({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onChange(v)} placeholder={placeholder ?? "Empty"} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />;
}

function NumberCell({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [v, setV] = useState(value?.toString() ?? "");
  useEffect(() => setV(value?.toString() ?? ""), [value]);
  return <input type="number" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onChange(v === "" ? null : Number(v))} className="w-full bg-transparent text-sm outline-none tabular-nums" placeholder="0" />;
}

function UrlCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [edit, setEdit] = useState(!value);
  useEffect(() => setV(value), [value]);
  if (!edit && value) {
    return <a href={value} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-primary underline truncate block" title="Click to open">{value.replace(/^https?:\/\//, "")}</a>;
  }
  return <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { onChange(v); setEdit(false); }} onFocus={() => setEdit(true)} placeholder="https://…" className="w-full bg-transparent text-sm outline-none" />;
}

function DateCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-sm outline-none" />;
}

export function StatusPill({ name, color, onClick }: { name: string; color: string; onClick?: () => void }) {
  return <span onClick={onClick} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${COLOR_MAP[color] ?? COLOR_MAP.gray} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}>{name}</span>;
}

function SelectCell({ prop, value, onChange }: { prop: Property; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const opt = prop.options?.find((o) => o.id === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen(true)} className="w-full text-left">
        {opt ? <StatusPill name={opt.label} color={opt.color} /> : <span className="text-xs text-muted-foreground/60">Empty</span>}
      </button>
      {open && <OptionPicker prop={prop} selected={value ? [value] : []} onPick={(id) => { onChange(id); setOpen(false); }} onClose={() => setOpen(false)} multi={false} />}
    </div>
  );
}

function MultiSelectCell({ prop, value, onChange }: { prop: Property; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const opts = (prop.options ?? []).filter((o) => value.includes(o.id));
  return (
    <div className="relative">
      <button onClick={() => setOpen(true)} className="w-full text-left flex flex-wrap gap-1">
        {opts.length === 0 && <span className="text-xs text-muted-foreground/60">Empty</span>}
        {opts.map((o) => <StatusPill key={o.id} name={o.label} color={o.color} />)}
      </button>
      {open && (
        <OptionPicker prop={prop} selected={value} multi onPick={(id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

export function OptionPicker({ prop, selected, onPick, onClose, multi, onAddOption }: {
  prop: Property;
  selected: string[];
  onPick: (id: string) => void;
  onClose: () => void;
  multi: boolean;
  onAddOption?: (label: string, color: string) => void;
}) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const opts = (prop.options ?? []).filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="absolute z-50 top-full mt-1 left-0 w-60 rounded-lg border border-border bg-popover shadow-xl p-2">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or create…" className="w-full h-8 px-2 mb-1 rounded border border-border bg-background text-xs outline-none" />
      <div className="max-h-60 overflow-y-auto space-y-0.5">
        {opts.map((o) => (
          <button key={o.id} onClick={() => onPick(o.id)} className="w-full flex items-center justify-between px-1.5 py-1 rounded hover:bg-accent">
            <StatusPill name={o.label} color={o.color} />
            {selected.includes(o.id) && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
        ))}
        {onAddOption && q && !opts.some((o) => o.label.toLowerCase() === q.toLowerCase()) && (
          <button onClick={() => { const color = PALETTE[(prop.options?.length ?? 0) % PALETTE.length]; onAddOption(q, color); }} className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-accent text-left text-xs">
            <Plus className="h-3.5 w-3.5" /> Create <StatusPill name={q} color={PALETTE[(prop.options?.length ?? 0) % PALETTE.length]} />
          </button>
        )}
      </div>
    </div>
  );
}
