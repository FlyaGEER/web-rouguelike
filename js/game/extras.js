// Ловушки, элитные враги, секретные комнаты и хранилища, торговец, новые предметы
(() => {
  // Новые предметы подмешиваются в генератор, описания берутся из поля desc
  const mk0 = G.makeItem, d0 = G.describe;
  G.makeItem = (rng, d) => {
    if (rng.chance(.1)) return { kind: 'frost', name: 'Свиток льда', ch: '?', color: '#9fe8ff', desc: 'Замораживает врагов в поле зрения на 3 хода' };
    if (rng.chance(.08)) return { kind: 'cure', name: 'Противоядие', ch: '!', color: '#7fff7f', desc: 'Снимает яд, горение и заморозку' };
    return mk0(rng, d);
  };
  G.describe = it => it.desc || d0(it);
})();

G.Extras = (() => {
  const T = G.T;
  const KEY = { kind: 'key', name: 'Ржавый ключ', ch: 'k', color: '#ffd34d', desc: 'Открывает запертую дверь хранилища' };
  const TRAPS = [['spike', 'Шипы', '#c0c0c0', 'урон при наступании'], ['poison', 'Ядовитый газ', '#7fdc4f', 'отравляет'], ['burn', 'Огненная руна', '#ff7a2a', 'поджигает'], ['freeze', 'Ледяная руна', '#7fe9ff', 'замораживает']];
  const BASE = { heal: 25, fire: 40, tele: 35, map: 30, str: 90, frost: 35, cure: 25 };
  const price = (it, d) => Math.round((BASE[it.kind] || 50 + (it.power || 0) * 18) * (1 + d * .08));

  const spot = (S, r) => {
    for (let i = 0; i < 25; i++) {
      const x = S.rng.int(r.x, r.x + r.w - 1), y = S.rng.int(r.y, r.y + r.h - 1);
      if (S.free(x, y) && S.map.tiles[y * S.W + x] === T.FLOOR && !S.items.some(o => o.x === x && o.y === y)) return { x, y };
    }
    return null;
  };
  const stock = S => {
    const out = [{ kind: 'heal', name: 'Зелье лечения', ch: '!', color: '#ff4d6d', power: 12 + S.depth * 2 }];
    for (let n = 0; n < 40 && out.length < 4; n++) {
      const it = G.makeItem(S.rng, S.depth + 1);
      if (it.kind === 'gold' || ((it.kind === 'weapon' || it.kind === 'armor') && it.power <= (S.p[it.kind]?.power || 0))) continue;
      out.push(it);
    }
    return out.map(it => ({ ...it, price: price(it, S.depth) }));
  };

  // Комната 3x3 в толще стены + тоннель к ближайшему полу. Дверь: тайная (стена, ищи простукиванием) или запертая
  const vault = S => {
    const { W, H, tiles } = S.map, at = (x, y) => y * W + x;
    for (let n = 0; n < 80; n++) {
      const cx = S.rng.int(5, W - 6), cy = S.rng.int(5, H - 6);
      let ok = true;
      for (let y = cy - 3; y <= cy + 3 && ok; y++) for (let x = cx - 3; x <= cx + 3; x++) if (tiles[at(x, y)] !== T.WALL) { ok = false; break; }
      if (!ok) continue;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => S.rng.next() - .5)) {
        const path = []; let x = cx + dx * 2, y = cy + dy * 2;
        while (x > 0 && y > 0 && x < W - 1 && y < H - 1 && tiles[at(x, y)] === T.WALL && path.length < 14) { path.push([x, y]); x += dx; y += dy; }
        if (path.length < 2 || x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1 || tiles[at(x, y)] === T.WALL) continue;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tiles[at(cx + i, cy + j)] = T.FLOOR;
        const locked = S.rng.chance(.5);
        path.forEach(([px, py], k) => { if (k === 0 && !locked) S.secrets.push({ x: px, y: py }); else tiles[at(px, py)] = T.FLOOR; });
        if (locked) S.items.push({ kind: 'door', name: 'Запертая дверь', ch: '+', color: '#c08040', desc: 'Нужен ключ. Его держит элитный враг', x: path[0][0], y: path[0][1] });
        [[0, 0], [-1, 0], [1, 0]].forEach(([i, j]) => S.items.push({
          ...(i === 1 ? { kind: 'gold', name: 'Золото', ch: '$', color: '#ffd34d', power: 40 * S.depth } : G.makeItem(S.rng, S.depth + 2)), x: cx + i, y: cy + j }));
        return { locked };
      }
    }
    return null;
  };

  const populate = S => {
    const rs = S.map.rooms, mid = rs.slice(1, -1), d = S.depth, k = 1 + (d - 1) * .12;
    // ловушки
    for (let n = Math.min(8, 2 + (d >> 1)); n > 0; n--) {
      const p = spot(S, S.rng.pick(rs.slice(0, -1))), t = S.rng.pick(TRAPS);
      if (p) S.items.push({ kind: 'trap', sub: t[0], name: t[1], ch: '^', color: t[2], desc: 'Ловушка: ' + t[3], ...p });
    }
    // элитный враг (мини-босс)
    let elite = null;
    if (d >= 2 && mid.length && S.rng.chance(.6)) {
      const t = S.rng.pick(G.MONSTERS.filter(m => m.minDepth <= d).slice(-4)), p = spot(S, S.rng.pick(mid));
      if (p) {
        elite = { ...t, name: 'Элитный ' + t.name, elite: true, hp: Math.ceil(t.hp * 3 * k), atk: Math.ceil(t.atk * 1.4 * k), xp: t.xp * 4, ...p };
        elite.max = elite.hp; S.monsters.push(elite);
      }
    }
    // тайная комната или запертое хранилище
    const v = d >= 2 && S.rng.chance(.7) ? vault(S) : null;
    if (v?.locked) {
      if (elite) elite.drop = { ...KEY };
      else { const p = spot(S, S.rng.pick(mid.length ? mid : [rs[0]])); if (p) S.items.push({ ...KEY, ...p }); }
      S.hint('lock', 'На этаже есть запертая дверь (+). Ключ держит элитный враг или он лежит на полу.');
    } else if (v) S.hint('secret', 'На этаже есть тайная комната. Простукивай подозрительные тупики: иди в стену.');
    if (elite && !elite.drop) elite.drop = G.makeItem(S.rng, d + 1);
    // торговец на чётных этажах
    if (d % 2 === 0 && mid.length) {
      const p = spot(S, S.rng.pick(mid));
      if (p) {
        S.shop = { ...p, stock: stock(S) };
        S.items.push({ kind: 'shop', name: 'Торговец', ch: 'S', color: '#ffd34d', desc: 'Подойди вплотную, чтобы торговать', ...p });
        S.hint('shop', 'На этаже торговец (S). Иди на него: откроется лавка. Золото можно тратить на зелья и снаряжение.');
      }
    }
  };
  return { populate };
})();