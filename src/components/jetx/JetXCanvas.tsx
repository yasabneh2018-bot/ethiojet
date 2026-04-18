import { useEffect, useRef, useState } from "react";
import { Plane } from "lucide-react";
import { multiplierAt, generateCrashMultiplier } from "@/lib/jetx";

export type GamePhase = "waiting" | "flying" | "crashed";

interface Props {
  onPhaseChange: (phase: GamePhase, currentMult: number, crashMult: number) => void;
  onTick: (mult: number) => void;
}

export const JetXCanvas = ({ onPhaseChange, onTick }: Props) => {
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [mult, setMult] = useState(1.0);
  const [crashMult, setCrashMult] = useState(0);
  const [waitTimer, setWaitTimer] = useState(5);
  const phaseRef = useRef<GamePhase>("waiting");
  const crashRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const begin = () => {
      const cm = generateCrashMultiplier();
      crashRef.current = cm;
      setCrashMult(cm);
      setMult(1.0);
      startRef.current = performance.now();
      phaseRef.current = "flying";
      setPhase("flying");
      onPhaseChange("flying", 1.0, cm);

      const loop = () => {
        const m = multiplierAt(performance.now() - startRef.current);
        if (m >= crashRef.current) {
          setMult(crashRef.current);
          phaseRef.current = "crashed";
          setPhase("crashed");
          onPhaseChange("crashed", crashRef.current, crashRef.current);
          // wait 4s then restart
          let w = 5;
          setWaitTimer(w);
          const iv = setInterval(() => {
            w--;
            setWaitTimer(w);
            if (w <= 0) {
              clearInterval(iv);
              phaseRef.current = "waiting";
              setPhase("waiting");
              onPhaseChange("waiting", 1.0, 0);
              setTimeout(begin, 50);
            }
          }, 1000);
          return;
        }
        setMult(m);
        onTick(m);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    // initial wait
    let w = 5;
    setWaitTimer(w);
    setPhase("waiting");
    onPhaseChange("waiting", 1.0, 0);
    const iv = setInterval(() => {
      w--;
      setWaitTimer(w);
      if (w <= 0) { clearInterval(iv); begin(); }
    }, 1000);
    return () => {
      clearInterval(iv);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // jet position based on multiplier
  const progress = Math.min(1, Math.log(mult) / Math.log(10));
  const fx = `${10 + progress * 70}%`;
  const fy = `${-progress * 65}%`;

  return (
    <div className="relative w-full h-[340px] sm:h-[420px] rounded-2xl overflow-hidden bg-gradient-card shadow-card border border-border">
      {/* Stars */}
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(1px 1px at 70% 60%, white, transparent), radial-gradient(1.5px 1.5px at 40% 80%, white, transparent), radial-gradient(1px 1px at 85% 20%, white, transparent), radial-gradient(2px 2px at 55% 15%, white, transparent)",
          backgroundSize: "300px 300px"
        }} />

      {/* Trail */}
      {phase === "flying" && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trail" x1="0" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path
            d={`M 10 ${100} Q ${10 + progress * 35} ${100 - progress * 30}, ${10 + progress * 70} ${35 - progress * 20}`}
            stroke="url(#trail)" strokeWidth="2" fill="none"
          />
        </svg>
      )}

      {/* Multiplier */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {phase === "waiting" && (
            <>
              <div className="text-muted-foreground text-sm uppercase tracking-widest mb-2">Next round in</div>
              <div className="text-6xl sm:text-7xl font-black text-gradient-jet glow-text">{waitTimer}</div>
            </>
          )}
          {phase === "flying" && (
            <div className={`text-6xl sm:text-8xl font-black text-gradient-jet glow-text tabular-nums ${mult > 5 ? "animate-pulse" : ""}`}>
              {mult.toFixed(2)}<span className="text-4xl sm:text-5xl">x</span>
            </div>
          )}
          {phase === "crashed" && (
            <>
              <div className="text-destructive text-2xl font-bold mb-2 uppercase tracking-widest">Flew Away!</div>
              <div className="text-6xl sm:text-7xl font-black text-destructive tabular-nums">{crashMult.toFixed(2)}x</div>
            </>
          )}
        </div>
      </div>

      {/* Jet */}
      {phase !== "waiting" && (
        <div
          className={`absolute bottom-4 left-0 transition-transform duration-100 ${phase === "crashed" ? "" : "animate-jet-shake"}`}
          style={{
            transform: `translate(${fx}, ${fy}) rotate(${phase === "crashed" ? 70 : -25}deg)`,
            filter: "drop-shadow(0 0 20px hsl(var(--primary)))",
          }}
        >
          <Plane className="w-12 h-12 sm:w-16 sm:h-16 text-primary-glow" fill="currentColor" />
        </div>
      )}
    </div>
  );
};
