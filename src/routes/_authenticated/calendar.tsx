import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, X, Briefcase, CalendarDays, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

const EVENT_TYPES = ["Test", "Interview", "Hackathon", "Workshop", "Deadline", "Other"];
const TYPE_COLORS: Record<string, string> = {
  Test: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  Interview: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  Hackathon: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30",
  Workshop: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  Deadline: "bg-red-500/15 text-red-600 border-red-500/30",
  Other: "bg-muted text-foreground border-border",
  Job: "bg-primary/15 text-primary border-primary/30",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function sameDay(a: string, b: string) { return a === b; }

function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState<string>(fmtDate(new Date()));
  const [showAdd, setShowAdd] = useState(false);

  const monthStart = fmtDate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const monthEnd = fmtDate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));

  const { data: events = [] } = useQuery({
    queryKey: ["placement_events", user!.id, monthStart, monthEnd],
    queryFn: async () => (await supabase.from("placement_events").select("*")
      .eq("user_id", user!.id).gte("event_date", monthStart).lte("event_date", monthEnd).order("event_date")).data ?? [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs_deadlines", user!.id, monthStart, monthEnd],
    queryFn: async () => (await supabase.from("jobs").select("id,company,role,deadline")
      .eq("user_id", user!.id).not("deadline", "is", null).gte("deadline", monthStart).lte("deadline", monthEnd)).data ?? [],
  });

  const { data: systemEvents = [] } = useQuery({
    queryKey: ["system_events"],
    queryFn: async () => (await supabase.from("system_events").select("*").order("typical_month")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("placement_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["placement_events"] }); toast.success("Event hata diya"); },
  });

  // Build grid
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate: Record<string, any[]> = {};
  events.forEach((e: any) => { (eventsByDate[e.event_date] ??= []).push({ ...e, _kind: "event" }); });
  jobs.forEach((j: any) => { (eventsByDate[j.deadline] ??= []).push({ id: j.id, event_name: `${j.company} — ${j.role}`, event_type: "Job", _kind: "job" }); });

  const selectedItems = eventsByDate[selected] ?? [];
  const today = fmtDate(new Date());
  const monthLabel = cursor.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Smart Calendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sab placement events, deadlines aur tests ek jagah.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="card-flat p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold">{monthLabel}</div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="text-center py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="h-20" />;
              const ds = fmtDate(d);
              const items = eventsByDate[ds] ?? [];
              const isSelected = sameDay(ds, selected);
              const isToday = sameDay(ds, today);
              return (
                <button key={i} onClick={() => setSelected(ds)}
                  className={`h-20 p-1.5 rounded-md border text-left transition flex flex-col gap-0.5 overflow-hidden ${
                    isSelected ? "border-primary bg-primary/5" :
                    isToday ? "border-primary/40" :
                    "border-border hover:bg-accent"
                  }`}>
                  <div className={`text-[11px] font-medium ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
                  <div className="space-y-0.5 overflow-hidden">
                    {items.slice(0, 2).map((it: any, x: number) => (
                      <div key={x} className={`text-[9px] px-1 py-0.5 rounded truncate border ${TYPE_COLORS[it.event_type] ?? TYPE_COLORS.Other}`}>
                        {it.event_name}
                      </div>
                    ))}
                    {items.length > 2 && <div className="text-[9px] text-muted-foreground">+{items.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="card-flat p-4">
            <div className="section-label mb-2">{new Date(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</div>
            {selectedItems.length === 0 ? (
              <div className="text-xs text-muted-foreground">Is din kuch nahi hai. Chill karo ya add karo.</div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((it: any, i: number) => (
                  <div key={i} className={`p-2.5 rounded-md border ${TYPE_COLORS[it.event_type] ?? TYPE_COLORS.Other}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {it._kind === "job" && <Briefcase className="h-3 w-3" />}
                          {it.event_name}
                        </div>
                        <div className="text-[10px] opacity-70 mt-0.5">{it.event_type}{it.event_time ? ` · ${it.event_time}` : ""}{it.company && it._kind !== "job" ? ` · ${it.company}` : ""}</div>
                        {it.notes && <div className="text-[11px] mt-1 opacity-80">{it.notes}</div>}
                      </div>
                      {it._kind === "event" && (
                        <button onClick={() => del.mutate(it.id)} className="opacity-60 hover:opacity-100 hover:text-destructive shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-flat p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <div className="section-label">Typical placement season</div>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {systemEvents.slice(0, 12).map((s: any) => (
                <div key={s.id} className="text-[11px] flex items-start justify-between gap-2 py-1 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.event_name}</div>
                    <div className="text-muted-foreground">{s.typical_window}</div>
                  </div>
                  {s.event_type && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{s.event_type}</span>}
                </div>
              ))}
              {systemEvents.length === 0 && <div className="text-[11px] text-muted-foreground">No system events yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {showAdd && <AddEventModal date={selected} onClose={() => setShowAdd(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["placement_events"] }); setShowAdd(false); }} />}
    </div>
  );
}

function AddEventModal({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<any>({ event_name: "", event_type: "Test", event_date: date, event_time: "", company: "", notes: "" });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.event_name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("placement_events").insert({
        user_id: user!.id,
        event_name: form.event_name,
        event_type: form.event_type,
        event_date: form.event_date,
        event_time: form.event_time || null,
        company: form.company || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event save ho gaya. Yaad rakhna!"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-flat p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Add event</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Event name">
            <Inp value={form.event_name} onChange={(v) => setForm({ ...form, event_name: v })} placeholder="e.g. TCS coding test" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm">
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Company"><Inp value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Optional" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Inp type="date" value={form.event_date} onChange={(v) => setForm({ ...form, event_date: v })} /></Field>
            <Field label="Time"><Inp type="time" value={form.event_time} onChange={(v) => setForm({ ...form, event_time: v })} /></Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-2.5 py-2 rounded-md border border-border bg-background text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Round details, links, prep notes…" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span><div className="mt-0.5">{children}</div></label>;
}
function Inp({ onChange, ...p }: { onChange?: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <input {...p} onChange={(e) => onChange?.(e.target.value)} className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />;
}
