import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

export const ChatPanel = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;

    (supabase as any)
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => {
        if (active && data) setMessages([...data].reverse());
      });

    const channel = (supabase as any)
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage].slice(-200));
        }
      )
      .subscribe();

    return () => {
      active = false;
      (supabase as any).removeChannel(channel);
    };
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user || !profile || sending) return;
    setSending(true);
    const { error } = await (supabase as any).from("chat_messages").insert({
      user_id: user.id,
      username: profile.username,
      message: input.trim().slice(0, 300),
    });
    setSending(false);
    if (error) {
      toast.error("Could not send message");
      return;
    }
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open chat"
          className="relative"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-success animate-pulse" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96 p-0 flex flex-col bg-sidebar border-sidebar-border">
        <SheetHeader className="p-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary-glow" />
            Live Chat
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              Be the first to say hi 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm break-words ${
                    mine
                      ? "bg-primary/30 text-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  {!mine && (
                    <div className="text-[10px] font-bold text-primary-glow uppercase tracking-wide mb-0.5">
                      {m.username}
                    </div>
                  )}
                  <div>{m.message}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="p-3 border-t border-sidebar-border flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            maxLength={300}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
