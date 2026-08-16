import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeBets, type LiveBet } from "@/lib/liveBets";
import { coinsToBirr } from "@/lib/jetx";
import { getBets, getUserBets, subscribeDb } from "@/lib/localDb";

type Tab = "all" | "mine" | "top";

const AVATAR_COLORS = [
  "from-rose-500 to-red-700",
  "from-emerald-500 to-green-700",
  "from-sky-500 to-blue-700",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-700",
  "from-teal-500 to-cyan-700",
];

const avatarClass = (seed: string) =>
  AVATAR_COLORS[
    Math.abs([...seed].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length
  ];

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
    const onRoundReset = () => setBets([]);
    window.addEventListener("jetx:round-reset", onRoundReset);
    return () => {
      unsub();
      window.removeEventListener("jetx:round-reset", onRoundReset);
    };
  }, []);

  // My bets + top winners, from local storage
  useEffect(() => {
    const load = () => {
      if (user) {
        setHistoryMine(getUserBets(user.id, 50).map(r => ({
          id: `db-${r.id}`, user_id: r.user_id, username: "you",
          amountBirr: coinsToBirr(r.amount),
          cashout: r.cashout_multiplier, payoutBirr: coinsToBirr(r.payout),
          status: r.won ? ("cashed" as const) : ("lost" as const),
          ts: new Date(r.created_at).getTime(),
        })));
      } else {
        setHistoryMine([]);
      }
      setHistoryTop(
        getBets()
          .filter(r => r.won)
          .sort((a, b) => b.payout - a.payout)
          .slice(0, 30)
          .map(r => ({
            id: `dbt-${r.id}`, user_id: r.user_id, username: r.username,
            amountBirr: coinsToBirr(r.amount),
            cashout: r.cashout_multiplier, payoutBirr: coinsToBirr(r.payout),
            status: "cashed" as const, ts: new Date(r.created_at).getTime(),
          }))
      );
    };
    load();
    return subscribeDb(load);
  }, [user]);

  // Auto-mark placed bets as lost after 60s
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

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All Bets" },
    { id: "mine", label: "Previous" },
    { id: "top", label: "Top" },
  ];

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const multColor = (m: number) =>
    m >= 10 ? "text-fuchsia-400" : m >= 2 ? "text-purple-400" : "text-sky-400";

  return (
    <div className="rounded-2xl bg-[hsl(0_0%_11%)] border border-white/5 flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="p-2">
        <div className="flex rounded-full bg-[hsl(0_0%_8%)] p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-[hsl(0_0%_22%)] text-white" : "text-white/55"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mx-2 mb-2 rounded-xl bg-[hsl(0_0%_8%)] px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex -space-x-2 mb-1">
              {rows.slice(0, 3).map(r => (
                <div
                  key={`av-${r.id}`}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarClass(r.username)} ring-2 ring-[hsl(0_0%_8%)]`}
                />
              ))}
              {rows.length === 0 && (
                <div className="w-7 h-7 rounded-full bg-white/10 ring-2 ring-[hsl(0_0%_8%)]" />
              )}
            </div>
            <div className="text-sm text-white/60 truncate">
              <span className="text-white font-semibold">{cashedRows.length}/{rows.length}</span> Bets
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold tabular-nums text-white">{fmt(totalWin)}</div>
            <div className="text-xs text-white/50">Total win ETB</div>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[hsl(122_80%_40%)] transition-all duration-500"
            style={{ width: `${winPct}%` }}
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr] px-4 pb-1.5 text-xs text-white/45">
        <span>Player</span>
        <span className="text-right">Bet ETB</span>
        <span className="text-right">X</span>
        <span className="text-right">Win ETB</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {rows.length === 0 ? (
          <div className="text-center py-6 text-xs text-white/40">Waiting for bets…</div>
        ) : (
          rows.map(r => {
            const won = r.status === "cashed";
            return (
              <div
                key={r.id}
                className={`grid grid-cols-[1.4fr_1fr_0.7fr_1fr] items-center px-2 py-2 gap-1 rounded-xl text-sm ${
                  won ? "bg-[hsl(100_60%_12%)] border border-[hsl(110_50%_25%)]" : "bg-[hsl(0_0%_8%)]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-full shrink-0 bg-gradient-to-br ${avatarClass(r.username)}`} />
                  <span className="truncate text-white/85">
                    {r.username.slice(0, 1)}***{r.username.slice(-1)}
                  </span>
                </div>
                <span className="tabular-nums text-right text-white/85">{fmt(r.amountBirr)}</span>
                <span className="tabular-nums text-right">
                  {r.cashout ? (
                    <span className={`font-semibold ${multColor(r.cashout)}`}>{r.cashout.toFixed(2)}x</span>
                  ) : (
                    <span className="text-white/25" />
                  )}
                </span>
                <span className="tabular-nums text-right text-white/85">
                  {won ? fmt(r.payoutBirr ?? 0) : ""}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
