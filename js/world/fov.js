// Поле зрения: лучи по периметру квадрата + Брезенхэм
G.FOV = {
  compute(map, px, py, R, vis) {
    const { W, H, tiles } = map; vis.fill(0);
    vis[py * W + px] = 1;
    const ray = (tx, ty) => {
      let x = px, y = py; const dx = Math.abs(tx - x), dy = Math.abs(ty - y);
      const sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1; let e = dx - dy;
      while (x !== tx || y !== ty) {
        const e2 = 2 * e; if (e2 > -dy) { e -= dy; x += sx; } if (e2 < dx) { e += dx; y += sy; }
        if (x < 0 || y < 0 || x >= W || y >= H || (x - px) ** 2 + (y - py) ** 2 > R * R) return;
        vis[y * W + x] = 1; if (tiles[y * W + x] === G.T.WALL) return;
      }
    };
    for (let i = -R; i <= R; i++) { ray(px + i, py - R); ray(px + i, py + R); ray(px - R, py + i); ray(px + R, py + i); }
  },
};