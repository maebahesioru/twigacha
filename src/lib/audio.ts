let ctx: AudioContext | null = null;
function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  o.start(c.currentTime + delay);
  o.stop(c.currentTime + delay + dur);
}

export function playAttack() {
  beep(220, 0.1, 'sawtooth', 0.2);
  beep(180, 0.15, 'square', 0.15, 0.05);
}

export function playHit() {
  beep(150, 0.08, 'square', 0.25);
}

export function playVictory() {
  [[523,0],[659,0.15],[784,0.3],[1047,0.45]].forEach(([f,d]) => beep(f as number, 0.3, 'sine', 0.3, d as number));
}

export function playDefeat() {
  beep(300, 0.2, 'sawtooth', 0.2);
  beep(200, 0.3, 'sawtooth', 0.2, 0.2);
  beep(150, 0.4, 'sawtooth', 0.15, 0.4);
}

export function playGachaDrum(onDone: () => void) {
  const intervals = [120,110,100,90,80,70,60,50,40,30,20,10];
  let t = 0;
  intervals.forEach((ms, i) => {
    t += ms * (i + 1) * 0.5;
    setTimeout(() => beep(400 + i * 30, 0.05, 'square', 0.15), t);
  });
  setTimeout(onDone, t + 100);
}

export function playFavorite() {
  beep(880, 0.08, 'sine', 0.2);
  beep(1100, 0.1, 'sine', 0.15, 0.06);
}

export function playDelete() {
  beep(300, 0.08, 'sawtooth', 0.3);
  beep(150, 0.15, 'sawtooth', 0.2, 0.08);
}

export function playMissionComplete() {
  [[523,0],[659,0.1],[784,0.2],[1047,0.3]].forEach(([f,d]) => beep(f as number, 0.2, 'sine', 0.25, d as number));
}

export function playRaidHit() {
  beep(80, 0.15, 'sawtooth', 0.35);
  beep(60, 0.2, 'square', 0.2, 0.05);
}

export function playRarityFanfare(rarity: string) {
  if (rarity === 'LR') {
    [[523,0],[659,0.1],[784,0.2],[1047,0.3],[1319,0.4],[1568,0.5]].forEach(([f,d]) => beep(f as number, 0.4, 'sine', 0.35, d as number));
  } else if (rarity === 'UR') {
    [[523,0],[784,0.15],[1047,0.3],[1319,0.45]].forEach(([f,d]) => beep(f as number, 0.3, 'sine', 0.3, d as number));
  } else if (rarity === 'SSR') {
    [[523,0],[659,0.15],[784,0.3]].forEach(([f,d]) => beep(f as number, 0.25, 'sine', 0.25, d as number));
  }
}
