import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are the Taiyaar AI Career Coach — a sharp, no-fluff mentor for students preparing for software placements in India.

Your style:
- Direct, structured, and warm. Never condescending.
- Speak in English. Avoid Hindi sentences. Use rare flavor words sparingly only if natural.
- Use markdown: headings, bullet lists, fenced code blocks for code or SQL.
- When the student asks about DSA, give a hint first, then approach, then code. Don't dump the full solution unless asked.
- For career, resume, interview, or strategy questions: be specific, give 2-3 concrete next steps.
- If you don't know something, say so. Never invent company processes or salaries.

You are not a generic chatbot — you are their placement coach. Keep responses focused, scannable, and actionable.`;

export const Route = createFileRoute("/api/coach/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const token = authHeader.slice(7);

          const url = process.env.SUPABASE_URL!;
          const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const userClient = createClient(url, anon, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: userErr } = await userClient.auth.getUser();
          if (userErr || !userData.user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const userId = userData.user.id;

          const body = await request.json();
          const conversationId: string = body.conversationId;
          const message: string = (body.message ?? "").toString().slice(0, 8000);
          if (!conversationId || !message.trim()) {
            return new Response(JSON.stringify({ error: "Missing conversationId or message" }), { status: 400 });
          }

          // Verify conversation belongs to user + load prior messages
          const { data: convo, error: convoErr } = await userClient
            .from("ai_conversations")
            .select("id, title")
            .eq("id", conversationId)
            .single();
          if (convoErr || !convo) {
            return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
          }

          const { data: priorRows } = await userClient
            .from("ai_messages")
            .select("role, content")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(40);
          const prior = (priorRows ?? []) as Array<{ role: string; content: string }>;

          // Persist user message
          await userClient.from("ai_messages").insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "user",
            content: message,
          });

          // Auto-title from first user message
          if (convo.title === "New conversation" && prior.length === 0) {
            const newTitle = message.trim().slice(0, 60);
            await userClient.from("ai_conversations").update({ title: newTitle }).eq("id", conversationId);
          } else {
            await userClient.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
          }

          const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...prior.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: message },
          ];

          const aiKey = process.env.LOVABLE_API_KEY;
          if (!aiKey) {
            return new Response(JSON.stringify({ error: "AI is not configured" }), { status: 500 });
          }

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages,
              stream: true,
            }),
          });

          if (!upstream.ok || !upstream.body) {
            if (upstream.status === 429) {
              return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a moment." }), { status: 429 });
            }
            if (upstream.status === 402) {
              return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }), { status: 402 });
            }
            const text = await upstream.text();
            console.error("AI gateway error", upstream.status, text);
            return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 502 });
          }

          // Tee stream: forward to client + accumulate to persist assistant message
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          let assistantBuffer = "";
          let textBuffer = "";

          const stream = new ReadableStream({
            async start(controller) {
              const reader = upstream.body!.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                  textBuffer += decoder.decode(value, { stream: true });
                  let nl: number;
                  while ((nl = textBuffer.indexOf("\n")) !== -1) {
                    let line = textBuffer.slice(0, nl);
                    textBuffer = textBuffer.slice(nl + 1);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) continue;
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const c = parsed.choices?.[0]?.delta?.content;
                      if (typeof c === "string") assistantBuffer += c;
                    } catch {
                      textBuffer = line + "\n" + textBuffer;
                      break;
                    }
                  }
                }
              } catch (e) {
                console.error("stream error", e);
              } finally {
                controller.close();
                if (assistantBuffer.trim()) {
                  await userClient.from("ai_messages").insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    role: "assistant",
                    content: assistantBuffer,
                  });
                }
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
        } catch (e) {
          console.error("coach stream error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500 });
        }
      },
    },
  },
});
