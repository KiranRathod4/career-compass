import { createFileRoute } from "@tanstack/react-router";
import { localDateKey } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink, Heart, MessageCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/linkedin")({ component: LinkedInPage });

const STATUSES = ["idea", "drafting", "scheduled", "posted", "archived"] as const;
const STATUS_COLOR: Record<string, string> = { idea: "bg-muted text-muted-foreground", drafting: "bg-info/15 text-info", scheduled: "bg-warning/15 text-warning", posted: "bg-success/15 text-success", archived: "bg-muted text-muted-foreground/60" };
const TYPES = ["text", "carousel", "image", "video", "article"] as const;

function LinkedInPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [fStatus, setFStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ topic: "", hook: "", body: "", post_type: "text" as string, status: "idea" as string, scheduled_for: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["linkedin", user!.id],
    queryFn: async () => (await supabase.from("linkedin_posts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.topic.trim()) throw new Error("Topic required");
      const payload: any = { user_id: user!.id, ...draft };
      if (!payload.scheduled_for) delete payload.scheduled_for;
      const { error } = await supabase.from("linkedin_posts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["linkedin"] }); setShowAdd(false); setDraft({ topic: "", hook: "", body: "", post_type: "text", status: "idea", scheduled_for: "" }); toast.success("Post added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("linkedin_posts").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("linkedin_posts").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin"] }) });

  const filtered = useMemo(() => rows.filter((r: any) => !fStatus || r.status === fStatus), [rows, fStatus]);

  const stats = {
    posted: rows.filter((r: any) => r.status === "posted").length,
    scheduled: rows.filter((r: any) => r.status === "scheduled").length,
    impressions: rows.reduce((s: number, r: any) => s + (r.impressions || 0), 0),
    engagement: rows.reduce((s: number, r: any) => s + (r.likes || 0) + (r.comments || 0), 0),
  };

  const chart = rows
    .filter((r: any) => r.status === "posted" && r.posted_at)
    .sort((a: any, b: any) => a.posted_at.localeCompare(b.posted_at))
    .slice(-12)
    .map((r: any) => ({ date: r.posted_at.slice(5), impressions: r.impressions || 0, engagement: (r.likes || 0) + (r.comments || 0) }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">LinkedIn Planner</h1>
          <p className="text-sm text-muted-foreground">Content calendar, hooks and engagement log.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />New post
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Posted" value={stats.posted} accent="text-success" />
        <Stat label="Scheduled" value={stats.scheduled} accent="text-warning" />
        <Stat label="Impressions" value={stats.impressions.toLocaleString()} />
        <Stat label="Engagement" value={stats.engagement.toLocaleString()} accent="text-primary" />
      </div>

      {chart.length > 1 && (
        <div className="card-flat p-4">
          <div className="section-label mb-2">Recent post performance</div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="impressions" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="engagement" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-2 gap-2">
          <F label="Topic"><input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className={inp} /></F>
          <F label="Type"><select value={draft.post_type} onChange={(e) => setDraft({ ...draft, post_type: e.target.value })} className={inp}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Hook (first line)"><input value={draft.hook} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} className={inp} /></F>
          <F label="Scheduled for"><input type="date" value={draft.scheduled_for} onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })} className={inp} /></F>
          <F label="Body"><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={`${inp} min-h-[100px] md:col-span-2`} /></F>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat p-3 flex flex-wrap gap-2 items-center">
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="space-y-2">
        {filtered.map((p: any) => (
          <div key={p.id} className="card-flat overflow-hidden">
            <div className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <button onClick={() => setOpen(open === p.id ? null : p.id)} className="text-left w-full">
                  <div className="text-sm font-medium truncate">{p.topic}</div>
                  {p.hook && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.hook}</div>}
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-muted">{p.post_type}</span>
                  {p.scheduled_for && <span>📅 {p.scheduled_for}</span>}
                  {p.posted_at && <span>✓ {p.posted_at}</span>}
                  {p.status === "posted" && (
                    <span className="inline-flex items-center gap-2 ml-2">
                      <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{p.impressions || 0}</span>
                      <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{p.likes || 0}</span>
                      <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{p.comments || 0}</span>
                    </span>
                  )}
                </div>
              </div>
              <select value={p.status} onChange={(e) => {
                const v = e.target.value;
                const patch: any = { status: v };
                if (v === "posted" && !p.posted_at) patch.posted_at = localDateKey();
                update.mutate({ id: p.id, ...patch });
              }} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[p.status]}`}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
              <button onClick={() => del.mutate(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {open === p.id && (
              <div className="border-t border-border p-3 bg-muted/30 space-y-2">
                <textarea value={p.body ?? ""} onChange={(e) => update.mutate({ id: p.id, body: e.target.value })} placeholder="Post body…" className="w-full min-h-[120px] text-sm p-2 rounded border border-border bg-background" />
                {p.status === "posted" && (
                  <div className="grid grid-cols-4 gap-2">
                    <F label="Post URL"><input value={p.url ?? ""} onChange={(e) => update.mutate({ id: p.id, url: e.target.value })} className={inp} /></F>
                    <F label="Impressions"><input type="number" value={p.impressions ?? 0} onChange={(e) => update.mutate({ id: p.id, impressions: parseInt(e.target.value || "0") })} className={inp} /></F>
                    <F label="Likes"><input type="number" value={p.likes ?? 0} onChange={(e) => update.mutate({ id: p.id, likes: parseInt(e.target.value || "0") })} className={inp} /></F>
                    <F label="Comments"><input type="number" value={p.comments ?? 0} onChange={(e) => update.mutate({ id: p.id, comments: parseInt(e.target.value || "0") })} className={inp} /></F>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="card-flat p-10 text-center text-sm text-muted-foreground">No posts yet. Plan your first one.</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
