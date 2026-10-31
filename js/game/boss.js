// Боссы: способности, телеграфы (красные клетки = следующий удар), награда
G.Boss = (() => {
  const inMap = (S, x, y) => x >= 0 && y >= 0 && x < S.W && y < S.H && S.map.tiles[y * S.W + x] !== G.T.WALL;
  const area = (S, m, r, round) => {
    const o = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if ((!dx && !dy) || (round && dx * dx + dy * dy > r * r + 1)) continue;
      if (inMap(S, m.x + dx, m.y + dy)) o.push([m.x + dx, m.y + dy]);
    }
    return o;
  };
  const line = (S, m, len) => {
    const sx = Math.sign(S.p.x - m.x), sy = Math.sign(S.p.y - m.y), o = [];
    let x = m.x, y = m.y; if (!sx && !sy) return o;
    for (let i = 0; i < len; i++) { x += sx; y += sy; if (!inMap(S, x, y)) break; o.push([x, y]); }
    return o;
  };
  const wind = (m, type, cells, mul, color) => { m.tele = { type, cells, dmg: Math.ceil(m.atk * mul), color }; return true; };

  const ABIL = {
    summon: (S, m) => {
      if (S.monsters.length > 22) return false;
      const base = G.MONSTERS.find(t => t.name === m.minion) || G.MONSTERS[0], k = 1 + (S.depth - 1) * .12; let n = 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]])
        if (n < 2 && S.free(m.x + a, m.y + b)) { S.monsters.push({ ...base, hp: Math.ceil(base.hp * k), max: Math.ceil(base.hp * k), atk: Math.ceil(base.atk * k), xp: 2, x: m.x + a, y: m.y + b }); n++; }
      if (n) S.say(`${m.name} призывает подмогу!`, m.color);
      return n > 0;
    },
    stomp: (S, m) => (S.say(`${m.name} заносит кулак...`, '#ff8a4d'), wind(m, 'stomp', area(S, m, 1), 1.3, '#ff8a4d')),
    nova: (S, m) => (S.say(`${m.name} копит энергию!`, '#ff8a4d'), wind(m, 'nova', area(S, m, 2, true), 1.4, '#ff5a2a')),
    breath: (S, m) => { const c = line(S, m, 7); if (!c.length) return false; S.say(`${m.name} вдыхает пламя!`, '#ff5a2a'); return wind(m, 'breath', c, 1.5, '#ff5a2a'); },
    charge: (S, m) => { const c = line(S, m, 6); if (!c.length) return false; S.say(`${m.name} разгоняется!`, '#ffd34d'); return wind(m, 'charge', c, 1.2, '#ffd34d'); },
    bolt: (S, m, d) => { if (d > 8) return false; S.say(`${m.name} шлёт заряд!`, m.color); S.snd('fire'); S.hurt(Math.ceil(m.atk * .9), m.name); return true; },
    blink: (S, m) => {
      for (let i = 0; i < 30; i++) {
        const x = S.p.x + S.rng.int(-5, 5), y = S.p.y + S.rng.int(-5, 5);
        if (inMap(S, x, y) && S.free(x, y) && Math.max(Math.abs(x - S.p.x), Math.abs(y - S.p.y)) >= 3) { m.x = x; m.y = y; S.snd('tele'); S.say(`${m.name} исчезает и появляется рядом!`, m.color); return true; }
      }
      return false;
    },
    drain: (S, m, d) => { if (d > 3) return false; const v = Math.ceil(m.atk * .8); S.say(`${m.name} высасывает жизнь!`, '#c77dff'); S.hurt(v, m.name); m.hp = Math.min(m.max, m.hp + v); return true; },
  };

  const run = (S, m) => { // исполнение подготовленной атаки
    const t = m.tele; m.tele = null;
    if (t.type === 'charge') for (const [x, y] of t.cells) { if (!S.free(x, y)) break; m.x = x; m.y = y; }
    t.cells.forEach(([x, y]) => S.floatText(x, y, '✸', t.color));
    S.shake = 6; S.snd('fire');
    if (t.cells.some(([x, y]) => x === S.p.x && y === S.p.y)) S.hurt(t.dmg, m.name);
  };

  const spawn = (S, room) => {
    const loop = Math.floor((S.depth - 1) / G.BOSSES.length), t = G.BOSSES[(S.depth - 1) % G.BOSSES.length];
    const k = (1 + (S.depth - 1) * .14) * (1 + loop * .35), hp = Math.ceil(t.hp * k);
    S.boss = { ...t, boss: true, hp, max: hp, atk: Math.ceil(t.atk * k), x: room.cx, y: room.cy, awake: false, cd: 2, tele: null, enraged: false, tick: 0 };
    S.monsters.push(S.boss);
  };
  const wake = S => {
    const b = S.boss; if (!b || b.awake || b.hp <= 0 || !S.vis[b.y * S.W + b.x]) return;
    b.awake = true; S.shake = 8; S.snd('stairs'); S.say(`⚔ ${b.name}: «${b.taunt}»`, b.color);
    S.hint('boss', 'БОСС! Красные клетки — его следующий удар: сойди с них. Убей его — откроется лестница.');
    G.Music.start(b.theme);
  };
  const act = (S, m) => {
    if (!m.awake || S.dead) return;
    if (!m.enraged && m.hp < m.max / 2) { m.enraged = true; m.atk = Math.ceil(m.atk * 1.25); S.say(`${m.name} в ЯРОСТИ!`, '#ff3d3d'); S.shake = 10; G.Music.rage(); }
    if (m.tele) return run(S, m);
    const p = S.p, dx = p.x - m.x, dy = p.y - m.y, dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (--m.cd <= 0 && dist <= 9) { m.cd = m.enraged ? 2 : 4; if (ABIL[S.rng.pick(m.abilities)](S, m, dist)) return; }
    if (dist <= 1) return S.hurt(m.atk + S.rng.int(-1, 2), m.name);
    if (m.slow && ++m.tick % 2) return;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    const o = Math.abs(dx) > Math.abs(dy) ? [[sx, 0], [0, sy], [sx, sy]] : [[0, sy], [sx, 0], [sx, sy]];
    const s = o.find(([a, b]) => (a || b) && S.free(m.x + a, m.y + b)); if (s) { m.x += s[0]; m.y += s[1]; }
  };
  const defeated = (S, b) => {
    if (S.bossDead) return; S.bossDead = true; G.Music.stop();
    S.map.tiles[S.stairs.y * S.W + S.stairs.x] = G.T.STAIRS; S.seen[S.stairs.y * S.W + S.stairs.x] = 1;
    const heal = Math.ceil(S.p.max * .3); S.p.hp = Math.min(S.p.max, S.p.hp + heal);
    S.gold += 50 * S.depth; S.items.push({ ...G.makeItem(S.rng, S.depth + 2), x: b.x, y: b.y });
    S.snd('level'); S.shake = 10;
    S.say(`★ ${b.name} повержен! +${heal} HP, +${50 * S.depth} золота. Лестница открыта (>).`, '#ffd34d');
  };
  const check = S => { if (S.boss && S.boss.hp <= 0) defeated(S, S.boss); };
  return { spawn, wake, act, check };
})();