import { useCallback, useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { JetXCanvas, type GamePhase } from "@/components/jetx/JetXCanvas";
import { BetControls } from "@/components/jetx/BetControls";
import { HistoryStrip } from "@/components/jetx/HistoryStrip";
import { WinBanner, type WinEvent } from "@/components/jetx/WinBanner";
import { AllBetsPanel } from "@/components/jetx/AllBetsPanel";
import { InlineChat } from "@/components/jetx/InlineChat";
import { MessageCircle } from "lucide-react";
import { addScore, insertBet } from "@/lib/localDb";
import { coinsToBirr, birrToCoins, fmtBirr, getTournamentInfo, MAX_WIN_BIRR } from "@/lib/jetx";
import { broadcastBet } from "@/lib/liveBets";
import { toast } from "sonner";

interface BetSlot {
  amountBirr: number;
  autoCashout: number | null;
  cashed: boolean;
}

const Index = () => {
  const { user } = useAuth();
  const { profile, refresh, setLocal } = useProfile();

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentMult, setCurrentMult] = useState(1);
  const [crashMult, setCrashMult] = useState(0);
  const [history, setHistory] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("jetx:history");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [winEvent, setWinEvent] = useState<WinEvent | null>(null);

  const bet1Ref = useRef<BetSlot | null>(null);
  const bet2Ref = useRef<BetSlot | null>(null);
  const [active1, setActive1] = useState(false);
  const [active2, setActive2] = useState(false);
  const [cashed1, setCashed1] = useState(false);
  const [cashed2, setCashed2] = useState(false);
  const [autoPlay1, setAutoPlay1] = useState(false);
  const [autoPlay2, setAutoPlay2] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

    // Optimistic deduction — instant balance update
    const newBalance = profile.balance - amountCoins;
    setLocal({ balance: newBalance });

    const slotData: BetSlot = { amountBirr, autoCashout, cashed: false };
    if (slot === 1) { bet1Ref.current = slotData; setActive1(true); setCashed1(false); }
    else { bet2Ref.current = slotData; setActive2(true); setCashed2(false); }
    broadcastBet({
      id: `${user.id}-${slot}-${Date.now()}`,
      user_id: user.id,
      username: profile.username,
      amountBirr,
      status: "placed",
      ts: Date.now(),
    });
    toast.success(`Bet ${slot}: ${fmtBirr(amountBirr)}${autoCashout ? ` · auto @${autoCashout}x` : ""}`);
  }, [profile, user, setLocal]);

  const cancelBet = useCallback((slot: 1 | 2) => {
    if (!user || !profile) return;
    const ref = slot === 1 ? bet1Ref.current : bet2Ref.current;
    if (!ref || ref.cashed) return;
    if (phase !== "waiting") { toast.error("Round already started"); return; }
    const refundCoins = birrToCoins(ref.amountBirr);
    const newBalance = profile.balance + refundCoins;
    setLocal({ balance: newBalance });
    if (slot === 1) { bet1Ref.current = null; setActive1(false); setCashed1(false); }
    else { bet2Ref.current = null; setActive2(false); setCashed2(false); }
    toast.info(`Bet ${slot} cancelled · refunded ${fmtBirr(ref.amountBirr)}`);
  }, [user, profile, phase, setLocal]);

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

    // Optimistic instant balance/xp update
    const newBalance = profile.balance + payoutCoins;
    const newWagered = wagered + amountCoins;
    const newXp = xp + xpGain;
    setLocal({ balance: newBalance, total_wagered: newWagered, xp: newXp });

    // Show green win banner
    setWinEvent({ id: Date.now(), amount: payoutBirr, multiplier: cappedMult });
    broadcastBet({
      id: `${user.id}-cash-${Date.now()}`,
      user_id: user.id,
      username: profile.username,
      amountBirr: ref.amountBirr,
      cashout: cappedMult,
      payoutBirr,
      status: "cashed",
      ts: Date.now(),
    });

    insertBet({
      user_id: user.id, username: profile.username, amount: amountCoins,
      cashout_multiplier: cappedMult, crash_multiplier: crashMult || cappedMult,
      payout: payoutCoins, won: true,
    });

    const t = getTournamentInfo();
    if (t.isActive) addScore(user.id, profile.username, t.key, birrToCoins(profitBirr));
    refresh();
  }, [crashMult, profile, wagered, xp, user, refresh, setLocal]);

  const settleLoss = useCallback(async (slot: 1 | 2) => {
    const ref = slot === 1 ? bet1Ref.current : bet2Ref.current;
    if (!ref || ref.cashed || !user || !profile) return;
    ref.cashed = true;
    const amountCoins = birrToCoins(ref.amountBirr);
    const xpGain = Math.floor(amountCoins);
    const newWagered = wagered + amountCoins;
    const newXp = xp + xpGain;
    setLocal({ total_wagered: newWagered, xp: newXp });

    insertBet({
      user_id: user.id, username: profile.username, amount: amountCoins,
      cashout_multiplier: null, crash_multiplier: crashMult,
      payout: 0, won: false,
    });
    const t = getTournamentInfo();
    if (t.isActive) addScore(user.id, profile.username, t.key, -amountCoins);
    refresh();
  }, [crashMult, profile, wagered, xp, user, refresh, setLocal]);

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
      // Tell live-bets panel to clear so it only shows this round
      window.dispatchEvent(new Event("jetx:round-reset"));
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
    setHistory(h => {
      const next = [crash, ...h].slice(0, 50);
      try { localStorage.setItem("jetx:history", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  if (!profile || !user) return null;

  return (
    <div className="space-y-3">
      <HistoryStrip history={history} />

      {/* 3-column layout: live bets | game | chat (chat collapsible) */}
      <div className={`grid grid-cols-1 gap-3 ${chatOpen ? "lg:grid-cols-[260px_1fr_320px]" : "lg:grid-cols-[260px_1fr]"}`}>
        {/* Left: live bets */}
        <aside className="hidden lg:block h-[calc(100vh-180px)] min-h-[500px]">
          <AllBetsPanel />
        </aside>

        {/* Center: game + bet controls */}
        <div className="space-y-3 min-w-0">
          <div className="relative">
            <WinBanner event={winEvent} />
            <JetXCanvas onPhaseChange={onPhaseChange} onTick={onTick} onRoundEnd={onRoundEnd} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <BetControls
              label="Bet" balanceBirr={balanceBirr} reservedByOther={reservedFor(1)}
              phase={phase} currentMult={currentMult}
              onPlaceBet={placeBet(1)} onCashout={() => settleWin(1, currentMult)}
              onCancelBet={() => cancelBet(1)} hasActiveBet={active1} cashedOut={cashed1}
              autoPlay={autoPlay1} setAutoPlay={setAutoPlay1}
            />
            <BetControls
              label="Bet" balanceBirr={balanceBirr} reservedByOther={reservedFor(2)}
              phase={phase} currentMult={currentMult}
              onPlaceBet={placeBet(2)} onCashout={() => settleWin(2, currentMult)}
              onCancelBet={() => cancelBet(2)} hasActiveBet={active2} cashedOut={cashed2}
              autoPlay={autoPlay2} setAutoPlay={setAutoPlay2}
            />
          </div>
        </div>

        {/* Right: chat — pinned at top, below header/wallet */}
        {chatOpen && (
          <aside className="hidden lg:block h-[calc(100vh-180px)] min-h-[500px]">
            <InlineChat />
          </aside>
        )}
      </div>

      {/* Mobile chat overlay */}
      {chatOpen && (
        <div className="lg:hidden fixed top-28 right-3 z-40 w-[320px] h-[420px] max-h-[70vh] shadow-2xl rounded-2xl overflow-hidden border border-border">
          <InlineChat />
        </div>
      )}

    </div>
  );
};

export default Index;
