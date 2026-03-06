"use client";

/**
 * Børsbar — Sound Effects Manager
 *
 * Uses Web Audio API to generate sounds without requiring audio files.
 * Handles browser autoplay policies with user interaction requirement.
 */

type SoundType = "sale" | "bell" | "crash" | "bullrun" | "happyhour" | "chaos" | "tick";

interface SoundManagerState {
  muted: boolean;
  volume: number;
  initialized: boolean;
}

let audioContext: AudioContext | null = null;
let state: SoundManagerState = {
  muted: false,
  volume: 0.5,
  initialized: false,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Initialize audio context (must be called from user interaction).
 */
export function initializeAudio() {
  try {
    getAudioContext();
    state = { ...state, initialized: true };
    notifyListeners();
  } catch {
    console.warn("Web Audio API not supported");
  }
}

/**
 * Set mute state.
 */
export function setMuted(muted: boolean) {
  state = { ...state, muted };
  notifyListeners();
}

/**
 * Set volume (0.0 - 1.0).
 */
export function setVolume(volume: number) {
  state = { ...state, volume: Math.max(0, Math.min(1, volume)) };
  notifyListeners();
}

export function getState(): SoundManagerState {
  return { ...state };
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Play a synthesized sound effect.
 */
export function playSound(type: SoundType) {
  if (state.muted || !state.initialized) return;

  try {
    const ctx = getAudioContext();
    const vol = state.volume;

    switch (type) {
      case "sale":
        playChaChingSound(ctx, vol);
        break;
      case "bell":
        playBellSound(ctx, vol);
        break;
      case "crash":
        playCrashSound(ctx, vol);
        break;
      case "bullrun":
        playBullRunSound(ctx, vol);
        break;
      case "happyhour":
        playHappyHourSound(ctx, vol);
        break;
      case "chaos":
        playChaosSound(ctx, vol);
        break;
      case "tick":
        playTickSound(ctx, vol);
        break;
    }
  } catch {
    // Silently fail
  }
}

// ─── Sound Generators (Web Audio API synthesis) ────────

function playChaChingSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  // Two quick high-pitched tones
  [0, 0.12].forEach((offset) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, now + offset);
    osc.frequency.exponentialRampToValueAtTime(3000, now + offset + 0.1);
    osc.connect(gain);
    osc.start(now + offset);
    osc.stop(now + offset + 0.15);
  });
}

function playBellSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

  // NYSE-style bell: harmonics
  [440, 880, 1320, 1760].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume * 0.2 / (i + 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.0);
  });
}

function playCrashSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

  // Low rumble descending
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.8);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 1.0);

  // Add noise burst
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
}

function playBullRunSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  // Ascending arpeggio
  [261, 330, 392, 523].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.25, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.3);
  });
}

function playHappyHourSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  // Cheerful descending chime
  [880, 660, 440, 330].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.2, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.4);
  });
}

function playChaosSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  // Random rapid notes
  for (let i = 0; i < 8; i++) {
    const freq = 200 + Math.random() * 1200;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now + i * 0.06);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.1, now + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.08);
  }
}

function playTickSound(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1000, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}
