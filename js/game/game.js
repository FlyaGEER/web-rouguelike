// Логика игры: состояние, ходы, бой, предметы, этажи с боссами, эффекты, ловушки, двери, сохранения.
G.Game = (() => {
  const W = 60, H = 36, R = 9, S = {};
  S.W = W; S.H = H;
  const snd = n => G.Sound.play(n);
  const say = (t, c = '#c9c3e0') => { S.log.push({ t, c }); if (S.log.length > 60) S.log.shift(); };
  const hint = (k, t) => { if (!S.hints[k]) { S.hints[k] = 1; say('💡 ' + t, '#8ad0ff'); } };
  const fx = (x, y, text, color) => S.fx.push({ x, y, text, color, born: performance.now() });
  const monsterAt = (x, y) => S.monsters.find(m => m.x === x && m.y === y);
  const free = (x, y) => S.map.tiles[y * W + x] !== G.T.WALL && !monsterAt(x, y) && !(S.p.x === x && S.p.y === y);
  const dmg = (atk, def = 0) => Math.max(1, atk + S.rng.int(-1, 2) - def);
  S.score = () => S.gold + S.depth * 100 + S.kills * 10;

  const die = why => {
    if (S.dead) return; S.dead = true; snd('death');
    const sc = S.score();
    G.Save.addScore({ score: sc, depth: S.depth, kills: S.kills, gold: S.gold, date: new Date().toLocaleDateString('ru-RU') });
    G.Save.clear(); say(`${why} Очки: ${sc}. Нажми R.`, '#ff3d3d');
  };

  S.init = (seed = Date.now()) => {
    G.Music.stop(); G.Save.clear();
    S.seed = seed; S.rng = G.RNG(seed); S.depth = 0; S.dead = false; S.log = []; S.fx = [];
    S.gold = 0; S.kills = 0; S.hints = {}; S.shake = 0; S.flash = 0;
    S.p = { x: 0, y: 0, hp: 30, max: 30, atk: 3, lvl: 1, xp: 0, weapon: null, armor: null, inv: [], keys: 0, st: {} };
    say('Ты спускаешься в Бездну...', '#ff9d4d');
    hint('start', 'Ходи стрелками/WASD. Наведи мышь на врага или предмет — увидишь подсказку.');
    S.descend();
  };

  S.descend = () => {
    const rng = S.rng; S.depth++;
    S.biome = G.biomeFor(S.depth); S.boss = null; S.bossDead = false; S.shop = null; S.secrets = []; G.Music.stop();
    S.map = G.Dungeon.generate(W, H, rng);
    S.vis = new Uint8Array(W * H); S.seen = new Uint8Array(W * H);
    const rs = S.map.rooms, last = rs[rs.length - 1];
    S.stairs = { x: last.cx, y: last.cy };
    S.map.tiles[S.stairs.y * W + S.stairs.x] = G.T.FLOOR; // лестница откроется после босса
    S.p.x = rs[0].cx; S.p.y = rs[0].cy;
    S.monsters = []; S.items = [];
    const pool = G.MONSTERS.filter(m => m.minDepth <= S.depth).slice(-4);
    rs.slice(1, -1).forEach(r => {
      for (let n = rng.int(0, 1 + Math.ceil(S.depth / 3)); n > 0; n--) {
        const t = rng.pick(pool), k = 1 + (S.depth - 1) * .12, x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1);
        if (free(x, y)) S.monsters.push({ ...t, hp: Math.ceil(t.hp * k), max: Math.ceil(t.hp * k), atk: Math.ceil(t.atk * k), x, y });
      }
      if (rng.chance(.6)) S.items.push({ ...G.makeItem(rng, S.depth), x: rng.int(r.x, r.x + r.w - 1), y: rng.int(r.y, r.y + r.h - 1) });
    });
    G.Extras.populate(S);
    G.Boss.spawn(S, last);
    say(`Этаж ${S.depth}: ${S.biome.name}.`, '#8a7fc0');
    hint('floor', 'В самой дальней комнате живёт босс. Победи его — откроется лестница вниз.');
    if (S.depth > 1) snd('stairs');
    S.look(); G.Save.write(S);
  };

  S.load = d => {
    Object.assign(S, { seed: d.seed, depth: d.depth, gold: d.gold, kills: d.kills, p: d.p, hints: d.hints, log: d.log, stairs: d.stairs,
      bossDead: d.bossDead, shop: d.shop, secrets: d.secrets || [], monsters: d.monsters, items: d.items, fx: [], dead: false, shake: 0, flash: 0 });
    S.rng = G.RNG((d.seed + d.depth * 977 + d.kills * 31 + (Date.now() & 0xffff)) >>> 0);
    S.map = { W, H, tiles: Uint8Array.from(d.tiles), rooms: d.rooms };
    S.seen = Uint8Array.from(d.seen); S.vis = new Uint8Array(W * H);
    S.biome = G.biomeFor(S.depth); S.boss = S.monsters.find(m => m.boss) || null;
    if (S.boss) { S.boss.awake = false; S.boss.tele = null; } // проснётся снова, когда ты его увидишь
    say('Игра загружена. R — начать заново.', '#8ad0ff'); S.look();
  };

  S.look = () => {
    G.FOV.compute(S.map, S.p.x, S.p.y, R, S.vis);
    for (let i = 0; i < S.vis.length; i++) if (S.vis[i]) S.seen[i] = 1;
    if (S.monsters.some(m => S.vis[m.y * W + m.x])) hint('mon', 'Враг! Иди на него, чтобы ударить. Следи за красной полосой HP.');
    if (S.items.some(i => S.vis[i.y * W + i.x])) hint('item', 'Встань на предмет, чтобы подобрать. Наведи мышь — узнаешь, что это.');
    G.Boss.wake(S);
  };

  const gainXp = x => {
    const p = S.p; p.xp += x;
    while (p.xp >= p.lvl * 20) { p.xp -= p.lvl * 20; p.lvl++; p.max += 8; p.atk++; p.hp = p.max; snd('level'); say(`Уровень ${p.lvl}! Силы растут.`, '#ffd34d'); }
  };

  const kill = (m, how = 'повержен(а)') => {
    S.monsters = S.monsters.filter(o => o !== m); S.kills++; snd('kill');
    say(`${m.name} ${how}. +${m.xp} опыта.`, '#6fdc6f'); gainXp(m.xp);
    if (m.drop) { S.items.push({ ...m.drop, x: m.x, y: m.y }); say(`Выпало: ${m.drop.name}.`, '#ffd34d'); }
  };

  const hurt = (d, who) => {
    if (S.dead) return;
    d = Math.max(1, d - (S.p.armor?.power || 0)); S.p.hp -= d;
    fx(S.p.x, S.p.y, '-' + d, '#ff4d6d'); S.shake = 7; S.flash = .6; snd('hurt'); say(`${who} ранит тебя на ${d}.`, '#ff8a9a');
    const ty = G.INFLICT[who] || G.INFLICT[who.replace('Элитный ', '')];
    if (ty && S.rng.chance(.4) && G.Status.apply(S.p, ty, { poison: 5, burn: 3, freeze: 2 }[ty])) {
      const s = G.Status.T[ty]; say(`${s.ico} ${s.name}!`, s.col);
    }
    if (S.p.hp / S.p.max < .35) hint('low', 'Мало HP! Выпей зелье (клик по слоту или клавиша 1-9).');
    if (S.p.hp <= 0) die(`Ты погиб на этаже ${S.depth}.`);
  };

  S.attack = m => {
    const d = dmg(S.p.atk + (S.p.weapon?.power || 0)); m.hp -= d; fx(m.x, m.y, '-' + d, '#fff'); S.shake = 3;
    if (m.hp <= 0) kill(m); else snd('hit');
    G.Boss.check(S);
  };

  const enemyTurn = () => {
    for (const m of S.monsters.slice()) {
      if (G.Status.has(m, 'freeze')) continue;
      if (m.boss) { G.Boss.act(S, m); if (S.dead) return; continue; }
      const dx = S.p.x - m.x, dy = S.p.y - m.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1) {
        hurt(m.atk + S.rng.int(-1, 2), m.name); if (S.dead) return;
      } else if (S.vis[m.y * W + m.x]) {
        const sx = Math.sign(dx), sy = Math.sign(dy);
        const o = (Math.abs(dx) > Math.abs(dy)) ? [[sx, 0], [0, sy], [sx, sy]] : [[0, sy], [sx, 0], [sx, sy]];
        const s = o.find(([a, b]) => (a || b) && free(m.x + a, m.y + b)); if (s) { m.x += s[0]; m.y += s[1]; }
      } else if (S.rng.chance(.3)) {
        const a = S.rng.int(-1, 1), b = S.rng.int(-1, 1); if (free(m.x + a, m.y + b)) { m.x += a; m.y += b; }
      }
    }
  };

  const statusTick = () => {
    const dp = G.Status.tick(S.p, S.depth);
    if (dp) { S.p.hp -= dp; fx(S.p.x, S.p.y, '-' + dp, '#7fdc4f'); snd('hurt'); if (S.p.hp <= 0) return die('Яд и огонь тебя доконали.'); }
    for (const m of S.monsters.slice()) {
      const d = G.Status.tick(m, S.depth);
      if (d) { m.hp -= d; fx(m.x, m.y, '-' + d, '#ff9d4d'); if (m.hp <= 0) kill(m, 'не пережил(а) яд и огонь'); }
    }
    G.Boss.check(S);
  };

  const endTurn = () => { enemyTurn(); if (!S.dead) statusTick(); S.look(); if (!S.dead) G.Save.write(S); };

  const trap = it => {
    S.items = S.items.filter(i => i !== it); S.shake = 6;
    say(`Ловушка: ${it.name}!`, '#ff9d4d'); hint('trap', 'Знак ^ на полу — ловушка. Обходи её стороной.');
    if (it.sub === 'spike') hurt(4 + Math.ceil(S.depth * 1.5), 'Шипы');
    else { const s = G.Status.T[it.sub]; G.Status.apply(S.p, it.sub, { poison: 6, burn: 4, freeze: 2 }[it.sub]); snd('fire'); say(`${s.ico} ${s.name}!`, s.col); }
  };

  const pickup = () => {
    const it = S.items.find(i => i.x === S.p.x && i.y === S.p.y); if (!it) return;
    if (it.kind === 'trap') return trap(it);
    if (it.kind === 'gold') { S.items = S.items.filter(i => i !== it); S.gold += it.power; snd('coin'); say(`+${it.power} золота.`, '#ffd34d'); return; }
    if (it.kind === 'key') { S.items = S.items.filter(i => i !== it); S.p.keys++; snd('pickup'); say('Подобран ключ 🗝', '#ffd34d'); return; }
    if (it.kind === 'weapon' || it.kind === 'armor') {
      S.items = S.items.filter(i => i !== it);
      const cur = S.p[it.kind];
      if (!cur || it.power > cur.power) { S.p[it.kind] = it; snd('pickup'); say(`Экипировано: ${it.name} (+${it.power}).`, '#ffd34d'); }
      else say(`${it.name} хуже твоего — оставлено.`);
    } else if (S.p.inv.length < 9) {
      S.items = S.items.filter(i => i !== it); S.p.inv.push(it); snd('pickup'); say(`Подобрано: ${it.name}.`, '#6ad1ff');
      hint('inv', 'Предмет в инвентаре: клик или цифра — использовать, ПКМ — выбросить.');
    } else say('Инвентарь полон.');
  };

  S.act = (dx, dy) => {
    if (S.dead) return;
    if (G.Status.has(S.p, 'freeze')) { say('❄ Ты заморожен и не можешь двигаться!', '#7fe9ff'); return endTurn(); }
    const nx = S.p.x + dx, ny = S.p.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const m = monsterAt(nx, ny), ti = ny * W + nx;
    if (m) S.attack(m);
    else {
      const blk = S.items.find(i => i.x === nx && i.y === ny && (i.kind === 'door' || i.kind === 'shop'));
      if (blk?.kind === 'shop') return G.Shop.open();
      if (blk?.kind === 'door') {
        if (S.p.keys > 0) { S.p.keys--; S.items = S.items.filter(i => i !== blk); snd('pickup'); say('Ключ повернулся — дверь открыта!', '#ffd34d'); }
        else { say('Дверь заперта. Нужен ключ.', '#ff9d4d'); return; }
      } else if (S.map.tiles[ti] === G.T.WALL) {
        const k = S.secrets.findIndex(s => s.x === nx && s.y === ny);
        if (k < 0) return;
        S.secrets.splice(k, 1); S.map.tiles[ti] = G.T.FLOOR; snd('tele'); say('Стена поддалась — тайный ход!', '#6ad1ff');
      } else if (dx || dy) { S.p.x = nx; S.p.y = ny; snd('step'); pickup(); }
    }
    endTurn();
  };

  S.useStairs = () => {
    if (S.map.tiles[S.p.y * W + S.p.x] === G.T.STAIRS) S.descend();
    else if (S.boss && !S.bossDead) say('Лестница появится, когда ты победишь босса.', '#ff9d4d');
    else say('Здесь нет лестницы.');
  };

  S.use = i => {
    const it = S.p.inv[i]; if (!it || S.dead) return;
    if (it.kind === 'heal') { const h = Math.min(it.power, S.p.max - S.p.hp); S.p.hp += h; fx(S.p.x, S.p.y, '+' + h, '#6fdc6f'); snd('potion'); say(`Лечение: +${h}.`, '#6fdc6f'); }
    if (it.kind === 'str') { S.p.atk++; snd('potion'); say('Сила растёт: +1 к атаке.', '#c77dff'); }
    if (it.kind === 'cure') { G.Status.clear(S.p); snd('potion'); say('Все эффекты сняты.', '#7fff7f'); }
    if (it.kind === 'map') { S.seen.fill(1); snd('tele'); say('Карта этажа раскрыта.', '#6fdc6f'); }
    if (it.kind === 'frost') {
      snd('tele'); say('❄ Ледяная волна!', '#9fe8ff');
      S.monsters.filter(m => S.vis[m.y * W + m.x]).forEach(m => { if (G.Status.apply(m, 'freeze', 3)) fx(m.x, m.y, '❄', '#9fe8ff'); });
    }
    if (it.kind === 'fire') {
      snd('fire'); S.shake = 6; say('Огненная вспышка!', '#ff9d4d');
      S.monsters.filter(m => S.vis[m.y * W + m.x]).forEach(m => {
        m.hp -= it.power; fx(m.x, m.y, '-' + it.power, '#ff9d4d'); G.Status.apply(m, 'burn', 3);
        if (m.hp <= 0) kill(m, 'сгорел(а)');
      });
      G.Boss.check(S);
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
    const m = monsterAt(x, y);
    if (m) { const st = G.Status.label(m); return `<b style="color:${m.color}">${m.name}${m.boss ? ' (БОСС)' : ''}</b><br>HP ${m.hp}/${m.max} · Атака ${m.atk}${st ? '<br>' + st : ''}`; }
    const it = S.items.find(i => i.x === x && i.y === y);
    if (it) return `<b style="color:${it.color}">${it.name}</b><br>${G.describe(it)}`;
    if (S.map.tiles[y * W + x] === G.T.STAIRS) return '<b>Лестница вниз</b><br>Встань и нажми Enter';
    return '';
  };

  // Доступ для других модулей (boss.js, extras.js, shop.js)
  S.say = say; S.snd = snd; S.free = free; S.hint = hint; S.floatText = fx; S.hurt = hurt;
  return S;
})();