import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

function CalendarPage() {
  return (
    <div className="max-w-5xl mx-auto card-flat p-10 text-center">
      <CalIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h1 className="text-xl font-semibold">Smart Calendar</h1>
      <p className="text-sm text-muted-foreground mt-2">Coming in Phase 7 — month/week/agenda view, auto-events from jobs & sprints, system event suggestions.</p>
    </div>
  );
}
