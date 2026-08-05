// Cross-tab live bet feed — BroadcastChannel, no backend.
export interface LiveBet {
  id: string;
  user_id: string;
  username: string;
  amountBirr: number;
  cashout?: number | null;
  payoutBirr?: number;
  status: "placed" | "cashed" | "lost";
  ts: number;
}

const CHANNEL = "jetx-live-bets";

let bc: BroadcastChannel | null = null;
const listeners = new Set<(b: LiveBet) => void>();

const ensureChannel = () => {
  if (bc || typeof BroadcastChannel === "undefined") return bc;
  bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (e) => {
    const b = e.data as LiveBet;
    listeners.forEach(fn => fn(b));
  };
  return bc;
};

export const broadcastBet = (b: LiveBet) => {
  const ch = ensureChannel();
  ch?.postMessage(b);
  listeners.forEach(fn => fn(b)); // local echo
};

export const subscribeBets = (fn: (b: LiveBet) => void) => {
  ensureChannel();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
