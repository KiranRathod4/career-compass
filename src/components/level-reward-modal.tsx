import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Sparkles, Zap, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function LevelRewardModal({ unlock, onClose }: { unlock: { level: number; name: string; days: number } | null; onClose: () => void }) {
  return (
    <Dialog open={!!unlock} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Level Up! {unlock?.name}
          </DialogTitle>
        </DialogHeader>
        {unlock && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You hit Level {unlock.level}. Mehnat paid off.
            </p>
            <div className="rounded-lg border-2 border-warning/40 bg-warning/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-warning" />
                <span className="font-semibold text-sm">Reward unlocked</span>
              </div>
              <p className="text-sm">
                Hitting Level {unlock.level} unlocks Elite features for <b>{unlock.days} days</b>.
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary" /> AI Daily Planner & Overload Detector</div>
                <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-primary" /> AI Resume Review</div>
                <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Placement Probability score</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="h-9 px-3 rounded-md border border-border text-sm">Later</button>
              <Link to="/pricing" onClick={onClose} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center">
                Explore →
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
