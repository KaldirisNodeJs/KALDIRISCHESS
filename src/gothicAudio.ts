/**
 * Gothic Cathedral Web Audio Synthesizer for Kaldiris Chess
 * 
 * Provides rich, zero-latency procedural procedural sound synthesis:
 * - Início de Partida: Tolling cathedral bronze bells with long acoustic decay
 * - Movimentos de Peças: Heavy stone pedestal sliding friction & solid marble placement clack
 * - Capturas Cinematográficas: War lunge whoosh, weapon blade-on-stone clash & cataclysmic stone shatter explosion with sub-bass punch
 * - Xeque: Eerie gothic suspense chime
 * - Xeque-mate: Monumental heavy stone King crash, crown shatter & dark triumphant cathedral pipe organ chord
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let isMuted = false;

// Sound is enabled by default upon entering the app
try {
  const saved = localStorage.getItem('kaldiris_chess_sound');
  if (saved === 'false') {
    isMuted = false; // User requested sound active by default on entering
    localStorage.setItem('kaldiris_chess_sound', 'true');
  }
} catch {
  // Ignore storage restrictions
}

/**
 * Initializes or unlocks the AudioContext on first user gesture.
 */
export function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    audioCtx = new AudioContextClass();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.85, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Create synthetic Gothic cathedral reverb impulse
    try {
      reverbNode = createCathedralReverb(audioCtx, 2.8, 2.2);
      reverbNode.connect(masterGain);
    } catch {
      reverbNode = null;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Procedural Gothic Cathedral impulse response generator for lush stone acoustic space
 */
function createCathedralReverb(ctx: AudioContext, durationSeconds: number, decayRate: number): ConvolverNode {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSeconds);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Multi-exponential decay with stone bounce reflections
    const env = Math.pow(1 - t / durationSeconds, decayRate) * (0.8 + 0.2 * Math.sin(t * 120));
    left[i] = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }

  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

/**
 * Safe audio destination helper with optional reverb send
 */
function getOutputNode(ctx: AudioContext, reverbSend = 0.35): AudioNode {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.85, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }

  if (reverbNode && reverbSend > 0) {
    const dryWetSplit = ctx.createGain();
    dryWetSplit.gain.setValueAtTime(1, ctx.currentTime);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(1 - reverbSend * 0.5, ctx.currentTime);
    dryGain.connect(masterGain);

    const sendGain = ctx.createGain();
    sendGain.gain.setValueAtTime(reverbSend, ctx.currentTime);
    sendGain.connect(reverbNode);

    dryWetSplit.connect(dryGain);
    dryWetSplit.connect(sendGain);
    return dryWetSplit;
  }

  return masterGain;
}

// Global user unlock listener
if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
  const onFirstInteraction = () => {
    initAudioContext();
    unlockEvents.forEach((evt) => window.removeEventListener(evt, onFirstInteraction));
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, onFirstInteraction, { passive: true }));
}

/**
 * Toggle sound on or off
 */
export function toggleSound(): boolean {
  isMuted = !isMuted;
  try {
    localStorage.setItem('kaldiris_chess_sound', isMuted ? 'false' : 'true');
  } catch {}

  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.85, audioCtx.currentTime, 0.04);
  }
  return !isMuted;
}

export function isSoundEnabled(): boolean {
  return !isMuted;
}

export function setSoundEnabled(enabled: boolean): void {
  isMuted = !enabled;
  try {
    localStorage.setItem('kaldiris_chess_sound', isMuted ? 'false' : 'true');
  } catch {}

  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.85, audioCtx.currentTime, 0.04);
  }
}

// =============================================================================
// Sound 1: Início de Partida (Cathedral Bell Tolling)
// =============================================================================
export function playGameStartBellSound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.55);

  // Tolling bronze cathedral bell (Harmonics: fundamental 110Hz A2, with gothic bronze partials)
  const bellPartials = [
    { freq: 110.0, gain: 0.55, decay: 3.2 },  // Fundamental hum
    { freq: 220.0, gain: 0.40, decay: 2.8 },  // Octave prime
    { freq: 275.0, gain: 0.35, decay: 2.3 },  // Minor tierce
    { freq: 330.0, gain: 0.28, decay: 1.9 },  // Fifth quint
    { freq: 440.0, gain: 0.22, decay: 1.4 },  // Nominal
    { freq: 587.0, gain: 0.15, decay: 0.9 },  // Superquint
    { freq: 880.0, gain: 0.09, decay: 0.5 }   // High strike ring
  ];

  bellPartials.forEach((p) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    // Subtle organic detuning for authentic medieval bronze casting
    osc.frequency.setValueAtTime(p.freq * (1 + (Math.random() - 0.5) * 0.015), now);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(p.gain * 0.75, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

    osc.connect(g);
    g.connect(out);

    osc.start(now);
    osc.stop(now + p.decay + 0.1);
  });

  // Clapper strike transient (heavy metallic bronze tap)
  const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.018));
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(650, now);
  filter.Q.setValueAtTime(3.5, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(out);

  noiseSource.start(now);
}

