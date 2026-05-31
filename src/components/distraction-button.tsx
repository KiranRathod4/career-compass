import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAwardXP } from "@/hooks/use-gamification";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const REASONS = [
  { v: "Reels/Social Media", e: "📱" },
  { v: "So gaya", e: "😴" },
  { v: "Unnecessary chat", e: "💬" },
  { v: "Bored tha", e: "😐" },
  { v: "Games", e: "🎮" },
  { v: "YouTube (non-study)", e: "📺" },
];
const DURATIONS = [
  { v: 15, l: "15 min" }, { v: 30, l: "30 min" },
  { v: 60, l: "1 hr" }, { v: 120, l: "2 hr+" },
];

export function DistractionButton() {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [duration, setDuration] = useState(15);
  const [other, setOther] = useState("");
  const { user } = useAuth();
  const awardXP = useAwardXP();

  const toggle = (r: string) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const submit = async () => {
    const all = other.trim() ? [...reasons, other.trim()] : reasons;
    if (all.length === 0) return toast.error("Ek reason toh select kar");
    const { error } = await (supabase as any).from("distraction_logs").insert({
      user_id: user!.id,
      reasons: all,
      duration_minutes: duration,
    });
    if (error) return toast.error(error.message);
    // negative XP entry
    await (supabase as any).from("xp_transactions").insert({
      user_id: user!.id, action_type: "distraction", xp_amount: -10, metadata: { reasons: all, minutes: duration },
    });
    awardXP; // no-op; just for type ref
    toast.success("Logged. Back to focus. (-10 XP)");
    setOpen(false);
    setReasons([]); setOther(""); setDuration(15);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:text-warning hover:border-warning transition"
        title="Log a distraction"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Got distracted?
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What happened?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-muted-foreground mb-2">Reasons (multi-select)</div>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => {
                  const on = reasons.includes(r.v);
                  return (
                    <button key={r.v} onClick={() => toggle(r.v)}
                      className={`h-8 px-2.5 rounded-full text-xs border transition ${on ? "bg-warning/10 border-warning text-warning" : "border-border hover:bg-accent"}`}>
                      <span className="mr-1">{r.e}</span>{r.v}
                    </button>
                  );
                })}
              </div>
              <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Other reason"
                className="mt-2 w-full h-8 px-2 rounded border border-border bg-background text-xs" />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-2">How much time?</div>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATIONS.map((d) => (
                  <button key={d.v} onClick={() => setDuration(d.v)}
                    className={`h-8 rounded text-xs border ${duration === d.v ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button>
              <button onClick={submit} className="h-9 px-3 rounded-md bg-warning text-warning-foreground text-sm font-medium">Log Karo (-10 XP)</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
