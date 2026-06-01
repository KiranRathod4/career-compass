import { Link } from "@tanstack/react-router";
import { Crown, Lock, Sparkles, Zap } from "lucide-react";
import { useEliteStatus } from "@/hooks/use-elite";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/hooks/use-plan";

type Variant = "inline" | "card" | "banner" | "overlay";

interface EliteGateProps {
  min?: PlanTier;
  feature: string;
  description?: string;
  variant?: Variant;
  children?: React.ReactNode;
}

const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

export function EliteGate({
  min = "elite",
  feature,
  description,
  variant = "card",
  children,
}: EliteGateProps) {
  const { plan, isLoading } = useEliteStatus();
  if (isLoading) return null;
  const allowed = PLAN_RANK[plan as PlanTier] >= PLAN_RANK[min];
  if (allowed) return <>{children}</>;

  const tierName = min === "pro" ? "Pro" : "Elite";
  const Icon = min === "elite" ? Crown : Zap;

  if (variant === "inline") {
    return (
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Icon className="h-3.5 w-3.5" />
        Unlock with {tierName}
      </Link>
    );
  }

  if (variant === "banner") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{feature}</p>
            {description && (
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        <Link to="/pricing">
          <Button size="sm">Upgrade</Button>
        </Link>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-40 blur-[2px] select-none" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-border bg-card/95 backdrop-blur p-6 text-center max-w-sm shadow-sm">
            <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">{feature}</h3>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
            <Link to="/pricing" className="inline-block mt-4">
              <Button size="sm">
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                Upgrade to {tierName}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-base font-semibold flex items-center justify-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {feature}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
        {description ?? `Available on the ${tierName} plan.`}
      </p>
      <Link to="/pricing" className="inline-block mt-5">
        <Button>Upgrade to {tierName}</Button>
      </Link>
    </div>
  );
}
