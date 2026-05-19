import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink, Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/resources")({ component: ResourcesPage });

const TYPES = ["Article","Video","Course","Book","Repo","Cheatsheet","Other"] as const;
const STATUSES = ["todo","reading","done","archived"] as const;
const STATUS_COLOR: Record<string, string> = { todo: "bg-muted text-muted-foreground", reading: "bg-info/15 text-info", done: "bg-success/15 text-success", archived: "bg-muted text-muted-foreground/60" };

function ResourcesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [sort, setSort] = useState<"created_at"|"rating"|"title">("created_at");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ title: "", url: "", resource_type: "Article" as typeof TYPES[number], topic: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["resources", user!.id],
    queryFn: async () => (await supabase.from("resources").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("resources").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); setShowAdd(false); setDraft({ title: "", url: "", resource_type: "Article", topic: "" }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("resources").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("resources").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }) });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    let r = rows.filter((x: any) =>
      (!ql || x.title?.toLowerCase().includes(ql) || x.topic?.toLowerCase().includes(ql)) &&
      (!fType || x.resource_type === fType) && (!fStatus || x.status === fStatus)
    );
    r = [...r].sort((a: any, b: any) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return r;
  }, [rows, q, fType, fStatus, sort]);

  const stats = {
    total: rows.length,
    reading: rows.filter((r: any) => r.status === "reading").length,
    done: rows.filter((r: any) => r.status === "done").length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resource Hub</h1>
          <p className="text-sm text-muted-foreground">Curated articles, videos, courses and cheatsheets.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />Add resource
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Saved" value={stats.total} />
        <Stat label="Reading" value={stats.reading} accent="text-info" />
        <Stat label="Done" value={stats.done} accent="text-success" />
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-4 gap-2 items-end">
          <F label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inp} /></F>
          <F label="URL"><input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className={inp} /></F>
          <F label="Type"><select value={draft.resource_type} onChange={(e) => setDraft({ ...draft, resource_type: e.target.value as any })} className={inp}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Topic"><input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className={inp} /></F>
          <div className="md:col-span-4 flex justify-end gap-2">
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
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All types</option>{TYPES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
          <option value="created_at">Newest</option><option value="rating">Rating</option><option value="title">Title</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r: any) => (
          <div key={r.id} className="card-flat p-4 group flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.resource_type}</span>
              <button onClick={() => del.mutate(r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <a href={r.url || "#"} target="_blank" rel="noreferrer" className="mt-1 font-medium text-sm hover:text-primary inline-flex items-center gap-1.5">
              {r.title}{r.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
            </a>
            {r.topic && <div className="text-xs text-muted-foreground mt-1">{r.topic}</div>}
            <div className="mt-3 flex items-center gap-2">
              <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[r.status]}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-0.5 ml-auto">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => update.mutate({ id: r.id, rating: r.rating === n ? null : n })}>
                    <Star className={`h-3.5 w-3.5 ${(r.rating ?? 0) >= n ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="md:col-span-2 lg:col-span-3 card-flat p-10 text-center text-sm text-muted-foreground">No resources yet. Click "Add resource".</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
