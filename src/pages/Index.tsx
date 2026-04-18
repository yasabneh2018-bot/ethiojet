import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { JetXCanvas, type GamePhase } from "@/components/jetx/JetXCanvas";
import { BetControls } from "@/components/jetx/BetControls";
import { TournamentBanner } from "@/components/jetx/TournamentBanner";
import { Leaderboard } from "@/components/jetx/Leaderboard";
import { LevelBar } from "@/components/jetx/LevelBar";
import { WalletActions } from "@/components/jetx/WalletActions";
import { HistoryList } from "@/components/jetx/HistoryList";
import { Button } from "@/components/ui/button";
import { LogOut, Plane, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, getTournamentInfo } from "@/lib/jetx";
import { toast } from "sonner";

const Index = () => {
  const { user, loading } = useAuth();
  const { profile, refresh } = useProfile();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Setting up your account…</div>;
  return <Game />;
};

const Game = () => {
  const { user, signOut } = useAuth();
  const { profile, refresh } = useProfile();
  const nav = useNavigate();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentMult, setCurrentMult] = useState(1);
  const [crashMult, setCrashMult] = useState(0);

  const betRef = useRef<{ amount: number; autoCashout: number | null; cashed: boolean } | null>(null);
  const [hasActiveBet, setHasActiveBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const balance = profile?.balance ?? 0;
  const wagered = profile?.total_wagered ?? 0;
  const xp = profile?.xp ?? 0;

  const placeBet = useCallback((amount: number, autoCashout: number | null) => {
    if (!user) return;
    if (amount > balance) { toast.error("Insufficient balance"); return; }
    (supabase as any).from("profiles").update({ balance: balance - amount }).eq("id", user.id).then(refresh);
    betRef.current = { amount, autoCashout, cashed: false };
    setHasActiveBet(true);
    setCashedOut(false);
    toast.success(`Bet placed: ${amount}${autoCashout ? ` · auto @${autoCashout}x` : ""}`);
  }, [balance, user, refresh]);

  const settleWin = useCallback(async (multiplier: number) => {
    if (!betRef.current || betRef.current.cashed || !user) return;
    const bet = betRef.current;
    bet.cashed = true;
    setCashedOut(true);
    const payout = +(bet.amount * multiplier).toFixed(2);
    const profit = payout - bet.amount;
    const xpGain = Math.floor(bet.amount);

    const newBalance = profile.balance + payout;
    const newWagered = profile.total_wagered + bet.amount;
    const newXp = profile.xp + xpGain;

    await (supabase as any).from("profiles").update({
      balance: newBalance, total_wagered: newWagered, xp: newXp,
    }).eq("id", user!.id);

    await (supabase as any).from("bets").insert({
      user_id: user!.id, amount: bet.amount,
      cashout_multiplier: multiplier, crash_multiplier: crashMult || multiplier,
      payout, won: true,
    });

    // Tournament score if active
    const t = getTournamentInfo();
    if (t.isActive) {
      const { data: existing } = await (supabase as any)
        .from("tournament_scores").select("profit").eq("user_id", user!.id).eq("tournament_key", t.key).maybeSingle();
      const newProfit = (existing ? Number(existing.profit) : 0) + profit;
      await (supabase as any).from("tournament_scores").upsert({
        user_id: user!.id, tournament_key: t.key, profit: newProfit, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,tournament_key" });
    }
    refresh();
    toast.success(`🚀 Cashed out @${multiplier.toFixed(2)}x — won ${fmtMoney(profit)}!`);
  }, [crashMult, profile, user, refresh]);

  const settleLoss = useCallback(async () => {
    if (!betRef.current || betRef.current.cashed) return;
    const bet = betRef.current;
    bet.cashed = true;
    const xpGain = Math.floor(bet.amount);
    const newWagered = profile.total_wagered + bet.amount;
    const newXp = profile.xp + xpGain;

    await (supabase as any).from("profiles").update({
      total_wagered: newWagered, xp: newXp,
    }).eq("id", user!.id);

    await (supabase as any).from("bets").insert({
      user_id: user!.id, amount: bet.amount,
      cashout_multiplier: null, crash_multiplier: crashMult,
      payout: 0, won: false,
    });

    const t = getTournamentInfo();
    if (t.isActive) {
      const { data: existing } = await (supabase as any)
        .from("tournament_scores").select("profit").eq("user_id", user!.id).eq("tournament_key", t.key).maybeSingle();
      const newProfit = (existing ? Number(existing.profit) : 0) - bet.amount;
      await (supabase as any).from("tournament_scores").upsert({
        user_id: user!.id, tournament_key: t.key, profit: newProfit, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,tournament_key" });
    }
    refresh();
  }, [crashMult, profile, user, refresh]);

  const onCashout = useCallback(() => {
    settleWin(currentMult);
  }, [currentMult, settleWin]);

  const onPhaseChange = useCallback((p: GamePhase, mult: number, cm: number) => {
    setPhase(p);
    setCurrentMult(mult);
    if (cm) setCrashMult(cm);
    if (p === "crashed") {
      settleLoss();
    }
    if (p === "waiting") {
      betRef.current = null;
      setHasActiveBet(false);
      setCashedOut(false);
    }
  }, [settleLoss]);

  const onTick = useCallback((m: number) => {
    setCurrentMult(m);
    // Auto-cashout
    const b = betRef.current;
    if (b && !b.cashed && b.autoCashout && m >= b.autoCashout) {
      settleWin(b.autoCashout);
    }
  }, [settleWin]);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="container max-w-6xl flex items-center gap-3 py-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow shrink-0">
            <Plane className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-xl font-black text-gradient-jet">JetX</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
              <Wallet className="w-4 h-4 text-primary-glow" />
              <span className="font-bold tabular-nums">{fmtMoney(profile.balance)}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={async () => { await signOut(); nav("/auth"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-4 space-y-4">
        <div className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary border border-border w-fit">
          <Wallet className="w-4 h-4 text-primary-glow" />
          <span className="font-bold tabular-nums">{fmtMoney(profile.balance)} coins</span>
        </div>

        <LevelBar profile={profile} />
        <TournamentBanner />

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <JetXCanvas onPhaseChange={onPhaseChange} onTick={onTick} />
            <BetControls
              balance={profile.balance}
              phase={phase}
              currentMult={currentMult}
              onPlaceBet={placeBet}
              onCashout={onCashout}
              hasActiveBet={hasActiveBet}
              cashedOut={cashedOut}
              autoPlay={autoPlay}
              setAutoPlay={setAutoPlay}
            />
            <WalletActions balance={profile.balance} onChanged={refresh} />
          </div>
          <div className="space-y-4">
            <Leaderboard />
            <HistoryList />
          </div>
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-6">
          🎮 Play-money demo · Virtual coins only · No real money involved
        </footer>
      </main>
    </div>
  );
};

export default Index;
