import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, ExternalLink, FileText, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { aiResumeReview } from "@/lib/ai.functions";
import { AICard, ScoreBar } from "@/components/ai-insight-card";

export const Route = createFileRoute("/_authenticated/resumes")({ component: ResumesPage });

function ResumesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", target_role: "", file_url: "", notes: "", version: 1 });

  const { data: rows = [] } = useQuery({
    queryKey: ["resumes", user!.id],
    queryFn: async () => (await supabase.from("resumes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("resumes").insert({ user_id: user!.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); setShowAdd(false); setDraft({ name: "", target_role: "", file_url: "", notes: "", version: 1 }); toast.success("Resume saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({ mutationFn: async ({ id, ...p }: any) => { const { error } = await supabase.from("resumes").update(p).eq("id", id); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }) });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("resumes").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }) });

  const setActive = async (id: string) => {
    await supabase.from("resumes").update({ is_active: false }).eq("user_id", user!.id);
    await supabase.from("resumes").update({ is_active: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["resumes"] });
    toast.success("Set as active");
  };

  const stats = { total: rows.length, active: rows.filter((r: any) => r.is_active).length };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resume Vault</h1>
          <p className="text-sm text-muted-foreground">Versioned resumes and role-tailored variants.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />Add resume
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Resumes" value={stats.total} />
        <Stat label="Active" value={stats.active} accent="text-success" />
      </div>

      {showAdd && (
        <div className="card-flat p-4 grid md:grid-cols-2 gap-2">
          <F label="Name (e.g. SDE-General-v3)"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inp} /></F>
          <F label="Target role"><input value={draft.target_role} onChange={(e) => setDraft({ ...draft, target_role: e.target.value })} className={inp} /></F>
          <F label="File URL (Drive / Notion)"><input value={draft.file_url} onChange={(e) => setDraft({ ...draft, file_url: e.target.value })} className={inp} /></F>
          <F label="Version"><input type="number" value={draft.version} onChange={(e) => setDraft({ ...draft, version: parseInt(e.target.value || "1") })} className={inp} /></F>
          <F label="Notes"><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className={`${inp} min-h-[60px]`} /></F>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
            <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r: any) => (
          <div key={r.id} className={`card-flat p-4 group flex flex-col ${r.is_active ? "ring-1 ring-primary/40" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
              <button onClick={() => del.mutate(r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-2 font-medium text-sm">{r.name} <span className="text-xs text-muted-foreground">v{r.version}</span></div>
            {r.target_role && <div className="text-xs text-muted-foreground mt-0.5">{r.target_role}</div>}
            {r.notes && <div className="text-xs text-muted-foreground mt-2 line-clamp-3">{r.notes}</div>}
            <div className="mt-3 flex items-center gap-2">
              {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Open</a>}
              <button onClick={() => setActive(r.id)} className={`ml-auto text-[11px] px-2 h-6 rounded inline-flex items-center gap-1 ${r.is_active ? "bg-success/15 text-success" : "border border-border text-muted-foreground"}`}>
                {r.is_active && <Check className="h-3 w-3" />}{r.is_active ? "Active" : "Set active"}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="md:col-span-2 lg:col-span-3 card-flat p-10 text-center text-sm text-muted-foreground">No resumes yet. Add your first version.</div>}
      </div>
    </div>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) { return <div className="card-flat p-4"><div className="section-label">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent ?? ""}`}>{value}</div></div>; }
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