// =============================================================================
// Sound 2: Movimentos de Peças (Stone Pedestal Drag & Solid Marble Clack)
// =============================================================================
export function playMoveSound(pieceType = 'pawn'): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.28);

  const isHeavy = pieceType === 'rook' || pieceType === 'queen' || pieceType === 'king';
  const isKnight = pieceType === 'knight';

  // 1. Stone friction / pedestal slide texture
  const slideDuration = isHeavy ? 0.38 : 0.26;
  const bufferLen = Math.floor(ctx.sampleRate * slideDuration);
  const noiseBuf = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);

  for (let i = 0; i < bufferLen; i++) {
    const env = Math.sin((i / bufferLen) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  const bpass = ctx.createBiquadFilter();
  bpass.type = 'bandpass';
  bpass.frequency.setValueAtTime(isHeavy ? 280 : 380, now);
  bpass.frequency.exponentialRampToValueAtTime(isHeavy ? 180 : 260, now + slideDuration);
  bpass.Q.setValueAtTime(2.2, now);

  const slideGain = ctx.createGain();
  slideGain.gain.setValueAtTime(0.18, now);
  slideGain.gain.exponentialRampToValueAtTime(0.001, now + slideDuration);

  noiseSrc.connect(bpass);
  bpass.connect(slideGain);
  slideGain.connect(out);
  noiseSrc.start(now);

  // 2. Low-frequency pedestal body friction resonance
  const lowOsc = ctx.createOscillator();
  const lowGain = ctx.createGain();
  lowOsc.type = 'triangle';
  lowOsc.frequency.setValueAtTime(isHeavy ? 75 : 95, now);
  lowOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 52 : 70, now + slideDuration);

  lowGain.gain.setValueAtTime(0.15, now);
  lowGain.gain.exponentialRampToValueAtTime(0.001, now + slideDuration);

  lowOsc.connect(lowGain);
  lowGain.connect(out);
  lowOsc.start(now);
  lowOsc.stop(now + slideDuration);

  // If Knight, add a second subtle galloping stone tap
  if (isKnight) {
    const tapOsc = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tapOsc.type = 'sine';
    tapOsc.frequency.setValueAtTime(140, now + 0.12);
    tapGain.gain.setValueAtTime(0, now);
    tapGain.gain.setValueAtTime(0.16, now + 0.12);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    tapOsc.connect(tapGain);
    tapGain.connect(out);
    tapOsc.start(now + 0.12);
    tapOsc.stop(now + 0.24);
  }
}

/**
 * Heavy marble tile placement clack when a piece arrives and sets down firmly
 */
export function playPieceSetDownSound(pieceType = 'pawn'): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.38);

  const isHeavy = pieceType === 'rook' || pieceType === 'queen' || pieceType === 'king';

  // Crisp high-frequency stone snap transient
  const snapOsc = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snapOsc.type = 'sine';
  snapOsc.frequency.setValueAtTime(isHeavy ? 520 : 680, now);
  snapOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 140 : 180, now + 0.05);

  snapGain.gain.setValueAtTime(0.32, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  snapOsc.connect(snapGain);
  snapGain.connect(out);
  snapOsc.start(now);
  snapOsc.stop(now + 0.07);

  // Weighty low-end solid marble pedestal thump
  const thumpOsc = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thumpOsc.type = 'triangle';
  thumpOsc.frequency.setValueAtTime(isHeavy ? 110 : 145, now);
  thumpOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 42 : 55, now + 0.14);

  thumpGain.gain.setValueAtTime(isHeavy ? 0.42 : 0.28, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  thumpOsc.connect(thumpGain);
  thumpGain.connect(out);
  thumpOsc.start(now);
  thumpOsc.stop(now + 0.20);
}

