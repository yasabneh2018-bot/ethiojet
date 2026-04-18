import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus, Zap } from "lucide-react";
import { fmtMoney } from "@/lib/jetx";
import type { GamePhase } from "./JetXCanvas";

interface Props {
  balance: number;
  phase: GamePhase;
  currentMult: number;
  onPlaceBet: (amount: number, autoCashout: number | null) => void;
  onCashout: () => void;
  hasActiveBet: boolean;
  cashedOut: boolean;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
}

const PRESETS = [10, 50, 100, 500];

export const BetControls = ({
  balance, phase, currentMult, onPlaceBet, onCashout,
  hasActiveBet, cashedOut, autoPlay, setAutoPlay,
}: Props) => {
  const [amount, setAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [autoCashoutOn, setAutoCashoutOn] = useState(false);
  const [pendingBet, setPendingBet] = useState(false);

  // Auto-place when waiting phase if autoPlay on and nothing pending
  useEffect(() => {
    if (autoPlay && phase === "waiting" && !hasActiveBet && !pendingBet) {
      if (amount <= balance && amount > 0) {
        setPendingBet(true);
        onPlaceBet(amount, autoCashoutOn ? autoCashout : null);
      }
    }
    if (phase === "flying" && pendingBet) setPendingBet(false);
    if (phase === "crashed" && pendingBet) setPendingBet(false);
  }, [autoPlay, phase, hasActiveBet, pendingBet, amount, balance, autoCashout, autoCashoutOn, onPlaceBet]);

  const adjust = (delta: number) => setAmount(a => Math.max(1, Math.min(balance, +(a + delta).toFixed(2))));
  const mult2 = (m: number) => setAmount(a => Math.max(1, Math.min(balance, +(a * m).toFixed(2))));

  const canPlace = phase === "waiting" && !hasActiveBet && amount > 0 && amount <= balance;
  const canCashout = phase === "flying" && hasActiveBet && !cashedOut;

  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card space-y-4">
      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bet Amount</Label>
          <span className="text-xs text-muted-foreground">Balance: <span className="text-primary-glow font-semibold">{fmtMoney(balance)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="secondary" onClick={() => adjust(-1)} className="shrink-0"><Minus className="w-4 h-4" /></Button>
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, +e.target.value))}
            className="text-center text-lg font-bold tabular-nums bg-input"
            min={1}
            max={balance}
            step={1}
          />
          <Button size="icon" variant="secondary" onClick={() => adjust(1)} className="shrink-0"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {PRESETS.map(p => (
            <Button key={p} variant="outline" size="sm" onClick={() => setAmount(Math.min(balance, p))} className="text-xs">
              {p}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          <Button variant="outline" size="sm" onClick={() => mult2(0.5)} className="text-xs">½</Button>
          <Button variant="outline" size="sm" onClick={() => mult2(2)} className="text-xs">2×</Button>
          <Button variant="outline" size="sm" onClick={() => setAmount(Math.floor(balance))} className="text-xs">MAX</Button>
        </div>
      </div>

      {/* Auto cashout */}
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

      {/* Action button */}
      {canCashout ? (
        <Button
          onClick={onCashout}
          className="w-full h-16 text-xl font-black bg-gradient-win text-success-foreground hover:opacity-90 shadow-accent-glow animate-pulse-glow"
        >
          CASH OUT {(amount * currentMult).toFixed(2)}
        </Button>
      ) : (
        <Button
          disabled={!canPlace}
          onClick={() => onPlaceBet(amount, autoCashoutOn ? autoCashout : null)}
          className="w-full h-16 text-xl font-black bg-gradient-jet text-primary-foreground hover:opacity-90 shadow-glow disabled:opacity-50 disabled:shadow-none"
        >
          {hasActiveBet
            ? (cashedOut ? "Cashed Out ✓" : "Bet Placed — In Flight")
            : phase === "flying" ? "Wait for next round" : "PLACE BET"}
        </Button>
      )}
    </div>
  );
};
