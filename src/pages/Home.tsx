import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { coinsToBirr, fmtBirr } from "@/lib/jetx";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, Trophy, Play, Crown, Timer } from "lucide-react";
import aviatorLogo from "@/assets/aviator-logo.png";

interface TopGamer {
  username: string;
  total_wagered: number;
}

const Home = () => {
  const { profile } = useProfile();
  const [top, setTop] = useState<TopGamer[]>([]);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const i = setInterval(() => setCountdown(c => (c <= 1 ? 5 : c - 1)), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("username,total_wagered")
        .order("total_wagered", { ascending: false })
        .limit(5);
      if (data) setTop(data);
    })();
  }, []);

  if (!profile) return null;
  const balanceBirr = coinsToBirr(profile.balance);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Hero with logo + play */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950/60 via-background to-background border border-border p-6 text-center shadow-card">
        <img
          src={aviatorLogo}
          alt="Aviator"
          className="w-40 h-40 mx-auto object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"
        />
        <h1 className="text-3xl font-black mt-2 tracking-tight">Welcome, {profile.username}</h1>
        <p className="text-sm text-muted-foreground mt-1">Ready to fly? Cash out before it crashes.</p>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border">
          <Timer className="w-4 h-4 text-primary-glow" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Next round in</span>
          <span className="text-lg font-black tabular-nums text-primary-glow">{countdown}s</span>
        </div>
        <Button
          asChild
          size="lg"
          className="mt-5 h-14 px-10 text-lg font-black rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]"
        >
          <Link to="/play">
            <Play className="w-5 h-5 mr-2" fill="currentColor" />
            PLAY AVIATOR
          </Link>
        </Button>
      </div>

      {/* Wallet card */}
      <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-primary-glow" />
          <h2 className="font-bold text-lg">Your Wallet</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/60 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</div>
            <div className="text-2xl font-black text-gradient-jet tabular-nums">{fmtBirr(balanceBirr)}</div>
          </div>
          <div className="bg-secondary/60 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Withdrawable</div>
            <div className="text-2xl font-black tabular-nums">{fmtBirr(balanceBirr)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            <Link to="/deposit"><ArrowDownToLine className="w-4 h-4 mr-1" /> Deposit</Link>
          </Button>
          <Button asChild variant="secondary" className="font-bold">
            <Link to="/withdraw"><ArrowUpFromLine className="w-4 h-4 mr-1" /> Withdraw</Link>
          </Button>
        </div>
      </div>

      {/* Top gamers */}
      <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-lg">Top Gamers</h2>
          <span className="ml-auto text-xs text-muted-foreground">by total wagered</span>
        </div>
        {top.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No rankings yet — be the first!</div>
        ) : (
          <ul className="space-y-2">
            {top.map((g, i) => {
              const reward = i === 0 ? "500 Birr" : i === 1 ? "250 Birr" : i === 2 ? "100 Birr" : "—";
              const medal = i === 0 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                : i === 1 ? "bg-slate-400/20 text-slate-300 border-slate-400/40"
                : i === 2 ? "bg-amber-700/20 text-amber-500 border-amber-700/40"
                : "bg-secondary/60 text-muted-foreground border-border";
              return (
                <li key={i} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/40">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-black text-sm ${medal}`}>
                    {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{g.username}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {fmtBirr(coinsToBirr(Number(g.total_wagered)))} wagered
                    </div>
                  </div>
                  <div className="text-xs font-bold text-yellow-400">{reward}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Home;
