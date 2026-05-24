import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLANS = {
  pro: { name: "Pro", price: 299, days: 30 },
  elite: { name: "Elite", price: 599, days: 30 },
} as const;

export type PlanId = keyof typeof PLANS;

export const getRazorpayKey = createServerFn({ method: "GET" }).handler(async () => {
  return { keyId: process.env.RAZORPAY_KEY_ID ?? null };
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ plan: z.enum(["pro", "elite"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const plan = PLANS[data.plan];
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: plan.price * 100,
        currency: "INR",
        receipt: `tyr_${context.userId.slice(0, 8)}_${Date.now()}`,
        notes: { plan: data.plan, user_id: context.userId },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Razorpay order failed: ${t}`);
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId, plan: data.plan };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
        plan: z.enum(["pro", "elite"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay secret not configured");

    const expected = createHmac("sha256", secret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid payment signature");
    }

    const plan = PLANS[data.plan];
    const end = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000).toISOString();

    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: data.plan,
          status: "active",
          razorpay_subscription_id: data.razorpay_payment_id,
          current_period_end: end,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        plan: data.plan,
        status: "active",
        razorpay_subscription_id: data.razorpay_payment_id,
        current_period_end: end,
      });
      if (error) throw new Error(error.message);
    }

    return { success: true, plan: data.plan, currentPeriodEnd: end };
  });
