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

    // Upbeat electronic groove — driving bass + plucky lead
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    filter.Q.value = 1.2;
    filter.connect(masterGain).connect(ctx.destination);

    // Sub bass drone (root note)
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sawtooth";
    bass.frequency.value = 82.4; // E2
    bassGain.gain.value = 0.15;
    bass.connect(bassGain).connect(filter);
    bass.start();

    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [{ osc: bass, gain: bassGain }];

    // Driving synth riff (E minor groove) — faster, more energetic
    const riff = [329.63, 392.00, 493.88, 587.33, 659.25, 587.33, 493.88, 392.00,
                  329.63, 392.00, 493.88, 659.25, 783.99, 659.25, 493.88, 392.00];
    let step = 0;
    const tickArp = () => {
      const now = ctx.currentTime;
      const f = riff[step % riff.length];
      // Lead pluck
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 0.2);

      // Kick on every 4th step
      if (step % 4 === 0) {
        const k = ctx.createOscillator();
        const kg = ctx.createGain();
        k.type = "sine";
        k.frequency.setValueAtTime(140, now);
        k.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        kg.gain.setValueAtTime(0.35, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        k.connect(kg).connect(ctx.destination);
        k.start(now);
        k.stop(now + 0.15);
      }
      // Hi-hat on off-beats
      if (step % 2 === 1) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const hg = ctx.createGain();
        hg.gain.value = 0.06;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 6000;
        src.connect(hp).connect(hg).connect(ctx.destination);
        src.start(now);
      }
      step++;
    };
    tickArp();
    const interval = window.setInterval(tickArp, 130);

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
