import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { aiTrackQuestions } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Plus, Sparkles, Star, Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function TrackQATab({ trackId, trackName, skillLevel }: { trackId: string; trackName: string; skillLevel: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const gen = useServerFn(aiTrackQuestions);
  const [busy, setBusy] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ["track_questions", trackId],
    queryFn: async () => {
      const { data } = await supabase.from("interview_prep").select("*")
        .eq("user_id", user!.id).eq("company", `track:${trackId}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res: any = await gen({ data: { trackName, skillLevel } });
      const items = (res?.questions ?? []).map((q: any) => ({
        user_id: user!.id, question: q.question, category: q.category ?? "General",
        confidence: 1, company: `track:${trackId}`,
      }));
      if (items.length) {
        const { error } = await supabase.from("interview_prep").insert(items);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["track_questions", trackId] });
      toast.success(`${items.length} questions added.`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("interview_prep").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track_questions", trackId] }),
  });

  const star = useMutation({
    mutationFn: async (q: any) => { await supabase.from("interview_prep").update({ starred: !q.starred }).eq("id", q.id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["track_questions", trackId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <AddQuestionDrawer trackId={trackId} userId={user!.id} onDone={() => qc.invalidateQueries({ queryKey: ["track_questions", trackId] })} />
        <button onClick={handleGenerate} disabled={busy}
          className="h-9 px-3 rounded-md text-[13px] flex items-center gap-1.5 border hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          style={{ borderColor: "var(--border-2)" }}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--p-6)" }} />}
          Generate with AI
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="card-flat p-8 text-center t-small">No questions yet. Add one or generate with AI.</div>
      ) : (
        <div className="card-flat overflow-hidden">
          <table className="w-full text-[13px]">
            <thead style={{ background: "var(--bg-subtle)" }}>
              <tr className="text-left">
                <Th>Question</Th><Th>Category</Th><Th>Difficulty</Th><Th>Reviewed</Th><Th> </Th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q: any) => (
                <tr key={q.id} className="border-t group hover:bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border-2)" }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <button onClick={() => star.mutate(q)}>
                        <Star className="h-3.5 w-3.5" style={{ color: q.starred ? "var(--a-5)" : "var(--text-3)", fill: q.starred ? "var(--a-5)" : "none" }} />
                      </button>
                      <span style={{ color: "var(--text-1)" }}>{q.question}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{q.category}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>—</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{
                      background: q.confidence >= 4 ? "var(--g-alpha-10)" : "var(--bg-muted)",
                      color: q.confidence >= 4 ? "var(--g-6)" : "var(--text-3)",
                    }}>{q.confidence >= 4 ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => del.mutate(q.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-3)" }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{children}</th>;
}

function AddQuestionDrawer({ trackId, userId, onDone }: { trackId: string; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", category: "General", difficulty: "Medium", answer: "" });
  const submit = async () => {
    if (!form.question.trim()) { toast.error("Question required"); return; }
    const { error } = await supabase.from("interview_prep").insert({
      user_id: userId, question: form.question, category: form.category, answer: form.answer || null,
      company: `track:${trackId}`, confidence: 1,
    });
    if (error) { toast.error(error.message); return; }
    onDone(); setOpen(false);
    setForm({ question: "", category: "General", difficulty: "Medium", answer: "" });
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="h-9 px-3 rounded-md text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add question
        </button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        <SheetHeader><SheetTitle>Add interview question</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="Question text"
            className="w-full text-[13px] rounded-md p-2.5 min-h-[80px]" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-2)" }} />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category"
            className="w-full h-9 px-3 text-[13px] rounded-md" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-2)" }} />
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            className="w-full h-9 px-2 text-[13px] rounded-md" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-2)" }}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })}
            placeholder="My answer (optional)"
            className="w-full text-[13px] rounded-md p-2.5 min-h-[100px]" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-2)" }} />
          <button onClick={submit} className="w-full h-9 rounded-md bg-primary text-primary-foreground text-[13px]">Save</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
