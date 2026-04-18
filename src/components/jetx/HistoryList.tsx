import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtMoney } from "@/lib/jetx";
import { History as HistoryIcon } from "lucide-react";

interface Bet { id: string; amount: number; cashout_multiplier: number | null; crash_multiplier: number; payout: number; won: boolean; }

export const HistoryList = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("bets").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(15);
    if (data) setBets(data.map((b: any) => ({
      id: b.id, amount: Number(b.amount),
      cashout_multiplier: b.cashout_multiplier ? Number(b.cashout_multiplier) : null,
      crash_multiplier: Number(b.crash_multiplier), payout: Number(b.payout), won: b.won,
    })));
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = (supabase as any).channel(`bets-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bets", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user]);

  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <HistoryIcon className="w-5 h-5 text-primary-glow" />
        <h3 className="font-bold text-lg">Your History</h3>
      </div>
      {bets.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">No bets yet. Place your first!</div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {bets.map(b => (
            <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${b.won ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                {b.cashout_multiplier ? b.cashout_multiplier.toFixed(2) : b.crash_multiplier.toFixed(2)}x
              </span>
              <span className="text-muted-foreground tabular-nums">Bet {fmtMoney(b.amount)}</span>
              <span className={`ml-auto font-bold tabular-nums ${b.won ? "text-success" : "text-destructive"}`}>
                {b.won ? `+${fmtMoney(b.payout - b.amount)}` : `-${fmtMoney(b.amount)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
