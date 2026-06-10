// Web Audio API Synthesizer for Retro Terminal Sound Effects

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playClick(freq = 1200, duration = 0.015) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle'; // Click sound is crispest with a triangle wave
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gainNode.gain.setValueAtTime(0.04, ctx.currentTime); // Low volume
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playHover() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(250, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

  gainNode.gain.setValueAtTime(0.015, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.04);
}

export function playSuccess() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'square';
  // Ascending synth note
  osc.frequency.setValueAtTime(600, time);
  osc.frequency.setValueAtTime(900, time + 0.07);

  gainNode.gain.setValueAtTime(0.02, time);
  gainNode.gain.setValueAtTime(0.02, time + 0.07);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(time + 0.2);
}

export function playError() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth';
  // Buzzing down frequency
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.linearRampToValueAtTime(60, time + 0.25);

  gainNode.gain.setValueAtTime(0.03, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(time + 0.25);
}

export function playBoot() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  
  // Create a sci-fi sweep sound
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(100, time);
  osc1.frequency.exponentialRampToValueAtTime(800, time + 0.8);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(104, time);
  osc2.frequency.exponentialRampToValueAtTime(804, time + 0.8);

  gainNode.gain.setValueAtTime(0.01, time);
  gainNode.gain.linearRampToValueAtTime(0.03, time + 0.4);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.85);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start();
  osc2.start();
  
  osc1.stop(time + 0.85);
  osc2.stop(time + 0.85);
}
