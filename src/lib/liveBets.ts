import { supabase } from "@/integrations/supabase/client";

export interface LiveBet {
  id: string;
  user_id: string;
  username: string;
  amountBirr: number;
  cashout?: number | null; // multiplier when cashed
  payoutBirr?: number;
  status: "placed" | "cashed" | "lost";
  ts: number;
}

const CHANNEL = "live-bets-v1";

let channel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<(b: LiveBet) => void>();

const ensureChannel = () => {
  if (channel) return channel;
  channel = supabase.channel(CHANNEL, { config: { broadcast: { self: true } } });
  channel.on("broadcast", { event: "bet" }, (payload: any) => {
    const b = payload.payload as LiveBet;
    listeners.forEach(fn => fn(b));
  }).subscribe();
  return channel;
};

export const broadcastBet = (b: LiveBet) => {
  const ch = ensureChannel();
  ch.send({ type: "broadcast", event: "bet", payload: b });
};

export const subscribeBets = (fn: (b: LiveBet) => void) => {
  ensureChannel();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
