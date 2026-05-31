import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useHasPlan, type PlanTier } from "@/hooks/use-plan";
import { Button } from "@/components/ui/button";

export function PlanGate({
  min,
  feature,
  children,
}: {
  min: PlanTier;
  feature: string;
  children: React.ReactNode;
}) {
  const allowed = useHasPlan(min);
  if (allowed) return <>{children}</>;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
      <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-3">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-lg font-semibold flex items-center justify-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        {feature} is a {min === "pro" ? "Pro" : "Elite"} feature
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">Upgrade to unlock the full feature set.</p>
      <Link to="/pricing" className="inline-block mt-4">
        <Button>See plans</Button>
      </Link>
    </div>
  );
}
