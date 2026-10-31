// Мини-карта: 2 пикселя на клетку
G.Minimap = canvas => {
  const c = canvas.getContext('2d'), S = G.Game;
  return () => {
    c.fillStyle = '#0a0812'; c.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
      const i = y * S.W + x; if (!S.seen[i] || S.map.tiles[i] === G.T.WALL) continue;
      c.fillStyle = S.map.tiles[i] === G.T.STAIRS ? '#ffd34d' : (S.vis[i] ? '#6a5f9a' : '#352e55');
      c.fillRect(x * 2, y * 2, 2, 2);
    }
    S.monsters.forEach(m => { if (S.vis[m.y * S.W + m.x]) { c.fillStyle = '#f33'; c.fillRect(m.x * 2, m.y * 2, 2, 2); } });
    c.fillStyle = '#fff'; c.fillRect(S.p.x * 2 - 1, S.p.y * 2 - 1, 4, 4);
  };
};