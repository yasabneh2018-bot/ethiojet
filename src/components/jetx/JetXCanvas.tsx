import { useEffect, useRef, useState } from "react";
import { multiplierAt, generateCrashMultiplier } from "@/lib/jetx";
import jetPlane from "@/assets/jet-plane.png";

export type GamePhase = "waiting" | "flying" | "crashed";

interface Props {
  onPhaseChange: (phase: GamePhase, currentMult: number, crashMult: number) => void;
  onTick: (mult: number) => void;
  onRoundEnd?: (crash: number) => void;
}

export const JetXCanvas = ({ onPhaseChange, onTick, onRoundEnd }: Props) => {
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
          onRoundEnd?.(crashRef.current);
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

  // Plane progress along arc — viewBox is 1000 x 600
  const VW = 1000, VH = 600;
  const progress = Math.min(1, Math.log(mult) / Math.log(8)); // saturate around 8x
  // Anchor / control / endpoint of an exponential-looking curve
  const x0 = 30, y0 = VH - 20;
  const xEnd = 60 + progress * (VW - 120);
  const yEnd = (VH - 30) - progress * (VH - 80);
  // Quadratic control point that creates the upward curl
  const cx = x0 + (xEnd - x0) * 0.55;
  const cy = y0 - (y0 - yEnd) * 0.15;

  // Bezier point at t=1 is (xEnd,yEnd). We need angle at endpoint for the plane rotation.
  const dx = 2 * (xEnd - cx);
  const dy = 2 * (yEnd - cy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // negative when going up-right

  // Crash continuation — plane arcs down off-screen
  const crashOffset = phase === "crashed" ? 1 : 0;
  const planeX = xEnd + crashOffset * 200;
  const planeY = yEnd + crashOffset * 250;
  const planeRot = phase === "crashed" ? 70 : angle;

  const trailPath = `M ${x0} ${y0} Q ${cx} ${cy}, ${xEnd} ${yEnd}`;
  const fillPath = `${trailPath} L ${xEnd} ${VH} L ${x0} ${VH} Z`;

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[16/8] rounded-2xl overflow-hidden bg-black border border-border shadow-card">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Stars */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(1.5px 1.5px at 20% 30%, white, transparent), radial-gradient(1px 1px at 70% 60%, white, transparent), radial-gradient(2px 2px at 40% 80%, white, transparent), radial-gradient(1px 1px at 85% 20%, white, transparent), radial-gradient(1.5px 1.5px at 55% 15%, white, transparent), radial-gradient(1px 1px at 15% 70%, white, transparent), radial-gradient(1.5px 1.5px at 90% 50%, white, transparent)",
          backgroundSize: "400px 400px",
        }}
      />

      {/* Trail SVG */}
      {phase !== "waiting" && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trailFill" x1="0" y1="100%" x2="0" y2="0%">
              <stop offset="0%" stopColor="hsl(0 90% 55%)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="hsl(0 90% 55%)" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#trailFill)" />
          <path
            d={trailPath}
            stroke="hsl(0 95% 60%)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 6px hsl(0 95% 55%))" }}
          />
        </svg>
      )}

      {/* Multiplier */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {phase === "waiting" && (
            <>
              <div className="text-white/60 text-xs sm:text-sm uppercase tracking-widest mb-2">Next round in</div>
              <div className="text-6xl sm:text-8xl font-black text-white tabular-nums" style={{ textShadow: "0 0 30px rgba(255,255,255,0.4)" }}>
                {waitTimer}
              </div>
            </>
          )}
          {phase === "flying" && (
            <div
              className="text-7xl sm:text-9xl font-black text-white tabular-nums"
              style={{ textShadow: "0 0 40px rgba(255,255,255,0.5), 0 4px 0 rgba(0,0,0,0.4)" }}
            >
              {mult.toFixed(2)}<span className="text-5xl sm:text-7xl">x</span>
            </div>
          )}
          {phase === "crashed" && (
            <>
              <div className="text-destructive text-2xl font-bold mb-2 uppercase tracking-widest">Flew Away!</div>
              <div className="text-7xl sm:text-9xl font-black text-destructive tabular-nums" style={{ textShadow: "0 0 30px hsl(0 90% 55% / 0.7)" }}>
                {crashMult.toFixed(2)}x
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plane */}
      {phase !== "waiting" && (
        <img
          src={jetPlane}
          alt="JetX plane"
          className="absolute pointer-events-none select-none transition-opacity duration-200"
          style={{
            // Position based on viewBox-relative percentages
            left: `${(planeX / VW) * 100}%`,
            top: `${(planeY / VH) * 100}%`,
            width: "clamp(90px, 14vw, 180px)",
            transform: `translate(-65%, -55%) rotate(${planeRot}deg)`,
            transformOrigin: "center",
            filter: "drop-shadow(0 8px 20px rgba(255,20,120,0.5))",
            opacity: phase === "crashed" ? 0 : 1,
            transition: "opacity 0.6s ease-out, top 0.05s linear, left 0.05s linear",
          }}
          draggable={false}
        />
      )}
    </div>
  );
};
