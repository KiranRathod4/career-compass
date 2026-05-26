import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rankings")({ component: RankingsPage });

function RankingsPage() {
  return (
    <div className="max-w-5xl mx-auto card-flat p-10 text-center">
      <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h1 className="text-xl font-semibold">Taiyaar Rankings</h1>
      <p className="text-sm text-muted-foreground mt-2">Phase 9 mein aayega — weekly study consistency leaderboard, college & pod filters.</p>
      <p className="text-xs text-muted-foreground mt-1">Settings mein opt-in karna padega.</p>
    </div>
  );
}
