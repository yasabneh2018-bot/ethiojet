import { useEffect, useRef, useState } from "react";
import { multiplierAt, generateCrashMultiplier } from "@/lib/jetx";
import jetBody from "@/assets/jet-body.png";
import jetPropeller from "@/assets/jet-propeller.png";

export type GamePhase = "waiting" | "flying" | "crashed";

interface Props {
  onPhaseChange: (phase: GamePhase, currentMult: number, crashMult: number) => void;
  onTick: (mult: number) => void;
  onRoundEnd?: (crash: number) => void;
}

const WAIT_SECONDS = 5;

export const JetXCanvas = ({ onPhaseChange, onTick, onRoundEnd }: Props) => {
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [mult, setMult] = useState(1.0);
  const [crashMult, setCrashMult] = useState(0);
  const [waitMs, setWaitMs] = useState(WAIT_SECONDS * 1000); // for smooth bar
  const phaseRef = useRef<GamePhase>("waiting");
  const crashRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef<number>();
  const waitStartRef = useRef(0);
  const waitRafRef = useRef<number>();

  useEffect(() => {
    const runWait = (afterMs: number, onDone: () => void) => {
      waitStartRef.current = performance.now();
      const tick = () => {
        const elapsed = performance.now() - waitStartRef.current;
        const remaining = Math.max(0, afterMs - elapsed);
        setWaitMs(remaining);
        if (remaining <= 0) { onDone(); return; }
        waitRafRef.current = requestAnimationFrame(tick);
      };
      waitRafRef.current = requestAnimationFrame(tick);
    };

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
          // Brief crash flash, then go straight to waiting + progress bar
          setTimeout(() => {
            phaseRef.current = "waiting";
            setPhase("waiting");
            onPhaseChange("waiting", 1.0, 0);
            setWaitMs(WAIT_SECONDS * 1000);
            runWait(WAIT_SECONDS * 1000, () => setTimeout(begin, 50));
          }, 900);
          return;
        }
        setMult(m);
        onTick(m);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    setPhase("waiting");
    onPhaseChange("waiting", 1.0, 0);
    setWaitMs(WAIT_SECONDS * 1000);
    runWait(WAIT_SECONDS * 1000, begin);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (waitRafRef.current) cancelAnimationFrame(waitRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plane progress along arc — viewBox is 1000 x 600
  // Crashed: snap back to start instantly (plane exits fast & waits for next round)
  const effectiveMult = phase === "crashed" ? 1 : mult;
  const VW = 1000, VH = 600;
  const progress = Math.min(1, Math.log(effectiveMult) / Math.log(8));
  const x0 = 30, y0 = VH - 20;
  const xEnd = 60 + progress * (VW - 120);

  // Bobbing motion — gentle up/down sine wave that grows with multiplier
  const bobAmp = 12 + progress * 40; // taller bob as multiplier grows
  const bob = phase === "flying"
    ? Math.sin(performance.now() / 280) * bobAmp
    : 0;

  // Climb height grows with multiplier → red envelope gets taller
  const climbBase = VH * 0.18;
  const climbBoost = progress * VH * 0.45; // envelope rises significantly
  const yEnd = (VH - 30) - (climbBase + climbBoost) + bob;

  const cx = x0 + (xEnd - x0) * 0.6;
  const cy = y0 - (y0 - yEnd) * 0.35;

  const dx = 2 * (xEnd - cx);
  const dy = 2 * (yEnd - cy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const planeRot = angle;
  const trailPath = `M ${x0} ${y0} Q ${cx} ${cy}, ${xEnd} ${yEnd}`;
  const fillPath = `${trailPath} L ${xEnd} ${VH} L ${x0} ${VH} Z`;

  const waitProgress = 1 - waitMs / (WAIT_SECONDS * 1000);
  const waitSecs = Math.ceil(waitMs / 1000);

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[16/8] rounded-2xl overflow-hidden bg-black border border-border shadow-card">
      {/* Brighter grid */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Drifting particles (wind motion) */}
      <div className="absolute inset-0 bg-particles pointer-events-none opacity-70" />
      {/* Wind streaks */}
      {phase === "flying" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{
                top: `${15 + i * 18}%`,
                left: 0,
                right: 0,
                animation: `wind-streak ${1.2 + i * 0.3}s linear infinite`,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Trail SVG (only while flying) */}
      {phase === "flying" && (
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

      {/* Center content: multiplier / crashed flash / waiting progress bar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        <div className="text-center w-full max-w-md">
          {phase === "waiting" && (
            <div className="space-y-3">
              <div className="h-3 sm:h-4 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${waitProgress * 100}%`,
                    background: "linear-gradient(90deg, hsl(0 90% 55%), hsl(15 95% 60%))",
                    boxShadow: "0 0 20px hsl(0 90% 55% / 0.7)",
                    transition: "width 80ms linear",
                  }}
                />
              </div>
            </div>
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
              <div className="text-destructive text-xl sm:text-2xl font-bold mb-2 uppercase tracking-widest">Flew Away!</div>
              <div className="text-6xl sm:text-8xl font-black text-destructive tabular-nums" style={{ textShadow: "0 0 30px hsl(0 90% 55% / 0.7)" }}>
                {crashMult.toFixed(2)}x
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plane: only visible while flying. Hidden during crash snap-back & waiting. */}
      {phase === "flying" && (
        <div
          className="absolute pointer-events-none select-none"
          style={{
            left: `${(xEnd / VW) * 100}%`,
            top: `${(yEnd / VH) * 100}%`,
            width: "clamp(70px, 9vw, 120px)",
            transform: `translate(-50%, -50%) rotate(${planeRot}deg) scaleX(-1)`,
            transformOrigin: "center center",
            filter: "drop-shadow(0 8px 20px rgba(255,20,120,0.5))",
            transition: "top 0.05s linear, left 0.05s linear",
          }}
        >
          <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
            <img
              src={jetBody}
              alt="JetX plane"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
            {/* Propeller pinned to the nose (left side after horizontal flip = visual front) */}
            <img
              src={jetPropeller}
              alt=""
              aria-hidden
              className="absolute"
              style={{
                width: "32%",
                left: "-4%",
                top: "50%",
                transform: "translateY(-50%)",
                animation: "spin 0.12s linear infinite",
                filter: "drop-shadow(0 0 4px rgba(255,200,80,0.6))",
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
