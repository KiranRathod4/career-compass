import { createFileRoute } from "@tanstack/react-router";
import { Users2 } from "lucide-react";
import { PlanGate } from "@/components/plan-gate";

export const Route = createFileRoute("/_authenticated/pod")({ component: PodPage });

function PodPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PlanGate min="elite" feature="My Pod">
        <div className="card-flat p-10 text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Users2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">My Pod</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            5 students ka prep pod — coming soon. Tum Elite member ho, slot reserve hai.
          </p>
        </div>
      </PlanGate>
    </div>
  );
}
