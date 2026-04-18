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
  hasActiveBet: boolean;
  cashedOut: boolean;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  reservedByOther?: number;
}

const PRESETS = [10, 50, 100, 500];

export const BetControls = ({
  label, balanceBirr, phase, currentMult, onPlaceBet, onCashout,
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
    onPlaceBet(amount, autoCashoutOn ? autoCashout : null);
  };

  const canPlace = phase === "waiting" && !hasActiveBet && amount >= MIN_BET_BIRR && amount <= available && !betExceedsCap(amount);
  const canCashout = phase === "flying" && hasActiveBet && !cashedOut;

  return (
    <div className="bg-card/80 border border-border rounded-2xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {/* Stepper */}
        <div className="flex items-center gap-1 bg-background/50 rounded-lg p-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => adjust(-1)} className="h-8 w-8">
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, +e.target.value))}
            className="text-center text-base font-bold tabular-nums bg-transparent border-0 h-8 w-20 px-1 focus-visible:ring-0"
            min={MIN_BET_BIRR}
            step={1}
          />
          <Button size="icon" variant="ghost" onClick={() => adjust(1)} className="h-8 w-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Big BET / CASHOUT button */}
        {canCashout ? (
          <Button
            onClick={onCashout}
            className="flex-1 h-16 text-base font-black bg-gradient-win text-success-foreground hover:opacity-90 shadow-accent-glow rounded-xl flex flex-col gap-0 leading-tight"
          >
            <span>CASH OUT</span>
            <span className="text-lg tabular-nums">{(amount * currentMult).toFixed(2)} <span className="text-xs">Birr</span></span>
          </Button>
        ) : (
          <Button
            disabled={!canPlace}
            onClick={tryPlace}
            className="flex-1 h-16 text-base font-black bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50 rounded-xl flex flex-col gap-0 leading-tight"
            style={{ background: canPlace ? "linear-gradient(180deg, hsl(142 76% 50%), hsl(142 76% 40%))" : undefined }}
          >
            <span>{label.toUpperCase()}</span>
            <span className="text-lg tabular-nums">
              {hasActiveBet
                ? (cashedOut ? "Cashed ✓" : "In Flight")
                : phase === "flying" ? "Wait next" : <>{amount.toFixed(2)} <span className="text-xs">Birr</span></>}
            </span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1">
        {PRESETS.map(p => (
          <Button
            key={p}
            variant="ghost"
            size="sm"
            onClick={() => setAmount(Math.min(available, p))}
            className="h-7 text-xs bg-background/40 hover:bg-background/70 rounded-md"
          >
            +{p}
          </Button>
        ))}
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
