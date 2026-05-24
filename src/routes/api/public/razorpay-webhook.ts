import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook secret missing", { status: 500 });

        const sig = request.headers.get("x-razorpay-signature");
        const body = await request.text();
        if (!sig) return new Response("Missing signature", { status: 401 });

        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(sig);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const evt = JSON.parse(body) as {
          event: string;
          payload?: { payment?: { entity?: { notes?: Record<string, string>; id?: string } } };
        };

        if (evt.event === "payment.captured" || evt.event === "payment.authorized") {
          const notes = evt.payload?.payment?.entity?.notes ?? {};
          const userId = notes.user_id;
          const plan = (notes.plan as "pro" | "elite") ?? "pro";
          if (userId) {
            const days = plan === "elite" ? 30 : 30;
            const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            const { data: existing } = await supabaseAdmin
              .from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
            if (existing) {
              await supabaseAdmin.from("subscriptions").update({
                plan, status: "active", current_period_end: end,
                razorpay_subscription_id: evt.payload?.payment?.entity?.id ?? null,
              }).eq("id", existing.id);
            } else {
              await supabaseAdmin.from("subscriptions").insert({
                user_id: userId, plan, status: "active", current_period_end: end,
                razorpay_subscription_id: evt.payload?.payment?.entity?.id ?? null,
              });
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});
