import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, ExternalLink, FileText, File as FileIcon, Image as ImageIcon, Upload, Download, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { aiResumeReview } from "@/lib/ai.functions";
import { AICard, ScoreBar } from "@/components/ai-insight-card";

export const Route = createFileRoute("/_authenticated/resumes")({ component: ResumesPage });

const DOC_TYPES = ["resume", "cover_letter", "portfolio", "certificate", "transcript", "other"];
const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg";

function iconFor(mime?: string) {
  if (!mime) return FileIcon;
  if (mime.includes("pdf")) return FileText;
  if (mime.startsWith("image/")) return ImageIcon;
  return FileIcon;
}
function tintFor(mime?: string) {
  if (!mime) return "text-muted-foreground";
  if (mime.includes("pdf")) return "text-destructive";
  if (mime.startsWith("image/")) return "text-success";
  return "text-primary";
}

function ResumesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [draft, setDraft] = useState({ name: "", doc_type: "resume", version: 1, target_role: "", target_company: "", notes: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["documents", user!.id],
    queryFn: async () => (await (supabase as any).from("documents").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB allowed"); return; }
    setPending(f);
    setDraft((d) => ({ ...d, name: f.name.replace(/\.[^.]+$/, "") }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!pending) throw new Error("Select a file");
      if (!draft.name.trim()) throw new Error("Name required");
      const ext = pending.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("documents").upload(path, pending, { contentType: pending.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await (supabase as any).from("documents").insert({
        user_id: user!.id,
        name: draft.name,
        doc_type: draft.doc_type,
        version: draft.version,
        target_role: draft.target_role || null,
        target_company: draft.target_company || null,
        notes: draft.notes || null,
        storage_path: path,
        mime_type: pending.type,
        size_bytes: pending.size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setPending(null);
      setDraft({ name: "", doc_type: "resume", version: 1, target_role: "", target_company: "", notes: "" });
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Document save ho gaya ✓");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (r: any) => {
      await supabase.storage.from("documents").remove([r.storage_path]);
      await (supabase as any).from("documents").delete().eq("id", r.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Deleted"); },
  });

  const openSigned = async (r: any, download = false) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(r.storage_path, 3600, download ? { download: r.name } : undefined);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resume Vault</h1>
        <p className="text-sm text-muted-foreground">Apne saare placement documents ek jagah pe.</p>
      </div>

      <div className="card-flat p-4">
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={onFile} className="hidden" />
        {!pending ? (
          <button onClick={() => fileRef.current?.click()} className="w-full h-32 border-2 border-dashed border-border rounded-md hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Upload className="h-5 w-5" />
            <span className="text-sm font-medium">Device se Upload Karo</span>
            <span className="text-[11px]">PDF, DOCX, PNG, JPG · max 10MB</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-border rounded-md">
              {(() => { const I = iconFor(pending.type); return <I className={`h-6 w-6 ${tintFor(pending.type)}`} />; })()}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{pending.name}</div>
                <div className="text-[11px] text-muted-foreground">{(pending.size / 1024).toFixed(1)} KB · {pending.type || "unknown"}</div>
              </div>
              <button onClick={() => { setPending(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <F label="Document Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inp} /></F>
              <F label="Type">
                <select value={draft.doc_type} onChange={(e) => setDraft({ ...draft, doc_type: e.target.value })} className={inp}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
              <F label="Version"><input type="number" value={draft.version} onChange={(e) => setDraft({ ...draft, version: parseInt(e.target.value || "1") })} className={inp} /></F>
              <F label="Target Role"><input value={draft.target_role} onChange={(e) => setDraft({ ...draft, target_role: e.target.value })} className={inp} /></F>
              <F label="Target Company"><input value={draft.target_company} onChange={(e) => setDraft({ ...draft, target_company: e.target.value })} className={inp} /></F>
              <F label="Notes"><input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className={inp} /></F>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => save.mutate()} disabled={save.isPending} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                {save.isPending ? "Saving…" : "Save Karo"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card-flat overflow-hidden">
        <div className="grid grid-cols-12 items-center gap-2 px-4 h-9 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-1">v</div>
          <div className="col-span-2">Updated</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {rows.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No documents yet. Upload your first file.</div>}
        {rows.map((r: any) => {
          const I = iconFor(r.mime_type);
          return (
            <div key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 h-12 border-b border-border last:border-b-0 text-sm">
              <div className="col-span-5 flex items-center gap-2 min-w-0">
                <I className={`h-4 w-4 ${tintFor(r.mime_type)} shrink-0`} />
                <span className="truncate">{r.name}</span>
                {r.target_role && <span className="text-[10px] text-muted-foreground truncate">· {r.target_role}</span>}
              </div>
              <div className="col-span-2"><span className="text-[11px] px-2 h-5 rounded-full bg-muted inline-flex items-center">{r.doc_type}</span></div>
              <div className="col-span-1 text-xs">v{r.version}</div>
              <div className="col-span-2 text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <button onClick={() => openSigned(r)} className="h-7 w-7 rounded hover:bg-accent inline-flex items-center justify-center" title="View"><ExternalLink className="h-3.5 w-3.5" /></button>
                <button onClick={() => openSigned(r, true)} className="h-7 w-7 rounded hover:bg-accent inline-flex items-center justify-center" title="Download"><Download className="h-3.5 w-3.5" /></button>
                <button onClick={() => del.mutate(r)} className="h-7 w-7 rounded hover:bg-destructive/10 hover:text-destructive inline-flex items-center justify-center" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <ResumeReviewPanel />
    </div>
  );
}

function ResumeReviewPanel() {
  const run = useServerFn(aiResumeReview);
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handle = async () => {
    if (text.trim().length < 50) { toast.error("Paste at least your full resume text"); return; }
    setLoading(true);
    try { setResult(await run({ data: { resume: text, targetRole: target } })); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <AICard title="AI Resume Review" description="Paste your resume text — get an ATS score and bullet rewrites." onRun={handle} loading={loading} cta="Review">
      <div className="space-y-3">
        <div className="grid md:grid-cols-3 gap-2">
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target role (e.g. SDE Intern)" className={`${inp} md:col-span-1`} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste resume text here…" className={`${inp} md:col-span-2 min-h-[120px] py-2`} />
        </div>
        {result && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <ScoreBar value={result.score} label="Overall score" tone={result.score >= 70 ? "success" : result.score >= 40 ? "warning" : "destructive"} />
              <ScoreBar value={result.ats_score} label="ATS friendliness" tone={result.ats_score >= 70 ? "success" : "warning"} />
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div><div className="section-label mb-1">Strengths</div><ul className="list-disc pl-4 space-y-0.5">{result.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
              <div><div className="section-label mb-1">Weaknesses</div><ul className="list-disc pl-4 space-y-0.5">{result.weaknesses?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
            </div>
            {result.missing_keywords?.length > 0 && (
              <div><div className="section-label mb-1">Missing keywords</div><div className="flex flex-wrap gap-1">{result.missing_keywords.map((k: string, i: number) => <span key={i} className="text-[11px] px-2 h-5 rounded-full bg-warning/10 text-warning inline-flex items-center">{k}</span>)}</div></div>
            )}
            {result.bullet_rewrites?.length > 0 && (
              <div>
                <div className="section-label mb-1">Bullet rewrites</div>
                <div className="space-y-2">
                  {result.bullet_rewrites.map((b: any, i: number) => (
                    <div key={i} className="p-2 rounded border border-border text-xs space-y-1">
                      <div className="text-muted-foreground line-through">{b.before}</div>
                      <div className="text-success">→ {b.after}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AICard>
  );
}

const inp = "mt-0.5 h-9 px-2 w-full rounded border border-border bg-background text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</label>; }
