import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { fmtBirr, MIN_BET_BIRR, MAX_WIN_BIRR, betExceedsCap } from "@/lib/jetx";
import type { GamePhase } from "./JetXCanvas";
import { toast } from "sonner";

interface Props {
  label: string;
  balanceBirr: number;
  phase: GamePhase;
  currentMult: number;
  onPlaceBet: (amountBirr: number, autoCashout: number | null) => void;
  onCashout: () => void;
  onCancelBet?: () => void;
  hasActiveBet: boolean;
  cashedOut: boolean;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  reservedByOther?: number;
}

export const BetControls = ({
  label, balanceBirr, phase, currentMult, onPlaceBet, onCashout, onCancelBet,
  hasActiveBet, cashedOut, autoPlay, setAutoPlay, reservedByOther = 0,
}: Props) => {
  const [amount, setAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState(1.10);
  const [autoCashoutOn, setAutoCashoutOn] = useState(false);
  const [pendingBet, setPendingBet] = useState(false);

  const available = Math.max(0, balanceBirr - reservedByOther);

  useEffect(() => {
    if (autoPlay && phase === "waiting" && !hasActiveBet && !pendingBet) {
      if (amount >= MIN_BET_BIRR && amount <= available && !betExceedsCap(amount)) {
        setPendingBet(true);
        onPlaceBet(amount, autoCashoutOn ? autoCashout : null);
      }
    }
    if (phase !== "waiting" && pendingBet) setPendingBet(false);
  }, [autoPlay, phase, hasActiveBet, pendingBet, amount, available, autoCashout, autoCashoutOn, onPlaceBet]);

  const adjust = (delta: number) =>
    setAmount(a => Math.max(MIN_BET_BIRR, Math.min(available, +(a + delta).toFixed(2))));

  const tryPlace = () => {
    if (amount < MIN_BET_BIRR) { toast.error(`Minimum bet is ${MIN_BET_BIRR} Birr`); return; }
    if (betExceedsCap(amount)) { toast.error(`Bet too large — max possible win is ${MAX_WIN_BIRR.toLocaleString()} Birr`); return; }
    if (amount > available) { toast.error("Insufficient balance"); return; }
    if (phase !== "waiting") {
      // Queue for the next round via auto-bet
      setAutoPlay(true);
      toast.success(`Bet queued for next round · ${fmtBirr(amount)}`);
      return;
    }
    onPlaceBet(amount, autoCashoutOn ? autoCashout : null);
  };

  const canPlace = !hasActiveBet && amount >= MIN_BET_BIRR && amount <= available && !betExceedsCap(amount);
  const canCashout = phase === "flying" && hasActiveBet && !cashedOut;
  // Bet placed but round not yet flying → allow Cancel
  const canCancel = phase === "waiting" && hasActiveBet && !cashedOut;

  return (
    <div className="bg-[hsl(0_0%_11%)] border border-white/10 rounded-2xl p-2 flex flex-col gap-2 max-w-[280px] w-full mr-auto overflow-hidden">
      <div className="flex items-center gap-2 min-w-0">
        {/* Stepper */}
        <div className="flex items-center gap-0.5 bg-[hsl(0_0%_16%)] rounded-full p-0.5 shrink-0 border border-white/10">
          <Button size="icon" variant="ghost" onClick={() => adjust(-1)} className="h-7 w-7 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, +e.target.value))}
            className="text-center text-sm font-bold tabular-nums bg-transparent border-0 h-7 w-12 px-0 text-white focus-visible:ring-0"
            min={MIN_BET_BIRR}
            step={1}
          />
          <Button size="icon" variant="ghost" onClick={() => adjust(1)} className="h-7 w-7 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Compact action button — green BET / red CANCEL / golden CASH OUT */}
        {canCashout ? (
          <Button
            onClick={onCashout}
            className="flex-1 min-w-0 h-9 text-xs font-black rounded-xl flex items-center justify-center gap-1 leading-none border px-2"
            style={{
              background: "linear-gradient(180deg, hsl(45 100% 58%), hsl(38 96% 47%))",
              borderColor: "hsl(45 100% 72%)",
              color: "hsl(30 70% 12%)",
              boxShadow: "0 0 16px hsl(45 100% 50% / 0.45)",
            }}
          >
            <span>CASH OUT</span>
            <span className="tabular-nums truncate">{(amount * currentMult).toFixed(2)}<span className="text-[10px] ml-0.5">Birr</span></span>
          </Button>
        ) : canCancel ? (
          <Button
            onClick={onCancelBet}
            className="flex-1 min-w-0 h-9 text-xs font-black rounded-xl border px-2 text-white"
            style={{
              background: "linear-gradient(180deg, hsl(0 78% 52%), hsl(0 76% 40%))",
              borderColor: "hsl(0 85% 65%)",
              boxShadow: "0 0 14px hsl(0 80% 50% / 0.4)",
            }}
          >
            CANCEL
          </Button>
        ) : (
          <Button
            onClick={tryPlace}
            className="flex-1 min-w-0 h-9 text-xs font-black rounded-xl flex items-center justify-center gap-1 leading-none border px-2 text-white disabled:opacity-50"
            style={{
              background: canPlace
                ? "linear-gradient(180deg, hsl(122 72% 42%), hsl(122 75% 30%))"
                : "linear-gradient(180deg, hsl(122 20% 26%), hsl(122 20% 19%))",
              borderColor: canPlace ? "hsl(122 70% 58%)" : "hsl(122 12% 32%)",
              boxShadow: canPlace ? "0 0 14px hsl(122 75% 40% / 0.45)" : "none",
            }}
          >
            <span>{phase === "flying" && !hasActiveBet ? "QUEUE" : label.toUpperCase()}</span>
            <span className="tabular-nums truncate">
              {hasActiveBet
                ? (cashedOut ? "✓" : "Flying")
                : <>{amount.toFixed(2)}<span className="text-[10px] ml-0.5">Birr</span></>}
            </span>
          </Button>
        )}
      </div>


      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Auto Bet
          <Switch checked={autoPlay} onCheckedChange={setAutoPlay} />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Auto Cash Out
          <Switch checked={autoCashoutOn} onCheckedChange={setAutoCashoutOn} />
          <Input
            type="number"
            value={autoCashout}
            onChange={e => setAutoCashout(Math.max(1.01, +e.target.value))}
            step={0.01}
            min={1.01}
            disabled={!autoCashoutOn}
            className="w-16 h-7 text-center font-bold tabular-nums bg-background/50 text-xs"
          />
          <span className="text-xs">x</span>
        </label>
      </div>
    </div>
  );
};
