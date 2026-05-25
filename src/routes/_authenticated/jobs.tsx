import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { useReward, BadgeUnlockModal } from "@/hooks/use-reward";
import { aiProbability } from "@/lib/ai.functions";
import { AICard, ScoreBar } from "@/components/ai-insight-card";

export const Route = createFileRoute("/_authenticated/jobs")({ component: JobsPage });

const STATUSES = ["saved","applied","oa","interview","offer","rejected","accepted"] as const;
const TYPES = ["Internship","Full-time","PPO","Contract"] as const;
const STATUS_COLOR: Record<string, string> = {
  saved: "var(--color-neutral)", applied: "var(--color-info)", oa: "var(--color-primary)",
  interview: "var(--color-warning)", offer: "var(--color-success)", rejected: "var(--color-destructive)", accepted: "var(--color-success)",
};

function JobsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { reward, unlocked, closeUnlock } = useReward();
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fType, setFType] = useState("");
  const [sort, setSort] = useState<"created_at"|"applied_at"|"deadline">("created_at");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ company: "", role: "", location: "", job_type: "Internship" as typeof TYPES[number], source: "", link: "", applied_at: "", deadline: "", salary: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["jobs", user!.id],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.company.trim() || !draft.role.trim()) throw new Error("Company and role required");
      const payload: any = { user_id: user!.id, ...draft };
      if (!payload.applied_at) delete payload.applied_at;
      if (!payload.deadline) delete payload.deadline;
      const { error } = await supabase.from("jobs").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); setShowAdd(false); setDraft({ company: "", role: "", location: "", job_type: "Internship", source: "", link: "", applied_at: "", deadline: "", salary: "" }); toast.success("Job added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, _prevStatus, ...p }: any) => {
      const { error } = await supabase.from("jobs").update(p).eq("id", id);
      if (error) throw error;
      return { newStatus: p.status, prevStatus: _prevStatus };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      if (!res?.newStatus) return;
      const advanced = ["applied", "oa", "interview", "offer", "accepted"];
      if (res.newStatus === "applied" && res.prevStatus !== "applied") reward("job_applied", 25, { confetti: true });
      else if (res.newStatus === "interview" && !["interview","offer","accepted"].includes(res.prevStatus)) reward("job_interview", 100, { confetti: true });
      else if (res.newStatus === "offer" && !["offer","accepted"].includes(res.prevStatus)) reward("job_offer", 500, { confetti: true });
    },
  });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("jobs").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }) });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    let r = rows.filter((x: any) =>
      (!ql || x.company?.toLowerCase().includes(ql) || x.role?.toLowerCase().includes(ql)) &&
      (!fStatus || x.status === fStatus) && (!fType || x.job_type === fType)
    );
    r = [...r].sort((a: any, b: any) => ((b[sort] ?? "") as string).localeCompare((a[sort] ?? "") as string));
    return r;
  }, [rows, q, fStatus, fType, sort]);

  const counts = STATUSES.map((s) => ({ name: s, value: rows.filter((r: any) => r.status === s).length })).filter((x) => x.value > 0);
  const totals = {
    total: rows.length,
    applied: rows.filter((r: any) => ["applied","oa","interview","offer","accepted"].includes(r.status)).length,
    interviews: rows.filter((r: any) => ["interview","offer","accepted"].includes(r.status)).length,
    offers: rows.filter((r: any) => ["offer","accepted"].includes(r.status)).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <BadgeUnlockModal badge={unlocked} onClose={closeUnlock} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Job Tracker</h1>
          <p className="text-sm text-muted-foreground">Pipeline for internships and full-time roles.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />Add job
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total" value={totals.total} />
        <Stat label="Applied" value={totals.applied} accent="text-info" />
        <Stat label="Interviews" value={totals.interviews} accent="text-warning" />
        <Stat label="Offers" value={totals.offers} accent="text-success" />
      </div>

      <ProbabilityPanel rows={rows} totals={totals} />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-flat p-4 md:col-span-1">
          <div className="section-label mb-3">Pipeline</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={counts} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {counts.map((c) => <Cell key={c.name} fill={STATUS_COLOR[c.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-flat p-4 md:col-span-2">
          <div className="section-label mb-3">Funnel</div>
          <div className="space-y-2">
            {STATUSES.map((s) => {
              const c = rows.filter((r: any) => r.status === s).length;
              const pct = totals.total ? (c / totals.total) * 100 : 0;
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span className="capitalize">{s}</span><span>{c}</span></div>
                  <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full rounded" style={{ width: `${pct}%`, background: STATUS_COLOR[s] }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-4 gap-2 items-end">
          <F label="Company"><input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className={inp} /></F>
          <F label="Role"><input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className={inp} /></F>
          <F label="Location"><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className={inp} /></F>
          <F label="Type"><select value={draft.job_type} onChange={(e) => setDraft({ ...draft, job_type: e.target.value as any })} className={inp}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Source"><input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="LinkedIn / Referral…" className={inp} /></F>
          <F label="Link"><input value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} className={inp} /></F>
          <F label="Applied"><input type="date" value={draft.applied_at} onChange={(e) => setDraft({ ...draft, applied_at: e.target.value })} className={inp} /></F>
          <F label="Deadline"><input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} className={inp} /></F>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="card-flat overflow-hidden">
        <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or role…" className="w-full h-8 pl-8 pr-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={fType} onChange={(e) => setFType(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All types</option>{TYPES.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-8 px-2 rounded-md border border-border bg-background text-xs">
            <option value="created_at">Newest</option><option value="applied_at">Applied date</option><option value="deadline">Deadline</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr><Th>Company</Th><Th>Role</Th><Th>Type</Th><Th>Location</Th><Th>Status</Th><Th>Applied</Th><Th>Deadline</Th><Th></Th></tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium flex items-center gap-2">{r.company}{r.link && <a href={r.link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                    <div className="text-[11px] text-muted-foreground">{r.source}</div>
                  </td>
                  <td className="px-3 py-2">{r.role}</td>
                  <td className="px-3 py-2 text-xs">{r.job_type}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.location}</td>
                  <td className="px-3 py-2">
                    <select value={r.status} onChange={(e) => {
                      const patch: any = { status: e.target.value };
                      if (e.target.value === "applied" && !r.applied_at) patch.applied_at = format(new Date(), "yyyy-MM-dd");
                      update.mutate({ id: r.id, _prevStatus: r.status, ...patch });
                    }} className="text-[11px] px-2 h-6 rounded border-0 font-medium" style={{ color: STATUS_COLOR[r.status], background: `color-mix(in oklab, ${STATUS_COLOR[r.status]} 15%, transparent)` }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.applied_at ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.deadline ?? "—"}</td>
                  <td className="px-3 py-2"><button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No jobs tracked yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
function Th({ children }: { children?: React.ReactNode }) { return <th className="text-left font-medium px-3 py-2">{children}</th>; }
