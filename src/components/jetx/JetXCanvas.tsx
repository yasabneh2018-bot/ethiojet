import { useEffect, useRef, useState } from "react";
import { multiplierAt, generateCrashMultiplier } from "@/lib/jetx";
import jetPlane from "@/assets/jet-plane-full.png";

export type GamePhase = "waiting" | "flying" | "crashed";

interface Props {
  onPhaseChange: (phase: GamePhase, currentMult: number, crashMult: number) => void;
  onTick: (mult: number) => void;
  onRoundEnd?: (crash: number) => void;
}

const WAIT_SECONDS = 10;

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
  const multProgress = Math.min(1, Math.log(effectiveMult) / Math.log(8));

  // Slower, gentler launch — ease into motion instead of sprinting
  const LAUNCH_MS = 1600;
  const elapsed = phase === "flying" ? performance.now() - startRef.current : 0;
  const launchT = Math.min(1, elapsed / LAUNCH_MS);
  // ease-out quad (softer than cubic)
  const launchEase = 1 - Math.pow(1 - launchT, 2);
  // Cap launch contribution lower so plane keeps drifting forward instead of parking mid-canvas
  const launchProgress = phase === "flying" ? launchEase * 0.28 : 0;

  let progress = Math.max(launchProgress, multProgress);
  // Continuous slow drift forward so plane never freezes in the middle
  if (phase === "flying") {
    const drift = Math.min(0.25, elapsed / 22000); // up to +25% over ~22s
    progress = Math.min(1, progress + drift);
  }

  const x0 = 30, y0 = VH - 30;
  // Larger play area — envelope reaches almost the full width, but plane is clamped below
  const rawXEnd = 50 + progress * (VW - 60);

  // Climb height grows with multiplier → taller red envelope
  const climbBase = VH * 0.28;
  const climbBoost = progress * VH * 0.72;

  // Match the clamping used for the plane so envelope tip and plane stay glued
  const TIP_MARGIN_X = 150;
  const TIP_MARGIN_Y_TOP = 110;
  const TIP_MARGIN_Y_BOTTOM = 90;
  const xEndLimit = VW - TIP_MARGIN_X;
  const atRightEdge = phase === "flying" && rawXEnd >= xEndLimit;

  // Gentle vertical bobbing — slightly stronger while hugging the right edge
  const bobAmp = atRightEdge ? 30 : 14;
  const bobSpeed = atRightEdge ? 480 : 650;
  const bob = phase === "flying" ? Math.sin(elapsed / bobSpeed) * bobAmp : 0;
  const rawYEnd = (VH - 35) - (climbBase + climbBoost) + bob;

  const xEnd = Math.min(xEndLimit, Math.max(0, rawXEnd));
  const yEnd = Math.max(TIP_MARGIN_Y_TOP, Math.min(VH - TIP_MARGIN_Y_BOTTOM, rawYEnd));

  const cx = x0 + (xEnd - x0) * 0.6;
  const cy = y0 - (y0 - yEnd) * 0.35;

  // Lock plane to a fixed shallow ~2° nose-up tilt regardless of trail curve
  const planeRot = phase === "flying" ? -2 : 0;
  const trailPath = `M ${x0} ${y0} Q ${cx} ${cy}, ${xEnd} ${yEnd}`;
  const fillPath = `${trailPath} L ${xEnd} ${VH} L ${x0} ${VH} Z`;

  const waitProgress = 1 - waitMs / (WAIT_SECONDS * 1000);
  const waitSecs = Math.ceil(waitMs / 1000);

  return (
    <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/8.5] rounded-2xl overflow-hidden bg-black border border-border shadow-card">
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
              <div className="text-white/90 text-sm sm:text-base font-semibold uppercase tracking-widest">
                Waiting for next round
              </div>
              <div className="text-3xl sm:text-5xl font-bold text-white tabular-nums" style={{ textShadow: "0 0 20px hsl(0 90% 55% / 0.6)" }}>
                {waitSecs}s
              </div>
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
              className="text-5xl sm:text-7xl font-bold text-white tabular-nums"
              style={{ textShadow: "0 0 30px rgba(255,255,255,0.45), 0 2px 0 rgba(0,0,0,0.4)" }}
            >
              {mult.toFixed(2)}<span className="text-4xl sm:text-6xl">x</span>
            </div>
          )}
          {phase === "crashed" && (
            <>
              <div className="text-destructive text-base sm:text-lg font-semibold mb-2 uppercase tracking-widest">Flew Away!</div>
              <div className="text-4xl sm:text-6xl font-bold text-destructive tabular-nums" style={{ textShadow: "0 0 25px hsl(0 90% 55% / 0.7)" }}>
                {crashMult.toFixed(2)}x
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plane: visible while flying AND parked at start during waiting/crashed */}
      {(() => {
        const isFlying = phase === "flying";
        // Clamp so the WHOLE plane stays visible inside the canvas
        const PLANE_MARGIN_X = 150;
        const PLANE_MARGIN_Y_TOP = 110;
        const PLANE_MARGIN_Y_BOTTOM = 90;
        const clampedX = Math.min(VW - PLANE_MARGIN_X, Math.max(0, xEnd));
        const clampedY = Math.max(PLANE_MARGIN_Y_TOP, Math.min(VH - PLANE_MARGIN_Y_BOTTOM, yEnd));
        const px = isFlying ? clampedX : x0;
        const py = isFlying ? clampedY : y0;
        return (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              left: `${(px / VW) * 100}%`,
              top: `${(py / VH) * 100}%`,
              width: "clamp(162px, 18.9vw, 270px)",
              // Glue plane belly/tail tightly onto the envelope tip
              transform: `translate(-14%, -62%) rotate(${isFlying ? planeRot : 0}deg)`,
              transformOrigin: "left bottom",
              filter: "drop-shadow(0 8px 20px rgba(255,20,120,0.5))",
              transition: "top 0.08s linear, left 0.08s linear",
            }}
          >
            <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
              <img
                src={jetPlane}
                alt="JetX plane"
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};
