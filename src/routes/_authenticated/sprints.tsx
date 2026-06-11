import { createFileRoute } from "@tanstack/react-router";
import { localDateKey } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sprints")({ component: SprintsPage });

const STATUSES = ["planned", "active", "complete", "archived"] as const;
const STATUS_COLOR: Record<string, string> = { planned: "bg-muted text-muted-foreground", active: "bg-info/15 text-info", complete: "bg-success/15 text-success", archived: "bg-muted text-muted-foreground/60" };

function todayPlus(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

function SprintsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [fStatus, setFStatus] = useState("");
  const [draft, setDraft] = useState({ name: "", start_date: todayPlus(0), end_date: todayPlus(14), goals: "", outcomes: "", status: "planned" as string, focus_areas: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["sprints", user!.id],
    queryFn: async () => (await (supabase as any).from("sprints").select("*").eq("user_id", user!.id).order("start_date", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Name required");
      const focus_areas = draft.focus_areas.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await (supabase as any).from("sprints").insert({ user_id: user!.id, ...draft, focus_areas });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sprints"] }); setShowAdd(false); setDraft({ name: "", start_date: todayPlus(0), end_date: todayPlus(14), goals: "", outcomes: "", status: "planned", focus_areas: "" }); toast.success("Sprint created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await (supabase as any).from("sprints").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await (supabase as any).from("sprints").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints"] }) });

  const filtered = rows.filter((r: any) => !fStatus || r.status === fStatus);
  const active = rows.find((r: any) => r.status === "active");

  function dayProgress(s: any) {
    const start = new Date(s.start_date).getTime(); const end = new Date(s.end_date).getTime(); const now = Date.now();
    if (now <= start) return 0; if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sprints</h1>
          <p className="text-sm text-muted-foreground">2-week prep sprints with goals and outcomes.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />New sprint
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Total" value={rows.length} />
        <Stat label="Active" value={rows.filter((r: any) => r.status === "active").length} accent="text-info" />
        <Stat label="Complete" value={rows.filter((r: any) => r.status === "complete").length} accent="text-success" />
        <Stat label="Planned" value={rows.filter((r: any) => r.status === "planned").length} />
      </div>

      {active && (
        <div className="card-flat p-4 border-l-2 border-primary">
          <div className="section-label">Current sprint</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="font-medium">{active.name}</div>
            <div className="text-[11px] text-muted-foreground">{active.start_date} → {active.end_date}</div>
          </div>
          <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${dayProgress(active)}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{dayProgress(active)}% elapsed</div>
        </div>
      )}

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-2 gap-2">
          <F label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inp} placeholder="Sprint 1: DSA + Apps" /></F>
          <F label="Status"><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={inp}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></F>
          <F label="Start"><input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} className={inp} /></F>
          <F label="End"><input type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} className={inp} /></F>
          <F label="Focus areas (comma separated)"><input value={draft.focus_areas} onChange={(e) => setDraft({ ...draft, focus_areas: e.target.value })} className={inp} placeholder="DSA, SQL, System Design" /></F>
          <div />
          <F label="Goals"><textarea value={draft.goals} onChange={(e) => setDraft({ ...draft, goals: e.target.value })} className={`${inp} min-h-[70px]`} placeholder="What you intend to achieve" /></F>
          <F label="Outcomes (post-sprint)"><textarea value={draft.outcomes} onChange={(e) => setDraft({ ...draft, outcomes: e.target.value })} className={`${inp} min-h-[70px]`} placeholder="What actually happened" /></F>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat p-3 flex flex-wrap gap-2 items-center">
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((s: any) => (
          <div key={s.id} className="card-flat p-4 group flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" />{s.start_date} → {s.end_date}</div>
              </div>
              <button onClick={() => del.mutate(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {s.focus_areas?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {s.focus_areas.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
              </div>
            )}
            {s.goals && <div className="mt-2 text-xs whitespace-pre-wrap border-l-2 border-primary/40 pl-2"><span className="section-label block">Goals</span>{s.goals}</div>}
            {s.outcomes && <div className="mt-2 text-xs whitespace-pre-wrap border-l-2 border-success/40 pl-2"><span className="section-label block">Outcomes</span>{s.outcomes}</div>}
            <div className="mt-3 flex items-center gap-2">
              <select value={s.status} onChange={(e) => update.mutate({ id: s.id, status: e.target.value })} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[s.status]}`}>
                {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <div className="ml-auto text-[11px] text-muted-foreground">{dayProgress(s)}% elapsed</div>
            </div>
            <div className="mt-1.5 h-1 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary/70" style={{ width: `${dayProgress(s)}%` }} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="md:col-span-2 card-flat p-10 text-center text-sm text-muted-foreground">No sprints yet. Plan your first 2-week sprint.</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
