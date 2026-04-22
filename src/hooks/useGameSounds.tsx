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

    // Dreamy synthwave — warm pad + mellow bell arpeggio
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.8;
    filter.connect(masterGain).connect(ctx.destination);

    // Warm pad (two detuned sines for chorus feel) — A minor root
    const pad1 = ctx.createOscillator();
    const pad2 = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad1.type = "sine";
    pad2.type = "sine";
    pad1.frequency.value = 110;     // A2
    pad2.frequency.value = 110.6;   // detune
    padGain.gain.value = 0.18;
    pad1.connect(padGain);
    pad2.connect(padGain);
    padGain.connect(filter);
    pad1.start();
    pad2.start();

    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [
      { osc: pad1, gain: padGain },
      { osc: pad2, gain: padGain },
    ];

    // Mellow bell arpeggio (A minor pentatonic, slow & dreamy)
    const arp = [440.00, 523.25, 659.25, 783.99, 880.00, 783.99, 659.25, 523.25];
    let step = 0;
    const tickArp = () => {
      const now = ctx.currentTime;
      const f = arp[step % arp.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 0.6);

      // Soft shaker every other step
      if (step % 2 === 0) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.5;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const sg = ctx.createGain();
        sg.gain.value = 0.04;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 4000;
        src.connect(hp).connect(sg).connect(ctx.destination);
        src.start(now);
      }
      step++;
    };
    tickArp();
    const interval = window.setInterval(tickArp, 280);

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
