// Ввод, HUD, тултипы, игровой цикл
(() => {
  const S = G.Game, $ = id => document.getElementById(id), canvas = $('c'), tip = $('tip');
  const draw = G.Renderer(canvas), mini = G.Minimap($('mini'));
  S.init(+new URLSearchParams(location.search).get('seed') || undefined);
  const img = it => `<img src="${G.Sprites.url(it.ch, it.color)}">`;
  let ghost = 100;

  const hud = () => {
    const p = S.p, pct = Math.max(0, p.hp / p.max * 100);
    $('depth').textContent = `Этаж ${S.depth} · ${S.biome.name} · seed ${S.seed}`;
    $('hpbar').style.width = pct + '%'; $('hptxt').textContent = `HP ${p.hp}/${p.max}`;
    $('hpbar').parentElement.classList.toggle('low', pct < 30);
    if (pct < ghost) setTimeout(() => $('ghost').style.width = pct + '%', 350); else $('ghost').style.width = pct + '%';
    ghost = pct;
    $('xpbar').style.width = p.xp / (p.lvl * 20) * 100 + '%';
    $('stats').innerHTML = `Ур. ${p.lvl} · опыт ${p.xp}/${p.lvl * 20}<br>Атака ${p.atk + (p.weapon?.power || 0)} · Защита ${p.armor?.power || 0}<br>💰 ${S.gold} · ☠ ${S.kills} · Очки ${S.score()}`;
    const eq = (it, lbl) => `<div class="eq">${it ? img(it) + it.name : '<span class="slotempty"></span>' + lbl + ': —'}</div>`;
    $('eq').innerHTML = eq(p.weapon, 'Оружие') + eq(p.armor, 'Броня');
    $('inv').innerHTML = Array.from({ length: 9 }, (_, i) => {
      const it = p.inv[i];
      return it ? `<div class="slot" data-i="${i}">${img(it)}<b>${i + 1}</b></div>` : '<div class="slot"></div>';
    }).join('');
    $('log').innerHTML = S.log.slice(-14).map(l => `<div style="color:${l.c}">${l.t}</div>`).join('');
    mini();
    if (S.dead) G.Music.stop();
  };

  const showTip = (h, e) => {
    if (!h) { tip.style.display = 'none'; return; }
    tip.innerHTML = h; tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px';
  };

  // Подсказки при наведении на карту
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    showTip(S.info(Math.floor((e.clientX - r.left) / r.width * S.W), Math.floor((e.clientY - r.top) / r.height * S.H)), e);
  });
  canvas.addEventListener('mouseleave', () => showTip(''));

  // Инвентарь: клик — использовать, ПКМ — выбросить
  const slotOf = e => { const s = e.target.closest('.slot[data-i]'); return s ? +s.dataset.i : -1; };
  const inv = $('inv');
  inv.addEventListener('click', e => { G.Sound.init(); const i = slotOf(e); if (i >= 0) { S.use(i); showTip(''); hud(); } });
  inv.addEventListener('contextmenu', e => { e.preventDefault(); const i = slotOf(e); if (i >= 0) { S.drop(i); showTip(''); hud(); } });
  inv.addEventListener('mousemove', e => {
    const it = S.p.inv[slotOf(e)];
    showTip(it ? `<b style="color:${it.color}">${it.name}</b><br>${G.describe(it)}` : '', e);
  });
  inv.addEventListener('mouseleave', () => showTip(''));

  // Клавиатура
  const keys = {
    ArrowUp: [0, -1], w: [0, -1], k: [0, -1], ArrowDown: [0, 1], s: [0, 1], j: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], h: [-1, 0], ArrowRight: [1, 0], d: [1, 0], l: [1, 0],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1], '.': [0, 0],
  };
  addEventListener('keydown', e => {
    G.Sound.init(); const k = e.key; e.preventDefault();
    if (k === 'r' || k === 'R') S.init();
    else if (k === 'm' || k === 'M') { $('depth').textContent = G.Sound.toggle() ? '🔊 звук вкл' : '🔇 звук выкл'; return; }
    else if (keys[k]) S.act(...keys[k]);
    else if (k === '>' || k === 'Enter') S.useStairs();
    else if (/^[1-9]$/.test(k)) S.use(+k - 1);
    hud();
  });

  hud();
  requestAnimationFrame(function loop(t) { draw(t); requestAnimationFrame(loop); });
})();