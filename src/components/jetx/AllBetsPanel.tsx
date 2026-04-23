import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Users, User as UserIcon, Trophy } from "lucide-react";
import { subscribeBets, type LiveBet } from "@/lib/liveBets";
import { supabase } from "@/integrations/supabase/client";
import { coinsToBirr } from "@/lib/jetx";

type Tab = "all" | "mine" | "top";

export const AllBetsPanel = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [bets, setBets] = useState<LiveBet[]>([]);
  const [historyMine, setHistoryMine] = useState<LiveBet[]>([]);
  const [historyTop, setHistoryTop] = useState<LiveBet[]>([]);

  useEffect(() => {
    const unsub = subscribeBets((b) => {
      setBets(prev => {
        if (b.status === "cashed") {
          const idx = [...prev].reverse().findIndex(p => p.user_id === b.user_id && p.status === "placed" && p.amountBirr === b.amountBirr);
          if (idx >= 0) {
            const realIdx = prev.length - 1 - idx;
            const next = [...prev];
            next[realIdx] = { ...next[realIdx], ...b };
            return next;
          }
        }
        return [b, ...prev].slice(0, 100);
      });
    });
    return unsub;
  }, []);

  // Load my bet history
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("bets").select("id,user_id,amount,cashout_multiplier,payout,won,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (data) {
        setHistoryMine(data.map((r: any) => ({
          id: `db-${r.id}`, user_id: r.user_id, username: "you",
          amountBirr: coinsToBirr(r.amount),
          cashout: r.cashout_multiplier, payoutBirr: coinsToBirr(r.payout),
          status: r.won ? "cashed" as const : "lost" as const,
          ts: new Date(r.created_at).getTime(),
        })));
      }
    })();
  }, [user]);

  // Load top winners
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("bets").select("id,user_id,amount,cashout_multiplier,payout,profiles(username)")
        .eq("won", true).order("payout", { ascending: false }).limit(30);
      if (data) {
        setHistoryTop(data.map((r: any) => ({
          id: `dbt-${r.id}`, user_id: r.user_id, username: r.profiles?.username ?? "player",
          amountBirr: coinsToBirr(r.amount),
          cashout: r.cashout_multiplier, payoutBirr: coinsToBirr(r.payout),
          status: "cashed" as const, ts: Date.now(),
        })));
      }
    })();
  }, [tab]);

  // Auto-clear placed bets after 60s if not cashed (assume lost)
  useEffect(() => {
    const i = setInterval(() => {
      setBets(prev => prev.map(b =>
        b.status === "placed" && Date.now() - b.ts > 60000 ? { ...b, status: "lost" } : b
      ));
    }, 5000);
    return () => clearInterval(i);
  }, []);

  let rows: LiveBet[] = bets;
  if (tab === "mine") {
    const liveMine = bets.filter(b => b.user_id === user?.id);
    const seen = new Set(liveMine.map(b => b.id));
    rows = [...liveMine, ...historyMine.filter(b => !seen.has(b.id))];
  }
  if (tab === "top") {
    const liveTop = bets.filter(b => b.status === "cashed");
    rows = [...liveTop, ...historyTop].sort((a, b) => (b.payoutBirr ?? 0) - (a.payoutBirr ?? 0)).slice(0, 50);
  }

  const cashedRows = rows.filter(b => b.status === "cashed");
  const totalWin = cashedRows.reduce((s, b) => s + (b.payoutBirr ?? 0), 0);
  const maxWin = Math.max(100, totalWin * 1.2);
  const winPct = Math.min(100, (totalWin / maxWin) * 100);

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

      <div className="px-3 py-2 border-b border-border space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">{cashedRows.length}/{rows.length} <span className="font-normal text-muted-foreground">Cashed</span></div>
          </div>
          <div className="text-right">
            <div className="text-base font-black tabular-nums text-success">{totalWin.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total win Birr</div>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success to-emerald-400 transition-all duration-500"
            style={{ width: `${winPct}%` }}
          />
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
          <div className="text-center py-6 text-xs text-muted-foreground">Waiting for bets…</div>
        ) : (
          rows.map(r => {
            const mine = r.user_id === user?.id;
            return (
              <div
                key={r.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-center px-3 py-1.5 gap-2 text-xs border-b border-border/50 ${mine ? "bg-primary/5" : ""} ${r.status === "placed" ? "animate-pulse-soft" : ""}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <div className={`w-5 h-5 rounded-full shrink-0 ${r.status === "placed" ? "bg-yellow-500" : r.status === "cashed" ? "bg-success" : "bg-muted"}`} />
                  <span className="truncate">{r.username.slice(0, 1)}***{r.username.slice(-1)}</span>
                </div>
                <span className="tabular-nums text-right">{r.amountBirr.toFixed(2)}</span>
                <span className="tabular-nums text-right">
                  {r.cashout ? (
                    <span className="px-1.5 py-0.5 rounded bg-success/20 text-success text-[10px] font-bold">
                      {r.cashout.toFixed(2)}x
                    </span>
                  ) : r.status === "placed" ? (
                    <span className="text-yellow-500 text-[10px] font-bold">flying</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
                <span className={`tabular-nums text-right font-semibold ${r.status === "cashed" ? "text-success" : "text-muted-foreground"}`}>
                  {r.status === "cashed" ? (r.payoutBirr ?? 0).toFixed(2) : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
