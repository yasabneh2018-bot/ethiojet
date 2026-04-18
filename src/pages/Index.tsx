import { useCallback, useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { JetXCanvas, type GamePhase } from "@/components/jetx/JetXCanvas";
import { BetControls } from "@/components/jetx/BetControls";
import { TournamentBanner } from "@/components/jetx/TournamentBanner";
import { AllBetsPanel } from "@/components/jetx/AllBetsPanel";
import { HistoryStrip } from "@/components/jetx/HistoryStrip";
import { supabase } from "@/integrations/supabase/client";
import { coinsToBirr, birrToCoins, fmtBirr, getTournamentInfo, MAX_WIN_BIRR } from "@/lib/jetx";
import { toast } from "sonner";

interface BetSlot {
  amountBirr: number;
  autoCashout: number | null;
  cashed: boolean;
}

const Index = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentMult, setCurrentMult] = useState(1);
  const [crashMult, setCrashMult] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const bet1Ref = useRef<BetSlot | null>(null);
  const bet2Ref = useRef<BetSlot | null>(null);
  const [active1, setActive1] = useState(false);
  const [active2, setActive2] = useState(false);
  const [cashed1, setCashed1] = useState(false);
  const [cashed2, setCashed2] = useState(false);
  const [autoPlay1, setAutoPlay1] = useState(false);
  const [autoPlay2, setAutoPlay2] = useState(false);

  const balanceBirr = coinsToBirr(profile?.balance ?? 0);
  const wagered = profile?.total_wagered ?? 0;
  const xp = profile?.xp ?? 0;

  const reservedFor = (slot: 1 | 2) => {
    const other = slot === 1 ? bet2Ref.current : bet1Ref.current;
    return other ? other.amountBirr : 0;
  };

  const placeBet = useCallback((slot: 1 | 2) => (amountBirr: number, autoCashout: number | null) => {
    if (!user || !profile) return;
    const amountCoins = birrToCoins(amountBirr);
    if (amountCoins > profile.balance) { toast.error("Insufficient balance"); return; }
    (supabase as any).from("profiles").update({ balance: profile.balance - amountCoins }).eq("id", user.id).then(refresh);
    const slotData: BetSlot = { amountBirr, autoCashout, cashed: false };
    if (slot === 1) { bet1Ref.current = slotData; setActive1(true); setCashed1(false); }
    else { bet2Ref.current = slotData; setActive2(true); setCashed2(false); }
    toast.success(`Bet ${slot}: ${fmtBirr(amountBirr)}${autoCashout ? ` · auto @${autoCashout}x` : ""}`);
  }, [profile, user, refresh]);

  const settleWin = useCallback(async (slot: 1 | 2, multiplier: number) => {
    const ref = slot === 1 ? bet1Ref.current : bet2Ref.current;
    if (!ref || ref.cashed || !user || !profile) return;
    ref.cashed = true;
    if (slot === 1) setCashed1(true); else setCashed2(true);

    const cappedMult = Math.min(multiplier, MAX_WIN_BIRR / ref.amountBirr);
    const payoutBirr = +(ref.amountBirr * cappedMult).toFixed(2);
    const profitBirr = payoutBirr - ref.amountBirr;
    const amountCoins = birrToCoins(ref.amountBirr);
    const payoutCoins = birrToCoins(payoutBirr);
    const xpGain = Math.floor(amountCoins);

    await (supabase as any).from("profiles").update({
      balance: profile.balance + payoutCoins,
      total_wagered: wagered + amountCoins,
      xp: xp + xpGain,
    }).eq("id", user.id);

    await (supabase as any).from("bets").insert({
      user_id: user.id, amount: amountCoins,
      cashout_multiplier: cappedMult, crash_multiplier: crashMult || cappedMult,
      payout: payoutCoins, won: true,
    });

    const t = getTournamentInfo();
    if (t.isActive) {
      const { data: existing } = await (supabase as any)
        .from("tournament_scores").select("profit").eq("user_id", user.id).eq("tournament_key", t.key).maybeSingle();
      const newProfit = (existing ? Number(existing.profit) : 0) + birrToCoins(profitBirr);
      await (supabase as any).from("tournament_scores").upsert({
        user_id: user.id, tournament_key: t.key, profit: newProfit, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,tournament_key" });
    }
    refresh();
    toast.success(`🚀 Bet ${slot} cashed @${cappedMult.toFixed(2)}x — +${fmtBirr(profitBirr)}!`);
  }, [crashMult, profile, wagered, xp, user, refresh]);

  const settleLoss = useCallback(async (slot: 1 | 2) => {
    const ref = slot === 1 ? bet1Ref.current : bet2Ref.current;
    if (!ref || ref.cashed || !user || !profile) return;
    ref.cashed = true;
    const amountCoins = birrToCoins(ref.amountBirr);
    const xpGain = Math.floor(amountCoins);
    await (supabase as any).from("profiles").update({
      total_wagered: wagered + amountCoins,
      xp: xp + xpGain,
    }).eq("id", user.id);
    await (supabase as any).from("bets").insert({
      user_id: user.id, amount: amountCoins,
      cashout_multiplier: null, crash_multiplier: crashMult,
      payout: 0, won: false,
    });
    const t = getTournamentInfo();
    if (t.isActive) {
      const { data: existing } = await (supabase as any)
        .from("tournament_scores").select("profit").eq("user_id", user.id).eq("tournament_key", t.key).maybeSingle();
      const newProfit = (existing ? Number(existing.profit) : 0) - amountCoins;
      await (supabase as any).from("tournament_scores").upsert({
        user_id: user.id, tournament_key: t.key, profit: newProfit, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,tournament_key" });
    }
    refresh();
  }, [crashMult, profile, wagered, xp, user, refresh]);

  const onPhaseChange = useCallback((p: GamePhase, mult: number, cm: number) => {
    setPhase(p);
    setCurrentMult(mult);
    if (cm) setCrashMult(cm);
    if (p === "crashed") {
      settleLoss(1); settleLoss(2);
    }
    if (p === "waiting") {
      bet1Ref.current = null; bet2Ref.current = null;
      setActive1(false); setActive2(false);
      setCashed1(false); setCashed2(false);
    }
  }, [settleLoss]);

  const onTick = useCallback((m: number) => {
    setCurrentMult(m);
    [bet1Ref.current, bet2Ref.current].forEach((b, i) => {
      if (b && !b.cashed && b.autoCashout && m >= b.autoCashout) {
        settleWin((i + 1) as 1 | 2, b.autoCashout);
      }
    });
  }, [settleWin]);

  const onRoundEnd = useCallback((crash: number) => {
    setHistory(h => [crash, ...h].slice(0, 25));
  }, []);

  if (!profile || !user) return null;

  return (
    <div className="space-y-3">
      <TournamentBanner />
      <div className="grid lg:grid-cols-[280px_1fr] gap-3 min-h-[600px]">
        {/* Left: All bets / My bets / Top */}
        <div className="hidden lg:block h-[calc(100vh-180px)] sticky top-20">
          <AllBetsPanel />
        </div>

        {/* Right: history strip + canvas + bet panels */}
        <div className="space-y-3 min-w-0">
          <HistoryStrip history={history} />
          <JetXCanvas onPhaseChange={onPhaseChange} onTick={onTick} onRoundEnd={onRoundEnd} />
          <div className="grid sm:grid-cols-2 gap-3">
            <BetControls
              label="Bet"
              balanceBirr={balanceBirr}
              reservedByOther={reservedFor(1)}
              phase={phase}
              currentMult={currentMult}
              onPlaceBet={placeBet(1)}
              onCashout={() => settleWin(1, currentMult)}
              hasActiveBet={active1}
              cashedOut={cashed1}
              autoPlay={autoPlay1}
              setAutoPlay={setAutoPlay1}
            />
            <BetControls
              label="Bet"
              balanceBirr={balanceBirr}
              reservedByOther={reservedFor(2)}
              phase={phase}
              currentMult={currentMult}
              onPlaceBet={placeBet(2)}
              onCashout={() => settleWin(2, currentMult)}
              hasActiveBet={active2}
              cashedOut={cashed2}
              autoPlay={autoPlay2}
              setAutoPlay={setAutoPlay2}
            />
          </div>
        </div>
      </div>
      <footer className="text-center text-xs text-muted-foreground pt-4">
        🎮 Play-money demo · 1 coin = 0.5 Birr · Min bet 5 Birr · Max win {MAX_WIN_BIRR.toLocaleString()} Birr
      </footer>
    </div>
  );
};

export default Index;
