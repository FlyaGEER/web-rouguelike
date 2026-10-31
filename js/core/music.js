// Боевая музыка: рок-ансамбль на WebAudio (дисторшн-гитара, бас, ударные)
// riff: 16 шагов, числа — полутоны от root (Гц), -1 — пауза. drums: k=бочка s=малый h=хэт
G.Music = (() => {
  const THEMES = {
    punk:   { bpm: 172, root: 82.4,  riff: [0, 0, 3, 0, 5, 0, 3, 0, 0, 0, 7, 0, 5, 3, 0, -1],            drums: 'k.hsk.hsk.hsk.hs' },
    doom:   { bpm: 104, root: 73.4,  riff: [0, -1, -1, -1, 1, -1, 0, -1, -1, -1, 3, -1, 1, -1, -1, -1],  drums: 'k...s...k.k.s...' },
    stoner: { bpm: 88,  root: 55,    riff: [0, -1, 0, -1, -1, -1, 0, 3, -1, -1, 5, -1, 3, -1, -1, -1],    drums: 'k..hs..hk.k.s..h' },
    metal:  { bpm: 148, root: 87.3,  riff: [0, 0, -1, 0, 0, -1, 0, 0, 5, 5, -1, 5, 6, -1, 5, 3],         drums: 'k.hkshk.k.hkshkh' },
    thrash: { bpm: 192, root: 98,    riff: [0, 0, 7, 0, 0, 7, 0, 5, 0, 0, 7, 0, 10, 8, 7, 5],            drums: 'kkshkkshkkshkksh' },
  };
  let ac, bus, gtr, nb, timer = null, th, step = 0, nextT = 0, fast = 1, rage = false;
  const setup = () => {
    ac = G.Sound.ctx(); if (!ac) return false;
    if (!bus) {
      bus = ac.createGain(); bus.gain.value = .6; bus.connect(G.Sound.out());
      const sh = ac.createWaveShaper(), c = new Float32Array(512), lp = ac.createBiquadFilter();
      for (let i = 0; i < 512; i++) c[i] = Math.tanh((i / 256 - 1) * 6);
      sh.curve = c; lp.type = 'lowpass'; lp.frequency.value = 2600;
      gtr = ac.createGain(); gtr.gain.value = .35; gtr.connect(sh); sh.connect(lp); lp.connect(bus);
      nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return true;
  };
  const osc = (f, t, d, type, v, dst, f2) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + d);
  };
  const noise = (t, d, v, hp) => {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + d);
  };
  const play = (i, t, sd) => {
    const n = th.riff[i], dr = th.drums[i];
    if (dr === 'k') osc(150, t, .14, 'sine', .9, bus, 40);
    if (dr === 's') { noise(t, .14, .5, 1500); osc(220, t, .08, 'triangle', .3, bus); }
    if (dr === 'h' || (rage && i % 2)) noise(t, .04, .18, 7000);
    if (n >= 0) {
      const f = th.root * 2 ** (n / 12);
      osc(f, t, sd * .95, 'sawtooth', .6, gtr); osc(f * 1.5, t, sd * .95, 'sawtooth', .4, gtr); // пауэр-аккорд
      osc(f / 2, t, sd * .95, 'triangle', .7, bus);                                               // бас
      if (rage && i % 2 === 0) osc(f * 4, t, sd * 1.8, 'square', .08, bus);                       // соло в ярости
    }
  };
  const tick = () => {
    const sd = 60 / (th.bpm * fast) / 4;
    while (nextT < ac.currentTime + .15) { play(step, nextT, sd); nextT += sd; step = (step + 1) % 16; }
  };
  const M = {
    start(name) {
      if (!setup()) return; M.stop();
      th = THEMES[name] || THEMES.punk; fast = 1; rage = false; step = 0; nextT = ac.currentTime + .1;
      bus.gain.cancelScheduledValues(0); bus.gain.value = .6; timer = setInterval(tick, 40);
    },
    rage() { fast = 1.18; rage = true; },
    stop() {
      if (!timer) return; clearInterval(timer); timer = null;
      bus.gain.setValueAtTime(bus.gain.value, ac.currentTime); bus.gain.linearRampToValueAtTime(0, ac.currentTime + .6);
    },
  };
  return M;
})();