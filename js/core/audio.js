// Звуки: синтез через WebAudio. Вызов: G.Sound.play('hit')
G.Sound = (() => {
  let ac, master, on = true;
  const init = () => {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .25; master.connect(ac.destination);
      [55, 55.7, 82.4].forEach(f => { // фоновый гул
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f; g.gain.value = .05; o.connect(g); g.connect(master); o.start();
      });
    }
    if (ac.state === 'suspended') ac.resume();
  };
  const tone = (f, d, type = 'square', vol = .4, slide = 0, delay = 0) => {
    if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d);
  };
  const noise = (d, vol = .4, freq = 1000) => {
    if (!ac) return;
    const n = ac.sampleRate * d | 0, buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  };
  const FX = {
    step: () => tone(90, .05, 'triangle', .12),
    hit: () => { noise(.12, .5, 1500); tone(180, .1, 'sawtooth', .3, -100); },
    hurt: () => tone(150, .25, 'sawtooth', .5, -110),
    kill: () => { noise(.2, .5, 600); tone(300, .2, 'square', .3, -250); },
    pickup: () => { tone(660, .08, 'square', .3); tone(990, .1, 'square', .3, 0, .07); },
    coin: () => { tone(1200, .06, 'square', .25); tone(1600, .12, 'square', .25, 0, .05); },
    potion: () => tone(400, .35, 'sine', .5, 500),
    fire: () => { noise(.5, .6, 700); tone(120, .5, 'sawtooth', .4, -60); },
    tele: () => tone(1200, .4, 'sine', .4, -1000),
    stairs: () => [400, 300, 200].forEach((f, i) => tone(f, .15, 'triangle', .4, 0, i * .1)),
    level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .15, 'square', .3, 0, i * .09)),
    death: () => tone(300, 1.2, 'sawtooth', .6, -280),
  };
  return {
    init, play: n => FX[n] && FX[n](),
    ctx: () => ac, out: () => master,
    toggle: () => { on = !on; if (master) master.gain.value = on ? .25 : 0; return on; },
  };
})();