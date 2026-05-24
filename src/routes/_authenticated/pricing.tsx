import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createOrder, verifyPayment } from "@/lib/razorpay.functions";
import { usePlan, type PlanTier } from "@/hooks/use-plan";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/pricing")({ component: PricingPage });

declare global {
  interface Window { Razorpay?: any }
}

const PLANS = [
  {
    id: "free" as const, name: "Free", price: 0, tagline: "Shuruaat ke liye",
    icon: Sparkles,
    features: ["DSA tracker (50 problems)", "Job tracker (10 apps)", "Daily planner", "Basic analytics"],
  },
  {
    id: "pro" as const, name: "Pro", price: 299, tagline: "Serious prep mode",
    icon: Zap, highlight: true,
    features: ["Sab kuch unlimited", "AI Daily Planner", "Resume Review (AI)", "Probability Score", "All challenges + badges"],
  },
  {
    id: "elite" as const, name: "Elite", price: 599, tagline: "Placement guaranteed mindset",
    icon: Crown,
    features: ["Pro ka sab kuch", "My Pod (5-student group)", "1-on-1 mock interviews", "Priority support", "Mentor matching"],
  },
];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PricingPage() {
  const { user } = useAuth();
  const { data: plan } = usePlan();
  const qc = useQueryClient();
  const create = useServerFn(createOrder);
  const verify = useServerFn(verifyPayment);
  const [loading, setLoading] = useState<PlanTier | null>(null);

  useEffect(() => { void loadRazorpay(); }, []);

  const onUpgrade = async (planId: "pro" | "elite") => {
    setLoading(planId);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Couldn't load Razorpay");
      const order = await create({ data: { plan: planId } });

      await new Promise<void>((resolve, reject) => {
        const rp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Taiyaar",
          description: `${planId === "pro" ? "Pro" : "Elite"} plan — 30 days`,
          prefill: { email: user?.email ?? "", name: user?.user_metadata?.full_name ?? "" },
          theme: { color: "#7c3aed" },
          handler: async (resp: any) => {
            try {
              await verify({
                data: {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  plan: planId,
                },
              });
              await qc.invalidateQueries({ queryKey: ["plan"] });
              toast.success(`Shabaash! ${planId === "pro" ? "Pro" : "Elite"} active ho gaya 🎉`);
              resolve();
            } catch (e: any) {
              toast.error(e?.message ?? "Verification failed");
              reject(e);
            }
          },
          modal: { ondismiss: () => resolve() },
        });
        rp.open();
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed");
    } finally {
      setLoading(null);
    }
  };

  const currentPlan: PlanTier = plan?.plan ?? "free";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Taiyaar ho?</h1>
        <p className="mt-2 text-muted-foreground">Choose your prep level. Cancel anytime, no questions.</p>
        {plan?.active && plan.periodEnd && (
          <p className="mt-3 text-sm text-primary">
            Current: <strong>{currentPlan.toUpperCase()}</strong> · Renews {new Date(plan.periodEnd).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isCurrent = currentPlan === p.id;
          const isUpgrade = p.id !== "free" && !isCurrent;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-6 flex flex-col ${
                p.highlight ? "border-primary shadow-lg ring-1 ring-primary/30" : "border-border"
              } bg-card`}
            >
              {p.highlight && (
                <div className="self-start text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground mb-3">
                  Most popular
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{p.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.tagline}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">₹{p.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="mt-5 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">Current plan</Button>
                ) : p.id === "free" ? (
                  <Button disabled className="w-full" variant="ghost">Default</Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => onUpgrade(p.id as "pro" | "elite")}
                    disabled={loading !== null}
                  >
                    {loading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isUpgrade ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Secure payments by Razorpay · UPI, cards, netbanking accepted
      </p>
    </div>
  );
}
