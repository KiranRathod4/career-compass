import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/arena")({ component: ArenaPage });

function ArenaPage() {
  return (
    <div className="max-w-5xl mx-auto card-flat p-10 text-center">
      <Gamepad2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h1 className="text-xl font-semibold">Arena</h1>
      <p className="text-sm text-muted-foreground mt-2">Aa raha hai Phase 8 mein — Duels, daily puzzles, Math Sprint, Memory Sequence, Word Unscramble.</p>
      <p className="text-xs text-muted-foreground mt-1">Pehle padh lo, phir khelo. 📚 → 🎮</p>
    </div>
  );
}
