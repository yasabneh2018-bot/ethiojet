import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { coinsToBirr, fmtBirr } from "@/lib/jetx";
import { History as HistoryIcon } from "lucide-react";
import { getUserBets, subscribeDb, type LocalBet } from "@/lib/localDb";

const History = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<LocalBet[]>([]);

  useEffect(() => {
    const load = () => setBets(user ? getUserBets(user.id, 100) : []);
    load();
    return subscribeDb(load);
  }, [user]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <HistoryIcon className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Bet History</h2>
          <p className="text-sm text-muted-foreground">Your last 100 rounds</p>
        </div>
      </div>
      <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
        {bets.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No bets yet — go fly!</div>
        ) : (
          <div className="divide-y divide-border/50">
            {bets.map(b => (
              <div key={b.id} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center py-2 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                  b.won ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                }`}>
                  {(b.cashout_multiplier ?? b.crash_multiplier).toFixed(2)}x
                </span>
                <span className="text-muted-foreground text-xs truncate">
                  {new Date(b.created_at).toLocaleString()} · Bet {fmtBirr(coinsToBirr(b.amount))}
                </span>
                <span className={`font-bold tabular-nums ${b.won ? "text-success" : "text-destructive"}`}>
                  {b.won
                    ? `+${fmtBirr(coinsToBirr(b.payout - b.amount))}`
                    : `-${fmtBirr(coinsToBirr(b.amount))}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
