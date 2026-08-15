import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface WinEvent {
  id: number;
  amount: number;      // payout in Birr
  multiplier: number;
}

export const WinBanner = ({ event }: { event: WinEvent | null }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [event]);

  if (!event || !visible) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,640px)] px-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 rounded-full border border-success/60 bg-[hsl(120_40%_10%)] pl-4 pr-1.5 py-1.5 shadow-lg">
        <div className="flex-1 text-center leading-tight">
          <div className="text-sm text-white/90">You have cashed out!</div>
          <div className="text-base font-bold text-white tabular-nums">{event.multiplier.toFixed(2)}x</div>
        </div>
        <div className="rounded-full px-5 py-1.5 text-center bg-gradient-to-b from-[hsl(122_60%_42%)] to-[hsl(122_65%_30%)] border border-success/50">
          <div className="text-xs text-white/90">Win ETB</div>
          <div className="text-base font-bold text-white tabular-nums">{event.amount.toFixed(2)}</div>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
