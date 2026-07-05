import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = {
  id: string;
  user_id: string;
  username: string;
  text: string;
  ts: number;
  system?: boolean;
};

type Props = {
  matchId: string;
  userId: string | null;
  username: string | null;
  /** Disable input once the match has started. Broadcasts still render. */
  disabled?: boolean;
};

const MAX_MESSAGES = 60;
const MAX_LEN = 160;

export function LobbyChat({ matchId, userId, username, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seenJoin = useRef(false);

  // Subscribe to chat channel for this match.
  useEffect(() => {
    seenJoin.current = false;
    const ch = supabase.channel(`arena:chat:${matchId}`, {
      config: { broadcast: { self: true, ack: false } },
    });

    ch.on("broadcast", { event: "msg" }, (payload) => {
      const m = payload?.payload as ChatMessage | undefined;
      if (!m || !m.text) return;
      setMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        const next = [...prev, m];
        if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES);
        return next;
      });
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED" && userId && username && !seenJoin.current) {
        seenJoin.current = true;
        ch.send({
          type: "broadcast",
          event: "msg",
          payload: {
            id: `sys-${userId}-${Date.now()}`,
            user_id: "system",
            username: "system",
            text: `${username} joined the chat`,
            ts: Date.now(),
            system: true,
          } satisfies ChatMessage,
        });
      }
    });

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [matchId, userId, username]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = useMemo(
    () => !!userId && !!username && !disabled && draft.trim().length > 0 && !sending,
    [userId, username, disabled, draft, sending]
  );

  const handleSend = async () => {
    if (!canSend || !userId || !username) return;
    const text = draft.trim().slice(0, MAX_LEN);
    setSending(true);
    setDraft("");
    try {
      await channelRef.current?.send({
        type: "broadcast",
        event: "msg",
        payload: {
          id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user_id: userId,
          username,
          text,
          ts: Date.now(),
        } satisfies ChatMessage,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: "var(--arena-card)", border: "1px solid var(--arena-border)", height: 320 }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <MessageCircle className="w-3.5 h-3.5" style={{ color: "var(--neon-purple)" }} />
        <span className="arena-label">Lobby Chat</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 arena-live-dot" /> live
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-white/30 italic">
            No messages yet. Say hi to your opponents.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === userId;
            if (m.system) {
              return (
                <div key={m.id} className="text-[10px] text-white/30 italic text-center py-0.5">
                  · {m.text} ·
                </div>
              );
            }
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="text-[10px] text-white/40 arena-mono mb-0.5 px-1">
                  {isMe ? "you" : m.username}
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-[13px] leading-snug max-w-[80%] break-words"
                  style={
                    isMe
                      ? {
                          background: "var(--neon-purple)",
                          color: "white",
                          boxShadow: "0 0 12px rgba(124,58,237,0.35)",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }
                  }
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={disabled ? "Chat locked — match in progress" : userId ? "Say something…" : "Sign in to chat"}
          disabled={disabled || !userId}
          maxLength={MAX_LEN}
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 px-3 py-2 rounded-md focus:outline-none disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-2 rounded-md text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: canSend ? "var(--neon-purple)" : "rgba(255,255,255,0.05)" }}
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
