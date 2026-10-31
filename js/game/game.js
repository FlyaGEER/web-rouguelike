// Логика игры: состояние, ходы, бой, предметы. Рендера здесь нет.
G.Game = (() => {
  const W = 60, H = 36, R = 9, S = {};
  S.W = W; S.H = H;
  const snd = n => G.Sound.play(n);
  const say = (t, c = '#c9c3e0') => { S.log.push({ t, c }); if (S.log.length > 60) S.log.shift(); };
  const hint = (k, t) => { if (!S.hints[k]) { S.hints[k] = 1; say('💡 ' + t, '#8ad0ff'); } };
  const fx = (x, y, text, color) => S.fx.push({ x, y, text, color, born: performance.now() });
  const monsterAt = (x, y) => S.monsters.find(m => m.x === x && m.y === y);
  const free = (x, y) => S.map.tiles[y * W + x] !== G.T.WALL && !monsterAt(x, y) && !(S.p.x === x && S.p.y === y);

  S.score = () => S.gold + S.depth * 100 + S.kills * 10;
  S.init = (seed = Date.now()) => {
    S.seed = seed; S.rng = G.RNG(seed); S.depth = 0; S.dead = false; S.log = []; S.fx = [];
    S.gold = 0; S.kills = 0; S.hints = {}; S.shake = 0; S.flash = 0;
    S.p = { x: 0, y: 0, hp: 30, max: 30, atk: 3, lvl: 1, xp: 0, weapon: null, armor: null, inv: [] };
    say('Ты спускаешься в Бездну...', '#ff9d4d');
    hint('start', 'Ходи стрелками/WASD. Наведи мышь на врага или предмет — увидишь подсказку.');
    S.descend();
  };
  S.descend = () => {
    const rng = S.rng; S.depth++;
    S.map = G.Dungeon.generate(W, H, rng);
    S.vis = new Uint8Array(W * H); S.seen = new Uint8Array(W * H);
    const rs = S.map.rooms; S.p.x = rs[0].cx; S.p.y = rs[0].cy;
    S.monsters = []; S.items = [];
    const pool = G.MONSTERS.filter(m => m.minDepth <= S.depth).slice(-4);
    rs.slice(1).forEach(r => {
      for (let n = rng.int(0, 1 + Math.ceil(S.depth / 3)); n > 0; n--) {
        const t = rng.pick(pool), k = 1 + (S.depth - 1) * .12, x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1);
        if (free(x, y)) S.monsters.push({ ...t, hp: Math.ceil(t.hp * k), max: Math.ceil(t.hp * k), atk: Math.ceil(t.atk * k), x, y });
      }
      if (rng.chance(.6)) S.items.push({ ...G.makeItem(rng, S.depth), x: rng.int(r.x, r.x + r.w - 1), y: rng.int(r.y, r.y + r.h - 1) });
    });
    say(`Этаж ${S.depth}.`, '#8a7fc0');
    if (S.depth > 1) snd('stairs');
    S.look();
  };
  S.look = () => {
    G.FOV.compute(S.map, S.p.x, S.p.y, R, S.vis);
    for (let i = 0; i < S.vis.length; i++) if (S.vis[i]) S.seen[i] = 1;
    if (S.monsters.some(m => S.vis[m.y * W + m.x])) hint('mon', 'Враг! Иди на него, чтобы ударить. Следи за красной полосой HP.');
    if (S.items.some(i => S.vis[i.y * W + i.x])) hint('item', 'Встань на предмет, чтобы подобрать. Наведи мышь — узнаешь, что это.');
  };
  const dmg = (atk, def = 0) => Math.max(1, atk + S.rng.int(-1, 2) - def);
  const gainXp = x => {
    const p = S.p; p.xp += x;
    while (p.xp >= p.lvl * 20) { p.xp -= p.lvl * 20; p.lvl++; p.max += 8; p.atk++; p.hp = p.max; snd('level'); say(`Уровень ${p.lvl}! Силы растут.`, '#ffd34d'); }
  };
  S.attack = m => {
    const d = dmg(S.p.atk + (S.p.weapon?.power || 0)); m.hp -= d; fx(m.x, m.y, '-' + d, '#fff'); S.shake = 3;
    if (m.hp <= 0) { snd('kill'); S.kills++; say(`${m.name} повержен(а). +${m.xp} опыта.`, '#6fdc6f'); S.monsters = S.monsters.filter(o => o !== m); gainXp(m.xp); }
    else snd('hit');
  };
  const enemyTurn = () => {
    for (const m of S.monsters) {
      const dx = S.p.x - m.x, dy = S.p.y - m.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1) {
        const d = dmg(m.atk, S.p.armor?.power || 0); S.p.hp -= d; fx(S.p.x, S.p.y, '-' + d, '#ff4d6d');
        S.shake = 7; S.flash = .6; snd('hurt'); say(`${m.name} бьёт тебя на ${d}.`, '#ff8a9a');
        if (S.p.hp / S.p.max < .35) hint('low', 'Мало HP! Выпей зелье (клик по слоту или клавиша 1-9).');
        if (S.p.hp <= 0) { S.dead = true; snd('death'); say(`Ты погиб на этаже ${S.depth}. Очки: ${S.score()}. Нажми R.`, '#ff3d3d'); return; }
      } else if (S.vis[m.y * W + m.x]) {
        const sx = Math.sign(dx), sy = Math.sign(dy);
        const o = (Math.abs(dx) > Math.abs(dy)) ? [[sx, 0], [0, sy], [sx, sy]] : [[0, sy], [sx, 0], [sx, sy]];
        const s = o.find(([a, b]) => (a || b) && free(m.x + a, m.y + b)); if (s) { m.x += s[0]; m.y += s[1]; }
      } else if (S.rng.chance(.3)) {
        const a = S.rng.int(-1, 1), b = S.rng.int(-1, 1); if (free(m.x + a, m.y + b)) { m.x += a; m.y += b; }
      }
    }
  };
  const endTurn = () => { enemyTurn(); S.look(); };
  const pickup = () => {
    const it = S.items.find(i => i.x === S.p.x && i.y === S.p.y); if (!it) return;
    if (it.kind === 'gold') { S.items = S.items.filter(i => i !== it); S.gold += it.power; snd('coin'); say(`+${it.power} золота.`, '#ffd34d'); return; }
    if (it.kind === 'weapon' || it.kind === 'armor') {
      S.items = S.items.filter(i => i !== it);
      const cur = S.p[it.kind];
      if (!cur || it.power > cur.power) { S.p[it.kind] = it; snd('pickup'); say(`Экипировано: ${it.name} (+${it.power}).`, '#ffd34d'); }
      else say(`${it.name} хуже твоего — оставлено.`);
    } else if (S.p.inv.length < 9) { S.items = S.items.filter(i => i !== it); S.p.inv.push(it); snd('pickup'); say(`Подобрано: ${it.name}.`, '#6ad1ff'); hint('inv', 'Предмет в инвентаре: клик или цифра — использовать, ПКМ — выбросить.'); }
    else say('Инвентарь полон.');
  };
  S.act = (dx, dy) => {
    if (S.dead) return;
    const nx = S.p.x + dx, ny = S.p.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const m = monsterAt(nx, ny);
    if (m) S.attack(m);
    else if (S.map.tiles[ny * W + nx] !== G.T.WALL) { if (dx || dy) { S.p.x = nx; S.p.y = ny; snd('step'); pickup(); } }
    else return;
    endTurn();
  };
  S.useStairs = () => {
    if (S.map.tiles[S.p.y * W + S.p.x] === G.T.STAIRS) S.descend(); else say('Здесь нет лестницы.');
  };
  S.use = i => {
    const it = S.p.inv[i]; if (!it || S.dead) return;
    if (it.kind === 'heal') { const h = Math.min(it.power, S.p.max - S.p.hp); S.p.hp += h; fx(S.p.x, S.p.y, '+' + h, '#6fdc6f'); snd('potion'); say(`Лечение: +${h}.`, '#6fdc6f'); }
    if (it.kind === 'str') { S.p.atk++; snd('potion'); say('Сила растёт: +1 к атаке.', '#c77dff'); }
    if (it.kind === 'map') { S.seen.fill(1); snd('tele'); say('Карта этажа раскрыта.', '#6fdc6f'); }
    if (it.kind === 'fire') {
      snd('fire'); S.shake = 6; say('Огненная вспышка!', '#ff9d4d');
      S.monsters.filter(m => S.vis[m.y * W + m.x]).forEach(m => { m.hp -= it.power; fx(m.x, m.y, '-' + it.power, '#ff9d4d'); if (m.hp <= 0) { S.kills++; gainXp(m.xp); say(`${m.name} сгорел(а).`, '#6fdc6f'); } });
      S.monsters = S.monsters.filter(m => m.hp > 0);
    }
    if (it.kind === 'tele') { const r = S.rng.pick(S.map.rooms); S.p.x = r.cx; S.p.y = r.cy; snd('tele'); say('Мир вспыхнул — ты в другом месте.', '#6ad1ff'); }
    S.p.inv.splice(i, 1); endTurn();
  };
  S.drop = i => {
    const it = S.p.inv[i]; if (!it || S.dead) return;
    S.p.inv.splice(i, 1); S.items.push({ ...it, x: S.p.x, y: S.p.y }); say(`Выброшено: ${it.name}.`); endTurn();
  };
  S.info = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H || !S.vis[y * W + x]) return '';
    const m = monsterAt(x, y); if (m) return `<b style="color:${m.color}">${m.name}</b><br>HP ${m.hp}/${m.max} · Атака ${m.atk}`;
    const it = S.items.find(i => i.x === x && i.y === y); if (it) return `<b style="color:${it.color}">${it.name}</b><br>${G.describe(it)}`;
    if (S.map.tiles[y * W + x] === G.T.STAIRS) return '<b>Лестница вниз</b><br>Встань и нажми &gt;';
    return '';
  };
  return S;
})();