// =============================================================================
// Sound 3: Capturas Cinematográficas (Approach, Strike, Shatter Explosion)
// =============================================================================

/**
 * 3a. War Lunge / Weapon Approach Whoosh
 */
export function playAttackApproachSound(pieceType = 'queen'): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.32);

  // Aerodynamic whoosh / blade draw
  const dur = 0.42;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.sin((i / data.length) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * Math.pow(env, 2);
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(pieceType === 'knight' ? 360 : 480, now);
  filter.frequency.exponentialRampToValueAtTime(850, now + dur);
  filter.Q.setValueAtTime(3.0, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.24, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(now);
}

/**
 * 3b. Weapon Physically Striking Stone Statue (Sharp Metallic / Axe Clash)
 */
export function playWeaponStrikeSound(pieceType = 'queen'): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.45);

  // Metallic weapon clang
  const clangFreqs = pieceType === 'knight'
    ? [587, 880, 1174]   // Knight lance piercing
    : [740, 1108, 1480]; // Sword / mace cleave

  clangFreqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const decay = 0.16 + idx * 0.04;
    g.gain.setValueAtTime(0.35 / (idx + 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + decay + 0.02);
  });

  // Sharp impact spark transient
  const snapBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
  const snapData = snapBuf.getChannelData(0);
  for (let i = 0; i < snapData.length; i++) {
    snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  }
  const snapSrc = ctx.createBufferSource();
  snapSrc.buffer = snapBuf;

  const hpass = ctx.createBiquadFilter();
  hpass.type = 'highpass';
  hpass.frequency.setValueAtTime(1400, now);

  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.48, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  snapSrc.connect(hpass);
  hpass.connect(snapGain);
  snapGain.connect(out);
  snapSrc.start(now);
}

/**
 * 3c. Cataclysmic Stone Shatter Explosion (Pieces bursting into debris shards)
 */
export function playStoneShatterSound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.65);

  // 1. Massive Sub-bass impact shockwave (altar shake)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(95, now);
  subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

  subGain.gain.setValueAtTime(0.72, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  subOsc.connect(subGain);
  subGain.connect(out);
  subOsc.start(now);
  subOsc.stop(now + 0.48);

  // 2. Heavy explosive rock blast / crushing stone burst
  const blastDur = 0.55;
  const blastBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * blastDur), ctx.sampleRate);
  const bData = blastBuf.getChannelData(0);
  for (let i = 0; i < bData.length; i++) {
    const t = i / ctx.sampleRate;
    const env = Math.exp(-t * 7.5);
    bData[i] = (Math.random() * 2 - 1) * env;
  }
  const blastSrc = ctx.createBufferSource();
  blastSrc.buffer = blastBuf;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(1800, now);
  lowpass.frequency.exponentialRampToValueAtTime(320, now + blastDur);

  const blastGain = ctx.createGain();
  blastGain.gain.setValueAtTime(0.65, now);
  blastGain.gain.exponentialRampToValueAtTime(0.001, now + blastDur);

  blastSrc.connect(lowpass);
  lowpass.connect(blastGain);
  blastGain.connect(out);
  blastSrc.start(now);

  // 3. High-frequency flying stone shards clattering across the marble board
  const shardCount = 8;
  for (let s = 0; s < shardCount; s++) {
    const delay = 0.04 + s * 0.038 + (Math.random() * 0.02);
    const shardOsc = ctx.createOscillator();
    const shardGain = ctx.createGain();

    shardOsc.type = 'sine';
    const sFreq = 800 + Math.random() * 1200;
    shardOsc.frequency.setValueAtTime(sFreq, now + delay);
    shardOsc.frequency.exponentialRampToValueAtTime(sFreq * 0.45, now + delay + 0.08);

    shardGain.gain.setValueAtTime(0, now);
    shardGain.gain.setValueAtTime(0.18 / (1 + s * 0.2), now + delay);
    shardGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);

    shardOsc.connect(shardGain);
    shardGain.connect(out);
    shardOsc.start(now + delay);
    shardOsc.stop(now + delay + 0.11);
  }
}

// =============================================================================
// Sound 4: Xeque (Warning / Gothic Suspense Dissonance)
// =============================================================================
export function playCheckWarningSound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.48);

  // Ominous Gothic tritone / suspense chord (D - G# tension)
  const notes = [146.83, 207.65, 293.66, 415.30]; // D3, G#3 (diminished 5th), D4, G#4

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 1.30);
  });
}

