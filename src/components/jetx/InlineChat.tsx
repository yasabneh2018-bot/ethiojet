import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import { getChat, sendChat, subscribeDb, type LocalChatMessage } from "@/lib/localDb";

export const InlineChat = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => setMessages(getChat().slice(-100));
    load();
    return subscribeDb(load);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!input.trim() || !user || !profile) return;
    sendChat(user.id, profile.username, input.trim().slice(0, 300));
    setInput("");
  };

  return (
    <div className="bg-gradient-card border border-border rounded-2xl shadow-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 p-2.5 border-b border-border">
        <MessageCircle className="w-4 h-4 text-primary-glow" />
        <span className="text-xs font-bold uppercase tracking-wider">Chat</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> live
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">Be the first to say hi 👋</div>
        )}
        {messages.map(m => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-2.5 py-1 text-xs break-words ${mine ? "bg-primary/30" : "bg-secondary"}`}>
                {!mine && <div className="text-[9px] font-bold text-primary-glow uppercase">{m.username}</div>}
                <div>{m.message}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="p-2 border-t border-border flex gap-1.5">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Message…" maxLength={300} className="flex-1 h-8 text-xs" />
        <Button type="submit" size="icon" className="h-8 w-8" disabled={!input.trim()}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
