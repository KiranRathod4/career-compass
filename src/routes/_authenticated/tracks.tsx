import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { aiTrackRoadmap } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Plus, Sparkles, X, Trash2, ChevronRight, BookOpen, Loader2, Pencil, RefreshCw } from "lucide-react";
import { ProgressPanel } from "@/components/tracks/progress-panel";
import { RoadmapChecklist } from "@/components/tracks/roadmap-checklist";
import { TrackQATab } from "@/components/tracks/qa-tab";
import { TrackResourcesTab } from "@/components/tracks/resources-tab";
import { TrackNotesTab } from "@/components/tracks/notes-tab";

export const Route = createFileRoute("/_authenticated/tracks")({ component: TracksPage });

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const COLORS = ["slate", "purple", "blue", "teal", "green", "amber", "orange", "red"];
const COLOR_HEX: Record<string, string> = {
  slate: "#64748b", purple: "#7c3aed", blue: "#3b82f6", teal: "#14b8a6",
  green: "#10b981", amber: "#f59e0b", orange: "#f97316", red: "#ef4444",
};

function TracksPage() {
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);

  const { data: tracks = [] } = useQuery({
    queryKey: ["custom_tracks", user!.id],
    queryFn: async () => (await supabase.from("custom_tracks").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  if (openTrackId) return <TrackDetail trackId={openTrackId} onBack={() => setOpenTrackId(null)} />;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-h1 flex items-center gap-2"><BookOpen className="h-5 w-5" style={{ color: "var(--p-6)" }} /> Custom Tracks</h1>
          <p className="t-small mt-0.5">Build your own roadmap — generate with AI or add topics manually.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-[13px] flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> New track
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="card-flat p-10 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--text-3)" }} />
          <div className="t-h3">No custom tracks yet</div>
          <p className="t-small mt-1">System Design, ML, Mobile Dev — build a roadmap for any topic.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.map((t: any) => (
            <button key={t.id} onClick={() => setOpenTrackId(t.id)} className="card-flat p-4 text-left hover:border-[var(--p-6)] transition"
              style={{ borderLeft: `3px solid ${COLOR_HEX[t.color] ?? COLOR_HEX.purple}` }}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>{t.skill_level}</span>
                <ChevronRight className="h-4 w-4" style={{ color: "var(--text-3)" }} />
              </div>
              <div className="t-h3 mt-2">{t.name}</div>
              {t.target_type && <div className="t-small mt-0.5">→ {t.target_type}</div>}
              <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                <div className="h-full" style={{ width: `${t.completion_pct ?? 0}%`, background: COLOR_HEX[t.color] ?? COLOR_HEX.purple }} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>{t.completion_pct ?? 0}% complete</div>
            </button>
          ))}
        </div>
      )}

      {showNew && <NewTrackModal onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); setOpenTrackId(id); }} />}
    </div>
  );
}

function NewTrackModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const generateRoadmap = useServerFn(aiTrackRoadmap);
  const [form, setForm] = useState({ name: "", skill_level: "Beginner", target_type: "", why_this_track: "", color: "purple" });
  const [genAI, setGenAI] = useState(true);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.name.trim()) { toast.error("Track name is required"); return; }
    setBusy(true);
    try {
      const { data: track, error } = await supabase.from("custom_tracks").insert({
        user_id: user!.id, name: form.name, skill_level: form.skill_level,
        target_type: form.target_type || null, why_this_track: form.why_this_track || null, color: form.color,
      }).select().single();
      if (error) throw error;

      if (genAI) {
        toast.message("Generating AI roadmap…");
        const roadmap: any = await generateRoadmap({ data: { trackName: form.name, skillLevel: form.skill_level, targetType: form.target_type, why: form.why_this_track } });
        const topics: any[] = [];
        let order = 0;
        for (const section of roadmap.sections ?? []) {
          for (const topic of section.topics ?? []) {
            topics.push({
              user_id: user!.id, track_id: track.id,
              section_name: section.section_name, topic_name: topic.topic_name,
              notes: topic.notes ?? null, resource_url: topic.resource_url ?? null,
              sort_order: order++, status: "Not Started",
            });
          }
        }
        if (topics.length) await supabase.from("custom_track_topics").insert(topics);
        toast.success("Track and AI roadmap ready.");
      } else {
        toast.success("Track created.");
      }
      qc.invalidateQueries({ queryKey: ["custom_tracks"] });
      onCreated(track.id);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-flat p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-h2">New custom track</h2>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Track name"><Inp value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. System Design for SDE-1" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level">
              <select value={form.skill_level} onChange={(e) => setForm({ ...form, skill_level: e.target.value })}
                className="w-full h-9 px-2 rounded-md text-[13px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }}>
                {SKILL_LEVELS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Color">
              <div className="flex gap-1.5 h-9 items-center flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`h-5 w-5 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: COLOR_HEX[c] }} />
                ))}
              </div>
            </Field>
          </div>
          <Field label="Target (optional)"><Inp value={form.target_type} onChange={(v) => setForm({ ...form, target_type: v })} placeholder="e.g. Amazon SDE intern" /></Field>
          <Field label="Why this track (optional)">
            <textarea value={form.why_this_track} onChange={(e) => setForm({ ...form, why_this_track: e.target.value })}
              className="w-full px-2.5 py-2 rounded-md text-[13px] min-h-[60px] outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }}
              placeholder="What's your motivation?" />
          </Field>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer p-2 rounded-md hover:bg-[var(--bg-subtle)]"
            style={{ border: "1px solid var(--border-2)" }}>
            <input type="checkbox" checked={genAI} onChange={(e) => setGenAI(e.target.checked)} className="accent-primary" />
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--p-6)" }} />
            <span>Generate a full roadmap with AI</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-9 px-3 rounded-md text-[13px]" style={{ border: "1px solid var(--border-2)" }}>Cancel</button>
          <button onClick={create} disabled={busy} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-50 flex items-center gap-1.5">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "Creating…" : "Create track"}
          </button>
        </div>
      </div>
    </div>
  );
}

type TabKey = "roadmap" | "qa" | "resources" | "notes";

