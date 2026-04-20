import { useCallback, useEffect, useRef } from "react";

// Lightweight WebAudio sound effects — no external assets needed.
export const useGameSounds = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const flightRef = useRef<{
    nodes: { osc: OscillatorNode; gain: GainNode }[];
    masterGain: GainNode;
    interval: number;
  } | null>(null);

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
    if (!ctx || flightRef.current) return;

    // Master gain + soft lowpass for a warm, musical feel
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.7;
    filter.connect(masterGain).connect(ctx.destination);

    // Bass pad (sustained chord — A minor: A2, C3, E3)
    const padFreqs = [110, 130.81, 164.81];
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    padFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      // Slight detune for richness
      osc.detune.value = i === 1 ? 4 : i === 2 ? -3 : 0;
      gain.gain.value = 0.22;
      osc.connect(gain).connect(filter);
      osc.start();
      nodes.push({ osc, gain });
    });

    // Arpeggio melody (A minor pentatonic) — gentle 8th notes
    const arpFreqs = [440, 523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25];
    let step = 0;
    const tickArp = () => {
      const now = ctx.currentTime;
      const f = arpFreqs[step % arpFreqs.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 0.35);
      step++;
    };
    tickArp();
    const interval = window.setInterval(tickArp, 220);

    flightRef.current = { nodes, masterGain, interval };
  }, [getCtx]);

  const stopFlight = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !flightRef.current) return;
    const { nodes, masterGain, interval } = flightRef.current;
    window.clearInterval(interval);
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    nodes.forEach(({ osc }) => {
      try { osc.stop(ctx.currentTime + 0.3); } catch {}
    });
    flightRef.current = null;
  }, [getCtx]);

  const playCrash = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
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
