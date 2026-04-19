import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { fmtBirr } from "@/lib/jetx";

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
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, [event]);

  if (!event) return null;

  return (
    <div
      className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
      }`}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-success/50 shadow-lg"
        style={{
          background: "linear-gradient(90deg, hsl(142 76% 35% / 0.95), hsl(142 76% 45% / 0.95))",
          boxShadow: "0 0 25px hsl(142 76% 50% / 0.55)",
        }}
      >
        <Trophy className="w-4 h-4 text-white" />
        <span className="text-white font-extrabold text-sm sm:text-base tabular-nums">
          +{fmtBirr(event.amount)} · {event.multiplier.toFixed(2)}x
        </span>
      </div>
    </div>
  );
};
