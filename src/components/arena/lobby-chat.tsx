import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Send, SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = {
  id: string;
  user_id: string;
  username: string;
  text: string;
  ts: number;
  system?: boolean;
};

type ReactionEvent = {
  msg_id: string;
  user_id: string;
  emoji: string;
};

type ReactionsMap = Record<string, Record<string, string[]>>; // msg_id -> emoji -> user_ids[]

type Props = {
  matchId: string;
  userId: string | null;
  username: string | null;
  /** Disable input once the match has started. Broadcasts still render. */
  disabled?: boolean;
};

const MAX_MESSAGES = 60;
const MAX_LEN = 160;
const QUICK_EMOJIS = ["👍", "🔥", "😂", "🎯", "💀", "GG"] as const;

export function LobbyChat({ matchId, userId, username, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionsMap>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seenJoin = useRef(false);
  const atBottomRef = useRef(true);
  const focusedRef = useRef(true);
  const collapsedRef = useRef(false);
  const selfIdRef = useRef<string | null>(userId);

  // Keep refs in sync with reactive state / props.
  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);
  useEffect(() => {
    selfIdRef.current = userId;
  }, [userId]);

  // Track window/tab focus & visibility.
  useEffect(() => {
    const update = () => {
      focusedRef.current = document.visibilityState === "visible" && document.hasFocus();
      if (focusedRef.current && !collapsedRef.current && atBottomRef.current) {
        setUnread(0);
      }
    };
    update();
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Subscribe to chat channel for this match.
  useEffect(() => {
    seenJoin.current = false;
    const ch = supabase.channel(`arena:chat:${matchId}`, {
      config: { broadcast: { self: true, ack: false } },
    });

    ch.on("broadcast", { event: "msg" }, (payload) => {
      const m = payload?.payload as ChatMessage | undefined;
      if (!m || !m.text) return;
      let added = false;
      setMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        added = true;
        const next = [...prev, m];
        if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES);
        return next;
      });
      if (!added) return;
      const isSelf = !!selfIdRef.current && m.user_id === selfIdRef.current;
      const shouldCount =
        !m.system && !isSelf && (collapsedRef.current || !focusedRef.current || !atBottomRef.current);
      if (shouldCount) setUnread((u) => Math.min(u + 1, 99));
    });

    ch.on("broadcast", { event: "react" }, (payload) => {
      const r = payload?.payload as ReactionEvent | undefined;
      if (!r || !r.msg_id || !r.emoji || !r.user_id) return;
      setReactions((prev) => {
        const msg = { ...(prev[r.msg_id] ?? {}) };
        const users = new Set(msg[r.emoji] ?? []);
        if (users.has(r.user_id)) users.delete(r.user_id);
        else users.add(r.user_id);
        if (users.size === 0) delete msg[r.emoji];
        else msg[r.emoji] = Array.from(users);
        return { ...prev, [r.msg_id]: msg };
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

  // Auto-scroll to bottom when new messages arrive and user is at bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || collapsed) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, collapsed]);

  // Track scroll position; clear unread when scrolled to bottom & focused.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    atBottomRef.current = nearBottom;
    if (nearBottom && focusedRef.current && !collapsedRef.current) {
      setUnread(0);
    }
  };

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (!next) {
        // expanding — clear unread and jump to bottom on next paint
        setUnread(0);
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
          atBottomRef.current = true;
        });
      }
      return next;
    });
  };

  // Close picker on outside click.
  useEffect(() => {
    if (!pickerFor) return;
    const close = () => setPickerFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [pickerFor]);

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

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!userId || disabled) return;
    await channelRef.current?.send({
      type: "broadcast",
      event: "react",
      payload: { msg_id: msgId, user_id: userId, emoji } satisfies ReactionEvent,
    });
    setPickerFor(null);
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: "var(--arena-card)",
        border: "1px solid var(--arena-border)",
        height: collapsed ? "auto" : 320,
      }}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex items-center gap-2 px-4 py-2.5 border-b w-full text-left hover:bg-white/[0.02] transition"
        style={{ borderColor: collapsed ? "transparent" : "rgba(255,255,255,0.06)" }}
        aria-expanded={!collapsed}
      >
        <MessageCircle className="w-3.5 h-3.5" style={{ color: "var(--neon-purple)" }} />
        <span className="arena-label">Lobby Chat</span>
        {unread > 0 && (
          <span
            className="inline-flex items-center justify-center px-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold arena-mono"
            style={{
              background: "var(--neon-purple)",
              color: "white",
              boxShadow: "0 0 10px rgba(124,58,237,0.55)",
            }}
            aria-label={`${unread} unread messages`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 arena-live-dot" /> live
          </span>
          {collapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-white/50" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
          )}
        </span>
      </button>

      {!collapsed && (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5"
      >

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
            const msgReactions = reactions[m.id] ?? {};
            const reactionEntries = Object.entries(msgReactions);
            const showPicker = pickerFor === m.id;
            return (
              <div
                key={m.id}
                className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="text-[10px] text-white/40 arena-mono mb-0.5 px-1">
                  {isMe ? "you" : m.username}
                </div>
                <div className={`relative flex items-center gap-1 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                  <div
                    className="px-3 py-1.5 rounded-lg text-[13px] leading-snug break-words"
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
                  {userId && !disabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerFor(showPicker ? null : m.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      aria-label="Add reaction"
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {showPicker && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute z-10 top-full mt-1 flex items-center gap-0.5 px-1.5 py-1 rounded-full ${isMe ? "right-0" : "left-0"}`}
                      style={{
                        background: "rgba(20,18,32,0.98)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
                      }}
                    >
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => toggleReaction(m.id, e)}
                          className="px-1.5 py-0.5 rounded-full text-[14px] hover:bg-white/10 transition arena-mono"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {reactionEntries.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    {reactionEntries.map(([emoji, users]) => {
                      const mine = !!userId && users.includes(userId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(m.id, emoji)}
                          disabled={!userId || disabled}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] leading-none transition disabled:cursor-not-allowed"
                          style={{
                            background: mine ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${mine ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)"}`,
                            color: mine ? "#fff" : "rgba(255,255,255,0.85)",
                          }}
                          aria-label={`${emoji} ${users.length}`}
                        >
                          <span>{emoji}</span>
                          <span className="arena-mono text-[10px] opacity-80">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}

      {!collapsed && (
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
      )}
    </div>
  );
}
