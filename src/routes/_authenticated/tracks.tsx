import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { aiTrackRoadmap } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Plus, Sparkles, X, Trash2, ChevronRight, BookOpen, Check, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tracks")({ component: TracksPage });

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const COLORS = ["purple", "blue", "emerald", "amber", "rose", "fuchsia"];
const COLOR_CLASS: Record<string, string> = {
  purple: "bg-primary/15 text-primary border-primary/30",
  blue: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  emerald: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30",
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
          <h1 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Custom Tracks</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Apna khud ka roadmap banao — AI se generate kar lo ya manually add karo.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> New track
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="card-flat p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium">Koi custom track nahi hai abhi</div>
          <p className="text-xs text-muted-foreground mt-1">System Design, ML, Mobile Dev — koi bhi topic ka roadmap bana lo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.map((t: any) => (
            <button key={t.id} onClick={() => setOpenTrackId(t.id)} className="card-flat p-4 text-left hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-2">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${COLOR_CLASS[t.color] ?? COLOR_CLASS.purple}`}>
                  {t.skill_level}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold mt-2">{t.name}</div>
              {t.target_type && <div className="text-[11px] text-muted-foreground mt-0.5">→ {t.target_type}</div>}
              <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${t.completion_pct ?? 0}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{t.completion_pct ?? 0}% complete</div>
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
    if (!form.name.trim()) { toast.error("Track ka naam dalo"); return; }
    setBusy(true);
    try {
      const { data: track, error } = await supabase.from("custom_tracks").insert({
        user_id: user!.id, name: form.name, skill_level: form.skill_level,
        target_type: form.target_type || null, why_this_track: form.why_this_track || null, color: form.color,
      }).select().single();
      if (error) throw error;

      if (genAI) {
        toast.message("AI roadmap generate ho raha hai…");
        const roadmap: any = await generateRoadmap({ data: {
          trackName: form.name, skillLevel: form.skill_level, targetType: form.target_type, why: form.why_this_track,
        }});
        const topics: any[] = [];
        let order = 0;
        for (const section of roadmap.sections ?? []) {
          for (const topic of section.topics ?? []) {
            topics.push({
              user_id: user!.id, track_id: track.id,
              section_name: section.section_name, topic_name: topic.topic_name,
              notes: topic.notes ?? null, resource_url: topic.resource_url ?? null,
              sort_order: order++,
            });
          }
        }
        if (topics.length) {
          const { error: terr } = await supabase.from("custom_track_topics").insert(topics);
          if (terr) throw terr;
        }
        toast.success("Naya track ready! AI roadmap bhi generate ho gaya.");
      } else {
        toast.success("Track create ho gaya!");
      }
      qc.invalidateQueries({ queryKey: ["custom_tracks"] });
      onCreated(track.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-flat p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">New custom track</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Track name">
            <Inp value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. System Design for SDE-1" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level">
              <select value={form.skill_level} onChange={(e) => setForm({ ...form, skill_level: e.target.value })}
                className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm">
                {SKILL_LEVELS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Color">
              <div className="flex gap-1.5 h-9 items-center">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`h-5 w-5 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"} ${COLOR_CLASS[c]}`} />
                ))}
              </div>
            </Field>
          </div>
          <Field label="Target / why (optional)">
            <Inp value={form.target_type} onChange={(v) => setForm({ ...form, target_type: v })} placeholder="e.g. Amazon SDE intern" />
          </Field>
          <Field label="Why this track (optional)">
            <textarea value={form.why_this_track} onChange={(e) => setForm({ ...form, why_this_track: e.target.value })}
              className="w-full px-2.5 py-2 rounded-md border border-border bg-background text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Aap kyun yeh seekhna chahte ho?" />
          </Field>
          <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-md border border-border hover:bg-accent">
            <input type="checkbox" checked={genAI} onChange={(e) => setGenAI(e.target.checked)} className="accent-primary" />
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI se full roadmap generate karo (sections + topics)</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
          <button onClick={create} disabled={busy} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "Creating…" : "Create track"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackDetail({ trackId, onBack }: { trackId: string; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTopic, setNewTopic] = useState({ section_name: "General", topic_name: "" });

  const { data: track } = useQuery({
    queryKey: ["custom_track", trackId],
    queryFn: async () => (await supabase.from("custom_tracks").select("*").eq("id", trackId).single()).data,
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["custom_track_topics", trackId],
    queryFn: async () => (await supabase.from("custom_track_topics").select("*").eq("track_id", trackId).order("sort_order")).data ?? [],
  });

  const toggle = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("custom_track_topics").update({
        completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null,
        status: !t.completed ? "Done" : "Not Started",
      }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["custom_track_topics", trackId] });
      const fresh = (await supabase.from("custom_track_topics").select("completed").eq("track_id", trackId)).data ?? [];
      const pct = fresh.length ? Math.round((fresh.filter((x: any) => x.completed).length / fresh.length) * 100) : 0;
      await supabase.from("custom_tracks").update({ completion_pct: pct }).eq("id", trackId);
      qc.invalidateQueries({ queryKey: ["custom_tracks"] });
      qc.invalidateQueries({ queryKey: ["custom_track", trackId] });
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("custom_track_topics").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_track_topics", trackId] }),
  });
  const delTrack = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("custom_tracks").delete().eq("id", trackId); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom_tracks"] }); toast.success("Track delete ho gaya"); onBack(); },
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!newTopic.topic_name.trim()) throw new Error("Topic name required");
      const { error } = await supabase.from("custom_track_topics").insert({
        user_id: user!.id, track_id: trackId,
        section_name: newTopic.section_name || "General", topic_name: newTopic.topic_name,
        sort_order: topics.length,
      });
      if (error) throw error;
    },
    onSuccess: () => { setNewTopic({ ...newTopic, topic_name: "" }); qc.invalidateQueries({ queryKey: ["custom_track_topics", trackId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!track) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const sections: Record<string, any[]> = {};
  topics.forEach((t: any) => { (sections[t.section_name] ??= []).push(t); });
  const sectionNames = Array.from(new Set(topics.map((t: any) => t.section_name)));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← All tracks</button>
      <div className="card-flat p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${COLOR_CLASS[track.color] ?? COLOR_CLASS.purple}`}>
              {track.skill_level}
            </div>
            <h1 className="text-xl font-semibold mt-2">{track.name}</h1>
            {track.target_type && <div className="text-xs text-muted-foreground mt-0.5">Target: {track.target_type}</div>}
            {track.why_this_track && <div className="text-xs text-muted-foreground mt-2 italic">"{track.why_this_track}"</div>}
          </div>
          <button onClick={() => { if (confirm("Delete track aur saare topics?")) delTrack.mutate(); }}
            className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${track.completion_pct ?? 0}%` }} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">{track.completion_pct ?? 0}% complete · {topics.filter((t: any) => t.completed).length}/{topics.length} topics</div>
      </div>

      <div className="card-flat p-4">
        <div className="flex gap-2">
          <Inp value={newTopic.section_name} onChange={(v) => setNewTopic({ ...newTopic, section_name: v })} placeholder="Section" />
          <Inp value={newTopic.topic_name} onChange={(v) => setNewTopic({ ...newTopic, topic_name: v })} placeholder="Topic name"
            onKeyDown={(e) => e.key === "Enter" && add.mutate()} />
          <button onClick={() => add.mutate()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {sectionNames.length === 0 ? (
        <div className="card-flat p-8 text-center text-sm text-muted-foreground">Koi topic nahi. Upar add karo.</div>
      ) : (
        sectionNames.map((sec) => (
          <div key={sec} className="card-flat p-4">
            <div className="section-label mb-3">{sec}</div>
            <div className="space-y-1">
              {sections[sec].map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent group">
                  <button onClick={() => toggle.mutate(t)}
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${t.completed ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                    {t.completed && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.topic_name}</div>
                    {t.notes && <div className="text-[11px] text-muted-foreground truncate">{t.notes}</div>}
                  </div>
                  {t.resource_url && (
                    <a href={t.resource_url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span><div className="mt-0.5">{children}</div></label>;
}
function Inp({ onChange, ...p }: { onChange?: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <input {...p} onChange={(e) => onChange?.(e.target.value)} className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />;
}
