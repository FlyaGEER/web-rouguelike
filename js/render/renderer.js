// Canvas-рендер: спрайты, факел, тряска, вспышки, виньетка
G.Renderer = canvas => {
  const T = 20, ctx = canvas.getContext('2d'), S = G.Game, W = S.W;
  canvas.width = W * T; canvas.height = S.H * T;
  const glyph = (ch, x, y, color, glow) => {
    ctx.shadowColor = glow || 'transparent'; ctx.shadowBlur = glow ? 12 : 0;
    ctx.fillStyle = color; ctx.fillText(ch, x * T + T / 2, y * T + T / 2 + 1);
  };
  const spr = (ch, x, y, color, glow, bob = 0) => {
    ctx.shadowColor = glow || 'transparent'; ctx.shadowBlur = glow ? 10 : 0;
    ctx.drawImage(G.Sprites.get(ch, color), x * T + 1, y * T + 1 + bob, T - 2, T - 2);
  };
  return t => {
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.shadowBlur = 0;
    if (S.shake > .3) { ctx.translate((Math.random() - .5) * S.shake, (Math.random() - .5) * S.shake); S.shake *= .85; } else S.shake = 0;
    ctx.fillStyle = '#07060b'; ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);
    ctx.font = `bold ${T - 4}px "Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const p = S.p, map = S.map, fl = .9 + .07 * Math.sin(t / 130) + .04 * Math.sin(t / 47);
    for (let y = 0; y < S.H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!S.seen[i]) continue;
      const b = S.vis[i] ? Math.max(.22, 1 - Math.hypot(x - p.x, y - p.y) / 10) * fl : .12, tl = map.tiles[i];
      if (tl === G.T.WALL) { ctx.shadowBlur = 0; ctx.fillStyle = `rgb(${52 * b | 0},${42 * b | 0},${80 * b | 0})`; ctx.fillRect(x * T, y * T, T, T);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x * T, y * T + T - 2, T, 2); }
      else if (tl === G.T.STAIRS) spr('>', x, y, `#${(255 * b | 0).toString(16).padStart(2, '0')}${(211 * b | 0).toString(16).padStart(2, '0')}4d`, S.vis[i] ? '#ffd34d' : null);
      else glyph('·', x, y, `rgb(${110 * b | 0},${95 * b | 0},${140 * b | 0})`);
    }
    S.items.forEach(i => S.vis[i.y * W + i.x] && spr(i.ch, i.x, i.y, i.color, i.color));
    S.monsters.forEach(m => {
      if (!S.vis[m.y * W + m.x]) return;
      spr(m.ch, m.x, m.y, m.color, m.color, Math.sin(t / 250 + m.x * 3) * 1.2);
      if (m.hp < m.max) { ctx.shadowBlur = 0; ctx.fillStyle = '#400'; ctx.fillRect(m.x * T + 2, m.y * T - 1, T - 4, 3); ctx.fillStyle = '#f33'; ctx.fillRect(m.x * T + 2, m.y * T - 1, (T - 4) * m.hp / m.max, 3); }
    });
    spr('@', p.x, p.y, '#e8e4ff', '#ffb04d', Math.sin(t / 300) * 1);
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'lighter';
    const cx = p.x * T + T / 2, cy = p.y * T + T / 2, g = ctx.createRadialGradient(cx, cy, 4, cx, cy, T * 10 * fl);
    g.addColorStop(0, 'rgba(255,150,50,.16)'); g.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over';
    S.fx = S.fx.filter(f => t - f.born < 800);
    S.fx.forEach(f => { const k = (t - f.born) / 800; ctx.globalAlpha = 1 - k; glyph(f.text, f.x, f.y - k * 1.5, f.color, f.color); });
    ctx.globalAlpha = 1; ctx.restore(); ctx.shadowBlur = 0;
    if (p.hp / p.max < .3 && !S.dead) { // красная виньетка при низком HP
      const v = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * .3, canvas.width / 2, canvas.height / 2, canvas.width * .6);
      v.addColorStop(0, 'rgba(160,0,20,0)'); v.addColorStop(1, `rgba(160,0,20,${.25 + .15 * Math.sin(t / 200)})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (S.flash > .02) { ctx.fillStyle = `rgba(255,0,40,${S.flash * .5})`; ctx.fillRect(0, 0, canvas.width, canvas.height); S.flash *= .88; }
    if (S.dead) { ctx.fillStyle = 'rgba(80,0,10,.55)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '48px "Courier New"'; glyph('ТЫ ПОГИБ', W / 2, S.H / 2, '#ff3d3d', '#f00'); }
  };
};