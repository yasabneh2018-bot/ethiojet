import { useEffect, useState } from "react";
import { getTournamentInfo, fmtCountdown } from "@/lib/jetx";
import { Trophy } from "lucide-react";

export const TournamentBanner = () => {
  const [info, setInfo] = useState(getTournamentInfo());
  useEffect(() => {
    const iv = setInterval(() => setInfo(getTournamentInfo()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={`rounded-2xl p-4 border shadow-card ${info.isActive ? "bg-gradient-win border-success animate-pulse-glow" : "bg-gradient-card border-border"}`}>
      <div className="flex items-center gap-3">
        <Trophy className={`w-6 h-6 ${info.isActive ? "text-success-foreground" : "text-primary-glow"}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs uppercase tracking-widest font-semibold ${info.isActive ? "text-success-foreground/80" : "text-muted-foreground"}`}>
            {info.isActive ? "🔴 Tournament LIVE" : "Next Tournament"}
          </div>
          <div className={`text-lg font-black tabular-nums ${info.isActive ? "text-success-foreground" : "text-foreground"}`}>
            {info.isActive
              ? `Ends in ${fmtCountdown(info.msUntilEnd)}`
              : `${fmtCountdown(info.msUntilStart)}`}
          </div>
          <div className={`text-xs ${info.isActive ? "text-success-foreground/70" : "text-muted-foreground"}`}>
            {info.start.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })} • 30 min • Fri & Sun 3 PM
          </div>
        </div>
      </div>
    </div>
  );
};
