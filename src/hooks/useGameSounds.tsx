import { useCallback, useEffect, useRef } from "react";

// Lightweight WebAudio sound effects — no external assets needed.
export const useGameSounds = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const flightOscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, []);

  // Unlock audio on first user gesture
  useEffect(() => {
    const unlock = () => { getCtx(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [getCtx]);

  const startFlight = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || flightOscRef.current) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    flightOscRef.current = { osc, gain };
  }, [getCtx]);

  const stopFlight = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !flightOscRef.current) return;
    const { osc, gain } = flightOscRef.current;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.2);
    flightOscRef.current = null;
  }, [getCtx]);

  const playCrash = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    // Noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }, [getCtx]);

  const playCashout = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const notes = [880, 1175, 1568];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  }, [getCtx]);

  return { startFlight, stopFlight, playCrash, playCashout };
};
