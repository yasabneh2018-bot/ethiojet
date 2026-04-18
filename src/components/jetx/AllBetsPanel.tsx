import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { coinsToBirr } from "@/lib/jetx";
import { Users, User as UserIcon, Trophy } from "lucide-react";

type Tab = "all" | "mine" | "top";

interface Row {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  cashout_multiplier: number | null;
  payout: number;
  won: boolean;
  created_at: string;
}

export const AllBetsPanel = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    let q = (supabase as any)
      .from("bets")
      .select("id, user_id, amount, cashout_multiplier, payout, won, created_at, profiles!inner(username)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (tab === "mine" && user) q = q.eq("user_id", user.id);
    if (tab === "top") {
      q = (supabase as any)
        .from("bets")
        .select("id, user_id, amount, cashout_multiplier, payout, won, created_at, profiles!inner(username)")
        .eq("won", true)
        .order("payout", { ascending: false })
        .limit(80);
    }
    const { data } = await q;
    if (data) {
      setRows(
        data.map((b: any) => ({
          id: b.id,
          user_id: b.user_id,
          username: b.profiles?.username ?? "pilot",
          amount: Number(b.amount),
          cashout_multiplier: b.cashout_multiplier ? Number(b.cashout_multiplier) : null,
          payout: Number(b.payout),
          won: b.won,
          created_at: b.created_at,
        })),
      );
    }
  };

  useEffect(() => {
    load();
    const ch = (supabase as any)
      .channel(`all-bets-${tab}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bets" }, load)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.id]);

  const totalWin = rows.filter(r => r.won).reduce((s, r) => s + coinsToBirr(r.payout), 0);
  const wonCount = rows.filter(r => r.won).length;

  const TabBtn = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: any }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
        tab === id ? "bg-primary/20 text-primary-glow" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="bg-gradient-card border border-border rounded-2xl shadow-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-border">
        <TabBtn id="all" label="All Bets" icon={Users} />
        <TabBtn id="mine" label="My Bets" icon={UserIcon} />
        <TabBtn id="top" label="Top" icon={Trophy} />
      </div>

      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">{wonCount}/{rows.length} <span className="font-normal text-muted-foreground">Wins</span></div>
        </div>
        <div className="text-right">
          <div className="text-base font-black tabular-nums text-success">{totalWin.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total win Birr</div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border gap-2">
        <span>User</span>
        <span className="text-right">Bet</span>
        <span className="text-right">x</span>
        <span className="text-right">Win</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">No bets yet</div>
        ) : (
          rows.map(r => {
            const mine = r.user_id === user?.id;
            return (
              <div
                key={r.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-center px-3 py-1.5 gap-2 text-xs border-b border-border/50 ${mine ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-5 h-5 rounded-full bg-gradient-jet shrink-0" />
                  <span className="truncate">{r.username.slice(0, 1)}***{r.username.slice(-1)}</span>
                </div>
                <span className="tabular-nums text-right">{coinsToBirr(r.amount).toFixed(2)}</span>
                <span className="tabular-nums text-right">
                  {r.cashout_multiplier ? (
                    <span className="px-1.5 py-0.5 rounded bg-success/20 text-success text-[10px] font-bold">
                      {r.cashout_multiplier.toFixed(2)}x
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
                <span className={`tabular-nums text-right font-semibold ${r.won ? "text-success" : "text-muted-foreground"}`}>
                  {r.won ? coinsToBirr(r.payout).toFixed(2) : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
