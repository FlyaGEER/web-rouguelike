// Эффекты: яд, горение, заморозка. Кто что наносит — в G.INFLICT
G.INFLICT = { 'Летучая мышь': 'poison', 'Некромант': 'poison', 'Скелет': 'freeze', 'Призрак': 'freeze', 'Лич': 'freeze', 'Дракон': 'burn', 'Дракон Бездны': 'burn' };
G.Status = (() => {
  const T = { poison: { ico: '☠', name: 'яд', col: '#7fdc4f' }, burn: { ico: '🔥', name: 'горение', col: '#ff7a2a' }, freeze: { ico: '❄', name: 'заморозка', col: '#7fe9ff' } };
  return {
    T,
    apply(e, type, n) { if (e.boss && type === 'freeze') return false; (e.st = e.st || {})[type] = Math.max(e.st[type] || 0, n); return true; },
    has: (e, t) => (e.st?.[t] || 0) > 0,
    clear: e => { e.st = {}; },
    // конец хода: уменьшает таймеры, возвращает урон от яда и огня
    tick(e, depth) {
      let d = 0; if (!e.st) return 0;
      for (const t in e.st) {
        if (e.st[t] <= 0) continue;
        if (t === 'poison') d += 1 + (depth >> 2);
        if (t === 'burn') d += 2 + Math.floor(depth / 3);
        e.st[t]--;
      }
      return d;
    },
    label: e => Object.keys(e.st || {}).filter(t => e.st[t] > 0).map(t => `${T[t].ico}${e.st[t]}`).join(' '),
  };
})();