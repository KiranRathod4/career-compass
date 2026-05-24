import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({ component: () => (
  <div className="max-w-5xl mx-auto">
    <div className="card-flat p-10 text-center">
      <div className="inline-flex h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-3"><Trophy className="h-7 w-7 text-primary" /></div>
      <h1 className="text-xl font-semibold">Achievements</h1>
      <p className="mt-1 text-sm text-muted-foreground">Badges, levels aur streaks ka full view — agle phase mein aa raha hai.</p>
    </div>
  </div>
)});
