import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink, Mail, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/network")({ component: NetworkPage });

const RELATIONS = ["recruiter", "mentor", "referral", "peer", "alumni", "hiring_manager"] as const;
const STATUSES = ["to_contact", "messaged", "replied", "interview", "referred", "closed"] as const;
const STATUS_COLOR: Record<string, string> = { to_contact: "bg-muted text-muted-foreground", messaged: "bg-info/15 text-info", replied: "bg-warning/15 text-warning", interview: "bg-primary/15 text-primary", referred: "bg-success/15 text-success", closed: "bg-muted text-muted-foreground/60" };

function NetworkPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [fRel, setFRel] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [draft, setDraft] = useState({ name: "", role: "", company: "", relation: "recruiter" as string, linkedin_url: "", email: "", notes: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["contacts", user!.id],
    queryFn: async () => (await supabase.from("contacts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("contacts").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); setShowAdd(false); setDraft({ name: "", role: "", company: "", relation: "recruiter", linkedin_url: "", email: "", notes: "" }); toast.success("Contact added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("contacts").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("contacts").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }) });

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((r: any) => (!ql || r.name?.toLowerCase().includes(ql) || r.company?.toLowerCase().includes(ql)) && (!fRel || r.relation === fRel) && (!fStatus || r.status === fStatus));
  }, [rows, q, fRel, fStatus]);

  const stats = {
    total: rows.length,
    messaged: rows.filter((r: any) => ["messaged", "replied", "interview", "referred"].includes(r.status)).length,
    replied: rows.filter((r: any) => ["replied", "interview", "referred"].includes(r.status)).length,
    referred: rows.filter((r: any) => r.status === "referred").length,
  };

  const touch = (id: string) => update.mutate({ id, last_contact_at: new Date().toISOString().slice(0, 10) });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Network</h1>
          <p className="text-sm text-muted-foreground">Recruiters, mentors, alumni and referrals.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />Add contact
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Contacts" value={stats.total} />
        <Stat label="Messaged" value={stats.messaged} accent="text-info" />
        <Stat label="Replied" value={stats.replied} accent="text-warning" />
        <Stat label="Referred" value={stats.referred} accent="text-success" />
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-3 gap-2">
          <F label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inp} /></F>
          <F label="Role"><input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className={inp} /></F>
          <F label="Company"><input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} className={inp} /></F>
          <F label="Relation"><select value={draft.relation} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} className={inp}>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</select></F>
          <F label="LinkedIn URL"><input value={draft.linkedin_url} onChange={(e) => setDraft({ ...draft, linkedin_url: e.target.value })} className={inp} /></F>
          <F label="Email"><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inp} /></F>
          <F label="Notes"><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className={`${inp} min-h-[60px] md:col-span-3`} /></F>
          <div className="md:col-span-3 flex justify-end gap-2">
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
        <select value={fRel} onChange={(e) => setFRel(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All relations</option>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-background text-xs"><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="card-flat overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Role / Company</th>
              <th className="text-left px-3 py-2">Relation</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Last Contact</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-t border-border group hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{[r.role, r.company].filter(Boolean).join(" · ")}</td>
                <td className="px-3 py-2 text-xs">{r.relation}</td>
                <td className="px-3 py-2">
                  <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className={`text-[11px] px-2 h-6 rounded border-0 ${STATUS_COLOR[r.status]}`}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.last_contact_at ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-2">
                    {r.linkedin_url && <a href={r.linkedin_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    {r.email && <a href={`mailto:${r.email}`} className="text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /></a>}
                    <button onClick={() => touch(r.id)} className="text-[11px] text-muted-foreground hover:text-primary">Touch</button>
                    <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No contacts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
