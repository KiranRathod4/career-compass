import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string;
  pod_code: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export function PodChat({ podCode, myName }: { podCode: string; myName: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("pod_messages")
        .select("*")
        .eq("pod_code", podCode)
        .order("created_at", { ascending: true })
        .limit(200);
      if (mounted) {
        setMessages((data ?? []) as Msg[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`pod:${podCode}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pod_messages", filter: `pod_code=eq.${podCode}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Msg;
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [podCode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !user) return;
    setSending(true);
    const { error } = await supabase.from("pod_messages").insert({
      pod_code: podCode,
      user_id: user.id,
      author_name: myName || "Member",
      content: text.slice(0, 2000),
    });
    setSending(false);
    if (error) {
      toast.error("Could not send message");
      return;
    }
    setDraft("");
  };

  return (
    <div className="card-flat p-5 flex flex-col" style={{ minHeight: 360 }}>
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <div className="section-label">Pod chat</div>
        <span className="ml-auto text-[10px] text-muted-foreground">Live</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1" style={{ maxHeight: 320 }}>
        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            No messages yet. Say hi to your pod.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            const initials = (m.author_name || "M").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="text-[10px] text-muted-foreground mb-0.5 px-1">
                    {mine ? "You" : m.author_name}
                  </div>
                  <div className={`px-3 py-1.5 rounded-2xl text-sm break-words ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message your pod…"
          maxLength={2000}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
