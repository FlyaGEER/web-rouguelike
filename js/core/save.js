// Сохранения и таблица рекордов (localStorage)
G.Save = (() => {
  const SAVE = 'abyss_save_v1', HI = 'abyss_scores_v1';
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  return {
    has: () => !!get(SAVE, null),
    read: () => get(SAVE, null),
    clear: () => { try { localStorage.removeItem(SAVE); } catch (e) {} },
    write: S => set(SAVE, {
      seed: S.seed, depth: S.depth, gold: S.gold, kills: S.kills, p: S.p, hints: S.hints, log: S.log.slice(-25),
      stairs: S.stairs, bossDead: S.bossDead, shop: S.shop, secrets: S.secrets, monsters: S.monsters, items: S.items,
      tiles: Array.from(S.map.tiles), rooms: S.map.rooms, seen: Array.from(S.seen),
    }),
    scores: () => get(HI, []),
    addScore: r => { const a = get(HI, []); a.push(r); a.sort((x, y) => y.score - x.score); a.length = Math.min(a.length, 10); set(HI, a); return a; },
  };
})();