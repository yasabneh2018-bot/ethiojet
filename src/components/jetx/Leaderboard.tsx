import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTournamentInfo, fmtMoney } from "@/lib/jetx";
import { Crown, Medal } from "lucide-react";

interface Row { user_id: string; profit: number; username: string; }

export const Leaderboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [info, setInfo] = useState(getTournamentInfo());

  const load = async () => {
    const i = getTournamentInfo();
    setInfo(i);
    const { data } = await (supabase as any)
      .from("tournament_scores")
      .select("user_id, profit, profiles!inner(username)")
      .eq("tournament_key", i.key)
      .order("profit", { ascending: false })
      .limit(20);
    if (data) {
      setRows(data.map((r: any) => ({
        user_id: r.user_id,
        profit: Number(r.profit),
        username: r.profiles?.username ?? "pilot",
      })));
    }
  };

  useEffect(() => {
    load();
    const ch = (supabase as any)
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_scores" }, load)
      .subscribe();
    const iv = setInterval(load, 15000);
    return () => { (supabase as any).removeChannel(ch); clearInterval(iv); };
  }, []);

  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-5 h-5 text-primary-glow" />
        <h3 className="font-bold text-lg">Leaderboard</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {info.isActive ? "Live" : "Last/Upcoming"}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No players yet. Be the first to cash out!
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {rows.map((r, i) => (
            <div key={r.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 animate-fade-in">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? "bg-gradient-jet text-primary-foreground" :
                i === 1 ? "bg-muted text-foreground" :
                i === 2 ? "bg-accent/30 text-accent" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i < 3 ? <Medal className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <div className="flex-1 truncate text-sm font-medium">{r.username}</div>
              <div className={`text-sm font-bold tabular-nums ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>
                {r.profit >= 0 ? "+" : ""}{fmtMoney(r.profit)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
