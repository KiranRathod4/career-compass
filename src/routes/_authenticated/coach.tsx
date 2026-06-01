import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Plus, Trash2, Send, Sparkles, Loader2, MessageSquare } from "lucide-react";
import {
  listConversations,
  createConversation,
  getMessages,
  deleteConversation,
} from "@/lib/coach.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EliteGate } from "@/components/elite-gate";

export const Route = createFileRoute("/_authenticated/coach")({ component: CoachPage });

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Build me a 4-week DSA plan for product-based interviews",
  "Review my approach to two-pointer problems",
  "Help me prepare for a system design round at a startup",
  "What should I improve on my resume for an SDE role?",
];

function CoachPage() {
  return (
    <EliteGate
      feature="AI Career Coach"
      description="Your personal placement mentor — DSA hints, resume reviews, interview prep, and strategy. Unlimited conversations."
    >
      <CoachInner />
    </EliteGate>
  );
}

function CoachInner() {
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const load = useServerFn(getMessages);
  const remove = useServerFn(deleteConversation);

  const { data: convosData } = useQuery({
    queryKey: ["coach", "conversations"],
    queryFn: () => list(),
  });
  const conversations = convosData?.conversations ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const { data: msgData } = useQuery({
    queryKey: ["coach", "messages", activeId],
    queryFn: () => load({ data: { conversationId: activeId! } }),
    enabled: !!activeId,
  });

  const [draftMessages, setDraftMessages] = useState<Record<string, Msg[]>>({});
  const messages = useMemo<Msg[]>(() => {
    if (!activeId) return [];
    const live = draftMessages[activeId];
    if (live) return live;
    return (msgData?.messages ?? []) as Msg[];
  }, [activeId, draftMessages, msgData]);

  useEffect(() => {
    if (activeId && msgData?.messages && !draftMessages[activeId]) {
      setDraftMessages((d) => ({ ...d, [activeId]: msgData.messages as Msg[] }));
    }
  }, [activeId, msgData, draftMessages]);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  const newConversation = async () => {
    const { conversation } = await create({ data: {} });
    await qc.invalidateQueries({ queryKey: ["coach", "conversations"] });
    setActiveId(conversation.id);
    setDraftMessages((d) => ({ ...d, [conversation.id]: [] }));
  };

  const removeConversation = async (id: string) => {
    await remove({ data: { conversationId: id } });
    await qc.invalidateQueries({ queryKey: ["coach", "conversations"] });
    if (activeId === id) setActiveId(null);
    setDraftMessages((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    let convoId = activeId;
    if (!convoId) {
      const { conversation } = await create({ data: {} });
      await qc.invalidateQueries({ queryKey: ["coach", "conversations"] });
      convoId = conversation.id;
      setActiveId(convoId);
      setDraftMessages((d) => ({ ...d, [convoId!]: [] }));
    }
    const id = convoId!;

    setInput("");
    setDraftMessages((d) => ({
      ...d,
      [id]: [...(d[id] ?? []), { role: "user", content: text }, { role: "assistant", content: "" }],
    }));
    setIsStreaming(true);

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      toast.error("Please sign in again.");
      setIsStreaming(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/coach/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: id, message: text }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errJson = await resp.json().catch(() => ({ error: "Request failed" }));
        toast.error(errJson.error ?? `Request failed (${resp.status})`);
        setDraftMessages((d) => ({ ...d, [id]: (d[id] ?? []).slice(0, -1) }));
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let acc = "";
      let done = false;

      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (typeof c === "string" && c) {
              acc += c;
              setDraftMessages((d) => {
                const arr = [...(d[id] ?? [])];
                const last = arr[arr.length - 1];
                if (last?.role === "assistant") arr[arr.length - 1] = { ...last, content: acc };
                return { ...d, [id]: arr };
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error(e?.message ?? "Stream failed");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: ["coach", "conversations"] });
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] -m-6 anim-page-in">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <Button onClick={newConversation} size="sm" className="w-full justify-start">
            <Plus className="h-4 w-4 mr-1.5" /> New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-2 h-9 rounded-md text-sm cursor-pointer ${
                  activeId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground/80"
                }`}
                onClick={() => setActiveId(c.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded hover:bg-background/60 flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); removeConversation(c.id); }}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">AI Career Coach</h2>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                  Ask anything about placements — DSA strategy, resume reviews, interview prep, or your weekly plan.
                </p>
                <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-left text-sm rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m, i) => (
                  <MessageBubble key={i} role={m.role} content={m.content} streaming={isStreaming && i === messages.length - 1 && m.role === "assistant"} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask your coach anything…"
                rows={1}
                className="resize-none pr-12 min-h-[44px] max-h-40"
                disabled={isStreaming}
              />
              <Button
                size="icon"
                className="absolute right-1.5 bottom-1.5 h-8 w-8"
                onClick={() => void send()}
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Coach can make mistakes. Verify important advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content, streaming }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_ul]:list-disc [&_ol]:list-decimal [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-[12.5px] [&_code]:font-mono [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
        {content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : streaming ? (
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        ) : null}
      </div>
    </div>
  );
}
