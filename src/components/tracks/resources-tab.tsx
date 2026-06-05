import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2 } from "lucide-react";

export function TrackResourcesTab({ trackId, trackName }: { trackId: string; trackName: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ["track_resources", trackId],
    queryFn: async () => (await supabase.from("resources").select("*").eq("user_id", user!.id).eq("track_id", trackId).order("created_at", { ascending: false })).data ?? [],
  });

  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", resource_type: "Video", topic: trackName });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("resources").insert({
        user_id: user!.id, title: form.title, url: form.url || null,
        resource_type: form.resource_type, topic: form.topic, track_id: trackId, status: "todo",
      });
      if (error) throw error;
    },
    onSuccess: () => { setShow(false); setForm({ title: "", url: "", resource_type: "Video", topic: trackName }); qc.invalidateQueries({ queryKey: ["track_resources", trackId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("resources").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track_resources", trackId] }),
  });

  return (
    <div className="space-y-3">
      <button onClick={() => setShow((v) => !v)} className="h-9 px-3 rounded-md text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add resource
      </button>

      {show && (
        <div className="card-flat p-4 space-y-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resource title"
            className="w-full h-9 px-3 text-[13px] rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL"
            className="w-full h-9 px-3 text-[13px] rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }} />
          <div className="flex gap-2">
            <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
              className="flex-1 h-9 px-2 text-[13px] rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-2)" }}>
              <option>Video</option><option>Article</option><option>Course</option><option>Book</option><option>Documentation</option>
            </select>
            <button onClick={() => add.mutate()} disabled={add.isPending} className="h-9 px-3 rounded-md text-[13px] bg-primary text-primary-foreground">Add</button>
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="card-flat p-8 text-center t-small">No resources linked yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources.map((r: any) => (
            <div key={r.id} className="card-flat p-4 group">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>{r.title}</div>
                <button onClick={() => del.mutate(r.id)} className="opacity-0 group-hover:opacity-100" style={{ color: "var(--text-3)" }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--p-alpha-08)", color: "var(--p-6)" }}>{r.resource_type ?? "Other"}</span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{r.status}</span>
              </div>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener"
                  className="mt-3 inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--p-6)" }}>
                  <ExternalLink className="h-3 w-3" /> Open
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
