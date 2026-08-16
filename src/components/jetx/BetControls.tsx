import { useEffect, useState } from "react";
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

const QUICK = [16, 40, 80, 400];

export const BetControls = ({
  balanceBirr, phase, currentMult, onPlaceBet, onCashout, onCancelBet,
  hasActiveBet, cashedOut, autoPlay, setAutoPlay, reservedByOther = 0,
}: Props) => {
  const [amount, setAmount] = useState(5);
  const [mode, setMode] = useState<"bet" | "auto">("bet");
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
    setAmount(a => Math.max(MIN_BET_BIRR, +(a + delta).toFixed(2)));

  const tryPlace = () => {
    if (amount < MIN_BET_BIRR) { toast.error(`Minimum bet is ${MIN_BET_BIRR} Birr`); return; }
    if (betExceedsCap(amount)) { toast.error(`Bet too large — max possible win is ${MAX_WIN_BIRR.toLocaleString()} Birr`); return; }
    if (amount > available) { toast.error("Insufficient balance"); return; }
    if (phase !== "waiting") {
      setAutoPlay(true);
      toast.success(`Bet queued for next round · ${fmtBirr(amount)}`);
      return;
    }
    onPlaceBet(amount, autoCashoutOn ? autoCashout : null);
  };

  const canCashout = phase === "flying" && hasActiveBet && !cashedOut;
  const canCancel = phase === "waiting" && hasActiveBet && !cashedOut;

  const bigBtn = "w-full h-[92px] rounded-2xl border-2 flex flex-col items-center justify-center leading-tight transition-transform active:scale-[0.98]";

  return (
    <div className="rounded-2xl bg-[hsl(0_0%_11%)] border border-white/5 p-3">
      {/* Bet / Auto tabs */}
      <div className="flex justify-center mb-3">
        <div className="flex rounded-full bg-[hsl(0_0%_16%)] p-0.5">
          {(["bet", "auto"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); if (m === "bet") setAutoPlay(false); }}
              className={`px-8 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                mode === m ? "bg-[hsl(0_0%_26%)] text-white" : "text-white/60"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-start">
        {/* Left: amount + quick chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-full bg-[hsl(0_0%_16%)] px-1 h-10">
            <button
              onClick={() => adjust(-1)}
              className="w-7 h-7 rounded-full bg-[hsl(0_0%_24%)] text-white/70 flex items-center justify-center"
              aria-label="Decrease bet"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(0, +e.target.value))}
              className="flex-1 text-center text-lg font-bold tabular-nums bg-transparent border-0 h-8 px-0 text-white focus-visible:ring-0"
            />
            <button
              onClick={() => adjust(1)}
              className="w-7 h-7 rounded-full bg-[hsl(0_0%_24%)] text-white/70 flex items-center justify-center"
              aria-label="Increase bet"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map(q => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className="h-9 rounded-full bg-[hsl(0_0%_16%)] text-white/70 text-sm font-medium hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Right: big action button */}
        {canCashout ? (
          <button
            onClick={onCashout}
            className={`${bigBtn} text-white`}
            style={{ background: "hsl(33 100% 45%)", borderColor: "hsl(38 100% 62%)" }}
          >
            <span className="text-xl font-semibold">Cash Out</span>
            <span className="text-lg tabular-nums">
              {(amount * currentMult).toFixed(2)} <span className="text-sm opacity-80">ETB</span>
            </span>
          </button>
        ) : canCancel ? (
          <button
            onClick={onCancelBet}
            className={`${bigBtn} text-white`}
            style={{ background: "hsl(350 90% 45%)", borderColor: "hsl(350 90% 62%)" }}
          >
            <span className="text-xl font-semibold">Cancel</span>
          </button>
        ) : (
          <button
            onClick={tryPlace}
            className={`${bigBtn} text-white`}
            style={{ background: "hsl(122 80% 33%)", borderColor: "hsl(122 70% 55%)" }}
          >
            <span className="text-xl font-semibold">Bet</span>
            <span className="text-lg tabular-nums">
              {amount.toFixed(2)} <span className="text-sm opacity-80">ETB</span>
            </span>
          </button>
        )}
      </div>

      {mode === "auto" && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10">
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
      )}
    </div>
  );
};
