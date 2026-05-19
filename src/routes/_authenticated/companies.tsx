import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/companies")({ component: CompaniesPage });

const STATUSES = ["researching","prepping","applied","interviewing","done"] as const;
const PRIORITIES = ["low","medium","high"] as const;
const PRIO_COLOR: Record<string, string> = { low: "bg-muted text-muted-foreground", medium: "bg-info/15 text-info", high: "bg-destructive/15 text-destructive" };

function CompaniesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPrio, setFPrio] = useState("");
  const [sort, setSort] = useState<"created_at"|"priority"|"name">("created_at");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", role_focus: "", ctc: "", location: "", priority: "medium" as typeof PRIORITIES[number] });

  const { data: rows = [] } = useQuery({
    queryKey: ["companies", user!.id],
    queryFn: async () => (await supabase.from("companies").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("companies").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); setShowAdd(false); setDraft({ name: "", role_focus: "", ctc: "", location: "", priority: "medium" }); toast.success("Added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("companies").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("companies").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }) });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const prioRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    let r = rows.filter((x: any) =>
      (!ql || x.name?.toLowerCase().includes(ql) || x.role_focus?.toLowerCase().includes(ql)) &&
      (!fStatus || x.status === fStatus) && (!fPrio || x.priority === fPrio)
    );
    r = [...r].sort((a: any, b: any) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "priority") return (prioRank[b.priority]??0) - (prioRank[a.priority]??0);
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return r;
  }, [rows, q, fStatus, fPrio, sort]);

  // kanban grouped
  const groups = STATUSES.map((s) => ({ status: s, items: filtered.filter((r: any) => r.status === s) }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Company Prep</h1>
          <p className="text-sm text-muted-foreground">Target companies organised by prep stage.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />Add company
        </button>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-5 gap-2 items-end">
          <F label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inp} /></F>
          <F label="Role focus"><input value={draft.role_focus} onChange={(e) => setDraft({ ...draft, role_focus: e.target.value })} className={inp} /></F>
          <F label="CTC"><input value={draft.ctc} onChange={(e) => setDraft({ ...draft, ctc: e.target.value })} placeholder="₹ / $" className={inp} /></F>
          <F label="Location"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={inp} /></F>
          <F label="Priority"><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as any })} className={inp}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></F>
          <div className="md:col-span-5 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full h-8 pl-8 pr-2 rounded-md border border-border bg-background text-sm" />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={fPrio} onChange={(e) => setFPrio(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All priority</option>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
          <option value="created_at">Newest</option><option value="priority">Priority</option><option value="name">Name</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {groups.map((g) => (
          <div key={g.status} className="card-flat p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold capitalize">{g.status}</span>
              <span className="text-[10px] text-muted-foreground">{g.items.length}</span>
            </div>
            <div className="space-y-2">
              {g.items.map((r: any) => (
                <div key={r.id} className="p-2.5 rounded-md border border-border bg-background group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{r.name}</span>
                    </div>
                    <button onClick={() => del.mutate(r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  {r.role_focus && <div className="text-[11px] text-muted-foreground mt-1 truncate">{r.role_focus}</div>}
                  <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                    <span className={`text-[10px] px-1.5 h-5 rounded inline-flex items-center capitalize ${PRIO_COLOR[r.priority]}`}>{r.priority}</span>
                    {r.ctc && <span className="text-[10px] text-muted-foreground">{r.ctc}</span>}
                    {r.location && <span className="text-[10px] text-muted-foreground">· {r.location}</span>}
                  </div>
                  <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className="mt-2 w-full h-7 px-1 rounded border border-border bg-background text-[11px]">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
              {g.items.length === 0 && <div className="text-[11px] text-muted-foreground italic py-3 text-center">empty</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
