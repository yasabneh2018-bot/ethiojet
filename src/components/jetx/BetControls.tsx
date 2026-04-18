import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus, Zap } from "lucide-react";
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
  reservedByOther?: number; // birr already reserved by the other panel this round
}

const PRESETS = [5, 10, 50, 100];

export const BetControls = ({
  label, balanceBirr, phase, currentMult, onPlaceBet, onCashout,
  hasActiveBet, cashedOut, autoPlay, setAutoPlay, reservedByOther = 0,
}: Props) => {
  const [amount, setAmount] = useState(MIN_BET_BIRR);
  const [autoCashout, setAutoCashout] = useState(2.0);
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
    <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-bold text-primary-glow">{label}</span>
        <span className="text-xs text-muted-foreground">Avail: <span className="text-primary-glow font-semibold">{fmtBirr(available)}</span></span>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Bet (Birr)</Label>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="secondary" onClick={() => adjust(-1)} className="shrink-0"><Minus className="w-4 h-4" /></Button>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, +e.target.value))}
            className="text-center text-lg font-bold tabular-nums bg-input"
            min={MIN_BET_BIRR}
            step={1}
          />
          <Button size="icon" variant="secondary" onClick={() => adjust(1)} className="shrink-0"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {PRESETS.map(p => (
            <Button key={p} variant="outline" size="sm" onClick={() => setAmount(Math.min(available, p))} className="text-xs">
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Auto Cashout
          </Label>
          <Switch checked={autoCashoutOn} onCheckedChange={setAutoCashoutOn} />
        </div>
        <Input
          type="number"
          value={autoCashout}
          onChange={e => setAutoCashout(Math.max(1.01, +e.target.value))}
          step={0.1}
          min={1.01}
          disabled={!autoCashoutOn}
          className="text-center font-bold tabular-nums bg-input"
        />
        <div className="flex items-center justify-between pt-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Auto Play</Label>
          <Switch checked={autoPlay} onCheckedChange={setAutoPlay} />
        </div>
      </div>

      {canCashout ? (
        <Button
          onClick={onCashout}
          className="w-full h-14 text-lg font-black bg-gradient-win text-success-foreground hover:opacity-90 shadow-accent-glow animate-pulse-glow"
        >
          CASH OUT {(amount * currentMult).toFixed(2)}
        </Button>
      ) : (
        <Button
          disabled={!canPlace}
          onClick={tryPlace}
          className="w-full h-14 text-lg font-black bg-gradient-jet text-primary-foreground hover:opacity-90 shadow-glow disabled:opacity-50 disabled:shadow-none"
        >
          {hasActiveBet
            ? (cashedOut ? "Cashed Out ✓" : "In Flight")
            : phase === "flying" ? "Wait next round" : "PLACE BET"}
        </Button>
      )}
    </div>
  );
};
