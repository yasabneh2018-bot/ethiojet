import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { coinsToBirr, fmtBirr } from "@/lib/jetx";
import { History as HistoryIcon } from "lucide-react";

interface Bet { id: string; amount: number; cashout_multiplier: number | null; crash_multiplier: number; payout: number; won: boolean; created_at: string; }

const History = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("bets").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (data) setBets(data.map((b: any) => ({
      id: b.id, amount: Number(b.amount),
      cashout_multiplier: b.cashout_multiplier ? Number(b.cashout_multiplier) : null,
      crash_multiplier: Number(b.crash_multiplier), payout: Number(b.payout), won: b.won,
      created_at: b.created_at,
    })));
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = (supabase as any).channel(`bets-page-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bets", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user?.id]);

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
          <div className="text-center py-8 text-muted-foreground">No bets yet — go play a round!</div>
        ) : (
          <div className="space-y-1.5">
            {bets.map(b => {
              const amountBirr = coinsToBirr(b.amount);
              const profitBirr = b.won ? coinsToBirr(b.payout) - amountBirr : -amountBirr;
              return (
                <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${b.won ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {b.cashout_multiplier ? b.cashout_multiplier.toFixed(2) : b.crash_multiplier.toFixed(2)}x
                  </span>
                  <span className="text-muted-foreground tabular-nums">Bet {fmtBirr(amountBirr)}</span>
                  <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                    {new Date(b.created_at).toLocaleString()}
                  </span>
                  <span className={`ml-auto font-bold tabular-nums ${b.won ? "text-success" : "text-destructive"}`}>
                    {profitBirr >= 0 ? "+" : ""}{fmtBirr(profitBirr)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default History;
