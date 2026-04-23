import { useEffect, useRef, useState } from "react";
import { multiplierAt, generateCrashMultiplier } from "@/lib/jetx";
import jetPlane from "@/assets/jet-plane-full.png";

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

  // Stronger up/down sway throughout the whole flight (more dramatic at the right edge)
  const bobAmp = atRightEdge ? 95 : 38;
  const bobSpeed = atRightEdge ? 360 : 480;
  const bob = phase === "flying" ? Math.sin(elapsed / bobSpeed) * bobAmp : 0;
  const rawYEnd = (VH - 35) - (climbBase + climbBoost) + bob;

  const xEnd = Math.min(xEndLimit, Math.max(0, rawXEnd));
  const yEnd = Math.max(TIP_MARGIN_Y_TOP, Math.min(VH - TIP_MARGIN_Y_BOTTOM, rawYEnd));

  // Lock plane to a fixed shallow ~3° nose-up tilt
  const planeRot = phase === "flying" ? -3 : 0;
  // Trail (red envelope) starts attached to the plane and grows behind it as it climbs.
  // We anchor the curve's control point closer to the start so the tail hugs the plane
  // from the very first frame instead of rising ahead of it.
  const cx = x0 + (xEnd - x0) * 0.55;
  const cy = y0 - (y0 - yEnd) * 0.15;
  const trailPath = `M ${x0} ${y0} Q ${cx} ${cy}, ${xEnd} ${yEnd}`;
  const fillPath = `${trailPath} L ${xEnd} ${VH} L ${x0} ${VH} Z`;

  const waitProgress = 1 - waitMs / (WAIT_SECONDS * 1000);
  const waitSecs = Math.ceil(waitMs / 1000);

  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/8.5] overflow-hidden shadow-card"
      style={{
        background:
          "linear-gradient(180deg, hsl(205 85% 55%) 0%, hsl(210 80% 45%) 45%, hsl(215 75% 30%) 100%)",
      }}
    >
      {/* Realistic drifting clouds — layered cumulus puffs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {(() => {
          const Cloud = ({ scale = 1 }: { scale?: number }) => (
            <svg viewBox="0 0 300 120" width={300 * scale} height={120 * scale} style={{ display: "block", overflow: "visible" }}>
              <defs>
                <radialGradient id={`cg-${scale}`} cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                  <stop offset="60%" stopColor="rgba(245,250,255,0.85)" />
                  <stop offset="100%" stopColor="rgba(190,210,235,0.55)" />
                </radialGradient>
                <filter id={`cb-${scale}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              {/* shadow base */}
              <ellipse cx="150" cy="90" rx="140" ry="14" fill="rgba(60,90,140,0.25)" filter={`url(#cb-${scale})`} />
              {/* puffs */}
              <g filter={`url(#cb-${scale})`}>
                <circle cx="70" cy="75" r="32" fill={`url(#cg-${scale})`} />
                <circle cx="110" cy="55" r="40" fill={`url(#cg-${scale})`} />
                <circle cx="155" cy="45" r="48" fill={`url(#cg-${scale})`} />
                <circle cx="200" cy="55" r="42" fill={`url(#cg-${scale})`} />
                <circle cx="240" cy="72" r="34" fill={`url(#cg-${scale})`} />
                <circle cx="135" cy="78" r="30" fill={`url(#cg-${scale})`} />
                <circle cx="185" cy="80" r="32" fill={`url(#cg-${scale})`} />
              </g>
              {/* highlight */}
              <ellipse cx="150" cy="38" rx="55" ry="10" fill="rgba(255,255,255,0.7)" filter={`url(#cb-${scale})`} />
            </svg>
          );
          // Far layer (slow, small, hazy)
          const farClouds = [
            { left: "5%", top: "8%", scale: 0.55, opacity: 0.55 },
            { left: "32%", top: "4%", scale: 0.7, opacity: 0.5 },
            { left: "60%", top: "10%", scale: 0.6, opacity: 0.55 },
            { left: "85%", top: "6%", scale: 0.65, opacity: 0.5 },
          ];
          // Mid layer
          const midClouds = [
            { left: "12%", top: "22%", scale: 0.85, opacity: 0.85 },
            { left: "48%", top: "18%", scale: 1.0, opacity: 0.9 },
            { left: "78%", top: "26%", scale: 0.9, opacity: 0.85 },
          ];
          // Near layer (lower part, larger)
          const nearClouds = [
            { left: "8%", top: "62%", scale: 1.1, opacity: 0.75 },
            { left: "55%", top: "70%", scale: 1.25, opacity: 0.7 },
            { left: "90%", top: "58%", scale: 1.0, opacity: 0.7 },
          ];
          return (
            <>
              <div className="absolute inset-0" style={{ animation: "clouds-drift-slow 180s linear infinite" }}>
                {farClouds.map((c, i) => (
                  <div key={`f${i}`} className="absolute" style={{ left: c.left, top: c.top, opacity: c.opacity, filter: "blur(0.5px)" }}>
                    <Cloud scale={c.scale} />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0" style={{ animation: "clouds-drift-mid 110s linear infinite" }}>
                {midClouds.map((c, i) => (
                  <div key={`m${i}`} className="absolute" style={{ left: c.left, top: c.top, opacity: c.opacity }}>
                    <Cloud scale={c.scale} />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0" style={{ animation: "clouds-drift-fast 70s linear infinite" }}>
                {nearClouds.map((c, i) => (
                  <div key={`n${i}`} className="absolute" style={{ left: c.left, top: c.top, opacity: c.opacity }}>
                    <Cloud scale={c.scale} />
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Drifting particles (wind motion) */}
      <div className="absolute inset-0 bg-particles pointer-events-none opacity-40" />

      {/* Center light beam removed per request */}

      {/* Left axis ruler — white dots moving top → bottom */}
      <div className="absolute left-0 top-0 bottom-0 w-3 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-x-0"
          style={{
            top: 0,
            height: "200%",
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.85) 1.4px, transparent 2px)",
            backgroundSize: "100% 28px",
            backgroundRepeat: "repeat-y",
            animation: "axis-dots-down 14s linear infinite",
          }}
        />
      </div>

      {/* Bottom axis ruler — white dots moving right → left */}
      <div className="absolute left-0 right-0 bottom-0 h-3 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-y-0"
          style={{
            left: 0,
            width: "200%",
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.85) 1.4px, transparent 2px)",
            backgroundSize: "28px 100%",
            backgroundRepeat: "repeat-x",
            animation: "axis-dots-left 14s linear infinite",
          }}
        />
      </div>

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
              className="text-5xl sm:text-7xl font-black tabular-nums"
              style={{
                background: "linear-gradient(180deg, hsl(48 100% 70%), hsl(42 100% 50%) 55%, hsl(35 95% 40%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 18px hsl(45 100% 55% / 0.7)) drop-shadow(0 2px 0 rgba(0,0,0,0.4))",
              }}
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

      {/* Plane: visible while flying, exits fast on crash, parked during waiting */}
      {(() => {
        const isFlying = phase === "flying";
        const isCrashed = phase === "crashed";
        const PLANE_MARGIN_X = 150;
        const PLANE_MARGIN_Y_TOP = 110;
        const PLANE_MARGIN_Y_BOTTOM = 90;
        const clampedX = Math.min(VW - PLANE_MARGIN_X, Math.max(0, xEnd));
        const clampedY = Math.max(PLANE_MARGIN_Y_TOP, Math.min(VH - PLANE_MARGIN_Y_BOTTOM, yEnd));
        // On crash: shoot off the right edge fast and fade out
        const px = isCrashed ? VW + 350 : isFlying ? clampedX : x0;
        const py = isCrashed ? Math.max(PLANE_MARGIN_Y_TOP, clampedY - 80) : isFlying ? clampedY : y0;
        return (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              left: `${(px / VW) * 100}%`,
              top: `${(py / VH) * 100}%`,
              width: "clamp(140px, 16vw, 230px)",
              transform: `translate(-33%, -50%) rotate(${isCrashed ? -8 : isFlying ? planeRot : 0}deg)`,
              transformOrigin: "left bottom",
              filter: "drop-shadow(0 8px 20px rgba(255,20,120,0.5))",
              opacity: isCrashed ? 0 : 1,
              transition: isCrashed
                ? "left 0.45s cubic-bezier(0.5,0,0.9,0.4), top 0.45s ease-out, opacity 0.5s ease-out 0.2s"
                : "top 0.08s linear, left 0.08s linear",
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