function TrackDetail({ trackId, onBack }: { trackId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("roadmap");
  const [editing, setEditing] = useState(false);

  const { data: track } = useQuery({
    queryKey: ["custom_track", trackId],
    queryFn: async () => (await supabase.from("custom_tracks").select("*").eq("id", trackId).single()).data,
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["custom_track_topics", trackId],
    queryFn: async () => (await supabase.from("custom_track_topics").select("*").eq("track_id", trackId).order("sort_order")).data ?? [],
  });

  const delTrack = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("custom_tracks").delete().eq("id", trackId); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom_tracks"] }); toast.success("Track deleted"); onBack(); },
  });

  if (!track) return <div className="t-small">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <button onClick={onBack} className="text-[12px]" style={{ color: "var(--text-3)" }}>← All tracks</button>

      {/* Overview card */}
      <div className="rounded-[var(--radius-xl)] p-5 flex items-start justify-between gap-4" style={{ background: "var(--bg-subtle)" }}>
        <div className="flex-1 min-w-0">
          <h1 className="t-h1">{track.name}</h1>
          <DescriptionInline trackId={trackId} initial={track.description ?? ""} />
          <div className="flex items-center gap-2 mt-3">
            <Pill style={{ background: COLOR_HEX[track.color] + "22", color: COLOR_HEX[track.color] }}>{track.color}</Pill>
            <Pill>{track.skill_level}</Pill>
            {track.target_type && <Pill>{track.target_type}</Pill>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="h-9 px-3 rounded-md text-[13px] flex items-center gap-1.5"
            style={{ border: "1px solid var(--border-2)", background: "var(--bg-surface)" }}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <RegenerateButton trackId={trackId} track={track} />
          <button onClick={() => { if (confirm("Delete this track and all its topics?")) delTrack.mutate(); }}
            className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
            style={{ color: "var(--text-3)", border: "1px solid var(--border-2)", background: "var(--bg-surface)" }}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-2)" }}>
        {(["roadmap", "qa", "resources", "notes"] as TabKey[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-9 px-3 text-[13px] border-b-2 transition-colors -mb-px ${tab === t ? "border-[var(--p-6)] text-[color:var(--text-1)] font-medium" : "border-transparent"}`}
            style={tab === t ? {} : { color: "var(--text-3)" }}>
            {t === "qa" ? "Interview Q&A" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "roadmap" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="order-2 lg:order-1"><RoadmapChecklist trackId={trackId} topics={topics as any} /></div>
          <div className="order-1 lg:order-2"><ProgressPanel topics={topics as any} /></div>
        </div>
      )}
      {tab === "qa" && <TrackQATab trackId={trackId} trackName={track.name} skillLevel={track.skill_level} />}
      {tab === "resources" && <TrackResourcesTab trackId={trackId} trackName={track.name} />}
      {tab === "notes" && <TrackNotesTab trackId={trackId} initial={track.notes_content ?? ""} />}

      {editing && <EditTrackModal track={track} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["custom_track", trackId] }); qc.invalidateQueries({ queryKey: ["custom_tracks"] }); }} />}
    </div>
  );
}

function Pill({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-surface)", color: "var(--text-2)", border: "1px solid var(--border-2)", ...style }}>{children}</span>;
}

function DescriptionInline({ trackId, initial }: { trackId: string; initial: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initial);
  const save = async () => {
    await supabase.from("custom_tracks").update({ description: val.trim() || null }).eq("id", trackId);
    qc.invalidateQueries({ queryKey: ["custom_track", trackId] });
    setEditing(false);
  };
  if (editing) {
    return <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()}
      className="mt-1 w-full text-[13px] h-8 px-2 rounded-md outline-none"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)", color: "var(--text-1)" }} />;
  }
  return (
    <div className="mt-1 text-[13px] cursor-pointer" style={{ color: initial ? "var(--text-2)" : "var(--text-3)" }} onClick={() => setEditing(true)}>
      {initial || "No description yet — click to add"}
    </div>
  );
}

function RegenerateButton({ trackId, track }: { trackId: string; track: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const generateRoadmap = useServerFn(aiTrackRoadmap);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm("This will replace ALL existing topics with a new AI-generated roadmap. Continue?")) return;
    setBusy(true);
    try {
      await supabase.from("custom_track_topics").delete().eq("track_id", trackId);
      const roadmap: any = await generateRoadmap({ data: { trackName: track.name, skillLevel: track.skill_level, targetType: track.target_type ?? undefined, why: track.why_this_track ?? undefined } });
      const topics: any[] = [];
      let order = 0;
      for (const section of roadmap.sections ?? []) {
        for (const topic of section.topics ?? []) {
          topics.push({
            user_id: user!.id, track_id: trackId,
            section_name: section.section_name, topic_name: topic.topic_name,
            notes: topic.notes ?? null, resource_url: topic.resource_url ?? null,
            sort_order: order++, status: "Not Started",
          });
        }
      }
      if (topics.length) await supabase.from("custom_track_topics").insert(topics);
      qc.invalidateQueries({ queryKey: ["custom_track_topics", trackId] });
      toast.success("New roadmap generated.");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy} className="h-9 px-3 rounded-md text-[13px] flex items-center gap-1.5 disabled:opacity-50"
      style={{ border: "1px solid var(--border-2)", background: "var(--bg-surface)" }}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Regenerate
    </button>
  );
}

function EditTrackModal({ track, onClose, onSaved }: { track: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(track.name);
  const [color, setColor] = useState(track.color);
  const save = async () => {
    if (!name.trim()) return;
    await supabase.from("custom_tracks").update({ name, color }).eq("id", track.id);
    onSaved();
  };
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-flat p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-h2">Edit track</h2>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Name"><Inp value={name} onChange={setName} /></Field>
          <Field label="Color">
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: COLOR_HEX[c] }} />
              ))}
            </div>
          </Field>
        </div>
        <button onClick={save} className="mt-4 w-full h-9 rounded-md bg-primary text-primary-foreground text-[13px]">Save</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</span><div className="mt-0.5">{children}</div></label>;
}
function Inp({ onChange, ...p }: { onChange?: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <input {...p} onChange={(e) => onChange?.(e.target.value)} className="w-full h-9 px-2.5 rounded-md text-[13px] outline-none"
    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />;
}