// =============================================================================
// Sound 5: Xeque-Mate (Monumental King Fall & Gothic Pipe Organ Triumph)
// =============================================================================

/**
 * 5a. Heavy Stone King Toppling & Crashing onto the Altar Board
 */
export function playKingCrashSound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.70);

  // Monumental sub-bass impact (the throne has fallen)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(78, now);
  subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.45);

  subGain.gain.setValueAtTime(0.85, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  subOsc.connect(subGain);
  subGain.connect(out);
  subOsc.start(now);
  subOsc.stop(now + 0.60);

  // Crown dent and stone fracture crack
  const crackDur = 0.48;
  const crackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * crackDur), ctx.sampleRate);
  const data = crackBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 9.0);
  }
  const crackSrc = ctx.createBufferSource();
  crackSrc.buffer = crackBuf;

  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(820, now);
  f.frequency.exponentialRampToValueAtTime(220, now + crackDur);
  f.Q.setValueAtTime(2.5, now);

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.55, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + crackDur);

  crackSrc.connect(f);
  f.connect(crackGain);
  crackGain.connect(out);
  crackSrc.start(now);
}

/**
 * 5b. Dark Triumphant Gothic Cathedral Pipe Organ Chord & Proclamation Bells
 */
export function playCheckmateBannerTrophySound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.60);

  // Majestic Cathedral Pipe Organ (Full Gothic D-Minor Power Register)
  // D2 (73.4), A2 (110.0), D3 (146.8), F3 (174.6), A3 (220.0), D4 (293.7), F4 (349.2)
  const organPipes = [
    { freq: 73.4,  type: 'sawtooth' as const, gain: 0.28 },
    { freq: 110.0, type: 'triangle' as const, gain: 0.32 },
    { freq: 146.8, type: 'sawtooth' as const, gain: 0.26 },
    { freq: 174.6, type: 'triangle' as const, gain: 0.22 },
    { freq: 220.0, type: 'sawtooth' as const, gain: 0.24 },
    { freq: 293.7, type: 'triangle' as const, gain: 0.20 },
    { freq: 349.2, type: 'sine' as const,     gain: 0.16 },
    { freq: 440.0, type: 'sine' as const,     gain: 0.14 }
  ];

  const organDuration = 3.6;

  organPipes.forEach((pipe, i) => {
    // Twin oscillators for slow acoustic beating chorus
    [-0.8, 0.8].forEach((detuneHz) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = pipe.type;
      osc.frequency.setValueAtTime(pipe.freq + detuneHz, now);

      // Lowpass filter to simulate wooden and tin cathedral organ pipes
      const pipeFilter = ctx.createBiquadFilter();
      pipeFilter.type = 'lowpass';
      pipeFilter.frequency.setValueAtTime(1400 + i * 180, now);

      g.gain.setValueAtTime(0, now);
      // Gentle organ bellows attack
      g.gain.linearRampToValueAtTime(pipe.gain * 0.45, now + 0.18);
      g.gain.setValueAtTime(pipe.gain * 0.42, now + 2.0);
      g.gain.exponentialRampToValueAtTime(0.0001, now + organDuration);

      osc.connect(pipeFilter);
      pipeFilter.connect(g);
      g.connect(out);

      osc.start(now);
      osc.stop(now + organDuration + 0.1);
    });
  });

  // Slow solemn funeral bell toll on the checkmate reveal
  const bellFreqs = [146.8, 293.6, 440.0];
  bellFreqs.forEach((bf, idx) => {
    const bOsc = ctx.createOscillator();
    const bG = ctx.createGain();
    bOsc.type = 'sine';
    bOsc.frequency.setValueAtTime(bf, now + 0.35);

    bG.gain.setValueAtTime(0, now);
    bG.gain.setValueAtTime(0.24 / (idx + 1), now + 0.35);
    bG.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

    bOsc.connect(bG);
    bG.connect(out);
    bOsc.start(now + 0.35);
    bOsc.stop(now + 3.3);
  });
}

/**
 * 6. Subtle tactile stone square or piece selection click
 */
export function playPieceSelectSound(): void {
  if (isMuted) return;
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const out = getOutputNode(ctx, 0.15);

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(540, now);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);

  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(g);
  g.connect(out);
  osc.start(now);
  osc.stop(now + 0.05);
}
