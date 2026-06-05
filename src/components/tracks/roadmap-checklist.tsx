import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Square, CheckSquare, Clock, GripVertical, ExternalLink, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Topic = {
  id: string; track_id: string; section_name: string; topic_name: string;
  status: string; notes: string | null; resource_url: string | null; sort_order: number;
};

const NEXT: Record<string, string> = { "Not Started": "In Progress", "In Progress": "Completed", "Completed": "Not Started" };

export function RoadmapChecklist({ trackId, topics }: { trackId: string; topics: Topic[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);

  const sections: Record<string, Topic[]> = {};
  topics.forEach((t) => { (sections[t.section_name] ??= []).push(t); });
  const sectionNames = Array.from(new Set(topics.map((t) => t.section_name)));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["custom_track_topics", trackId] });
    qc.invalidateQueries({ queryKey: ["custom_track", trackId] });
  };

  const updateTrackPct = async () => {
    const { data: fresh } = await supabase.from("custom_track_topics").select("status").eq("track_id", trackId);
    const arr = fresh ?? [];
    const pct = arr.length ? Math.round((arr.filter((x: any) => x.status === "Completed").length / arr.length) * 100) : 0;
    await supabase.from("custom_tracks").update({ completion_pct: pct }).eq("id", trackId);
    qc.invalidateQueries({ queryKey: ["custom_tracks"] });
  };

  const cycleStatus = useMutation({
    mutationFn: async (t: Topic) => {
      const next = NEXT[t.status] ?? "Not Started";
      const { error } = await supabase.from("custom_track_topics").update({
        status: next,
        completed: next === "Completed",
        completed_at: next === "Completed" ? new Date().toISOString() : null,
      }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: async () => { invalidate(); await updateTrackPct(); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("custom_track_topics").delete().eq("id", id); if (error) throw error; },
    onSuccess: async () => { invalidate(); await updateTrackPct(); },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const reorder = async (section: string, e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = sections[section];
    const oldIdx = list.findIndex((x) => x.id === active.id);
    const newIdx = list.findIndex((x) => x.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(list, oldIdx, newIdx);
    // Optimistic
    qc.setQueryData(["custom_track_topics", trackId], (prev: Topic[] = []) => {
      const others = prev.filter((p) => p.section_name !== section);
      return [...others, ...reordered].sort((a, b) => a.sort_order - b.sort_order);
    });
    // Persist new sort_order — use existing slot numbers in the section
    const slots = list.map((x) => x.sort_order).sort((a, b) => a - b);
    await Promise.all(reordered.map((t, i) =>
      supabase.from("custom_track_topics").update({ sort_order: slots[i] }).eq("id", t.id)
    ));
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setShowAddTopic((v) => !v); setShowAddSection(false); }}
          className="h-8 px-3 rounded-md border text-[12px] flex items-center gap-1 hover:bg-[var(--bg-subtle)]"
          style={{ borderColor: "var(--border-2)" }}>
          <Plus className="h-3.5 w-3.5" /> Add topic
        </button>
        <button onClick={() => { setShowAddSection((v) => !v); setShowAddTopic(false); }}
          className="h-8 px-3 rounded-md border text-[12px] flex items-center gap-1 hover:bg-[var(--bg-subtle)]"
          style={{ borderColor: "var(--border-2)" }}>
          <Plus className="h-3.5 w-3.5" /> Add section
        </button>
      </div>

      {showAddTopic && (
        <AddTopicForm trackId={trackId} userId={user!.id} existingSections={sectionNames}
          nextSort={topics.length}
          onDone={() => { setShowAddTopic(false); invalidate(); }} />
      )}
      {showAddSection && (
        <AddSectionForm trackId={trackId} userId={user!.id} nextSort={topics.length}
          onDone={() => { setShowAddSection(false); invalidate(); }} />
      )}

      {sectionNames.length === 0 ? (
        <div className="card-flat p-8 text-center t-small">No topics yet. Add one above or generate a roadmap.</div>
      ) : (
        sectionNames.map((sec) => {
          const list = sections[sec];
          const done = list.filter((t) => t.status === "Completed").length;
          const pct = list.length ? Math.round((done / list.length) * 100) : 0;
          return (
            <div key={sec} className="card-flat p-4">
              <div className="flex items-center justify-between">
                <div className="section-label">{sec}</div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{done} / {list.length} complete</div>
              </div>
              <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--p-6)" }} />
              </div>

              <div className="mt-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => reorder(sec, e)}>
                  <SortableContext items={list.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                    {list.map((t) => (
                      <TopicRow key={t.id} topic={t}
                        onCycle={() => cycleStatus.mutate(t)}
                        onDelete={() => del.mutate(t.id)} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TopicRow({ topic, onCycle, onDelete }: { topic: Topic; onCycle: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id });
  const [expandNotes, setExpandNotes] = useState(false);
  const [editingLink, setEditingLink] = useState(false);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const Icon = topic.status === "Completed" ? CheckSquare : topic.status === "In Progress" ? Clock : Square;
  const iconColor = topic.status === "Completed" ? "var(--p-6)" : topic.status === "In Progress" ? "var(--a-5)" : "var(--text-3)";

  return (
    <div ref={setNodeRef} style={style} className="group rounded-md hover:bg-[var(--bg-subtle)] transition-colors">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button {...attributes} {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          style={{ color: "var(--text-3)" }}>
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button onClick={onCycle} title={topic.status}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </button>
        {topic.status === "In Progress" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--a-5)" }} />}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] truncate ${topic.status === "Completed" ? "line-through" : ""}`}
            style={{ color: topic.status === "Completed" ? "var(--text-3)" : "var(--text-1)" }}>
            {topic.topic_name}
          </div>
        </div>

        {topic.resource_url && !editingLink && (
          <a href={topic.resource_url} target="_blank" rel="noopener"
            className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--p-6)" }} title={topic.resource_url}>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setExpandNotes((v) => !v)} className="text-[11px] px-1.5 h-6 rounded hover:bg-[var(--bg-muted)]" style={{ color: "var(--text-3)" }}>
            Notes
          </button>
          <button onClick={() => setEditingLink((v) => !v)} className="text-[11px] px-1.5 h-6 rounded hover:bg-[var(--bg-muted)]" style={{ color: "var(--text-3)" }}>
            Link
          </button>
          <button onClick={onDelete} className="text-[11px] h-6 w-6 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center" style={{ color: "var(--text-3)" }}>
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expandNotes && <NotesEditor topic={topic} />}
      {editingLink && <LinkEditor topic={topic} onDone={() => setEditingLink(false)} />}
    </div>
  );
}

function NotesEditor({ topic }: { topic: Topic }) {
  const qc = useQueryClient();
  const [val, setVal] = useState(topic.notes ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (val === (topic.notes ?? "")) return;
      await supabase.from("custom_track_topics").update({ notes: val || null }).eq("id", topic.id);
      qc.invalidateQueries({ queryKey: ["custom_track_topics", topic.track_id] });
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [val]); // eslint-disable-line

  return (
    <div className="px-2 pb-2">
      <textarea value={val} onChange={(e) => setVal(e.target.value)}
        placeholder="Add notes for this topic..."
        className="w-full text-[13px] rounded-[var(--radius-md)] px-3 py-2 outline-none min-h-[60px] resize-y"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-2)" }} />
    </div>
  );
}

function LinkEditor({ topic, onDone }: { topic: Topic; onDone: () => void }) {
  const qc = useQueryClient();
  const [val, setVal] = useState(topic.resource_url ?? "");
  const save = async () => {
    await supabase.from("custom_track_topics").update({ resource_url: val.trim() || null }).eq("id", topic.id);
    qc.invalidateQueries({ queryKey: ["custom_track_topics", topic.track_id] });
    onDone();
  };
  return (
    <div className="px-2 pb-2 flex gap-2">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        onBlur={save}
        placeholder="Paste resource URL"
        className="w-[260px] h-8 px-2 text-[13px] rounded-[var(--radius-md)] outline-none"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-2)" }} />
      <button onClick={onDone} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[var(--bg-muted)]" style={{ color: "var(--text-3)" }}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddTopicForm({ trackId, userId, existingSections, nextSort, onDone }:
  { trackId: string; userId: string; existingSections: string[]; nextSort: number; onDone: () => void }) {
  const [sectionMode, setSectionMode] = useState<"existing" | "new">(existingSections.length ? "existing" : "new");
  const [section, setSection] = useState(existingSections[0] ?? "");
  const [newSection, setNewSection] = useState("");
  const [topic, setTopic] = useState("");
  const [why, setWhy] = useState("");

  const submit = async () => {
    const finalSection = sectionMode === "new" ? newSection.trim() : section;
    if (!finalSection || !topic.trim()) { toast.error("Section and topic are required"); return; }
    const { error } = await supabase.from("custom_track_topics").insert({
      user_id: userId, track_id: trackId,
      section_name: finalSection, topic_name: topic.trim(),
      notes: why.trim() || null, sort_order: nextSort,
    });
    if (error) { toast.error(error.message); return; }
    onDone();
  };
  return (
    <div className="card-flat p-4 space-y-2">
      <div className="flex gap-2">
        {existingSections.length > 0 && (
          <select value={sectionMode === "existing" ? section : "__new"}
            onChange={(e) => { if (e.target.value === "__new") setSectionMode("new"); else { setSectionMode("existing"); setSection(e.target.value); } }}
            className="h-9 px-2 rounded-md text-[13px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }}>
            {existingSections.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__new">+ New section…</option>
          </select>
        )}
        {sectionMode === "new" && (
          <input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="New section name"
            className="flex-1 h-9 px-3 rounded-md text-[13px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />
        )}
      </div>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic name"
        className="w-full h-9 px-3 rounded-md text-[13px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />
      <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why important (optional)"
        className="w-full h-9 px-3 rounded-md text-[13px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="h-8 px-3 rounded-md text-[12px]" style={{ color: "var(--text-3)" }}>Cancel</button>
        <button onClick={submit} className="h-8 px-3 rounded-md text-[12px] bg-primary text-primary-foreground">Add topic</button>
      </div>
    </div>
  );
}

function AddSectionForm({ trackId, userId, nextSort, onDone }: { trackId: string; userId: string; nextSort: number; onDone: () => void }) {
  const [name, setName] = useState("");
  const submit = async () => {
    if (!name.trim()) { toast.error("Section name required"); return; }
    // Create a placeholder topic so the section renders
    const { error } = await supabase.from("custom_track_topics").insert({
      user_id: userId, track_id: trackId, section_name: name.trim(),
      topic_name: "First topic — rename me", sort_order: nextSort,
    });
    if (error) { toast.error(error.message); return; }
    onDone();
  };
  return (
    <div className="card-flat p-4 flex gap-2">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="New section name"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="flex-1 h-9 px-3 rounded-md text-[13px]" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />
      <button onClick={onDone} className="h-9 px-3 rounded-md text-[12px]" style={{ color: "var(--text-3)" }}>Cancel</button>
      <button onClick={submit} className="h-9 px-3 rounded-md text-[12px] bg-primary text-primary-foreground">Create</button>
    </div>
  );
}
