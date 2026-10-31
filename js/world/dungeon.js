// Процедурная генерация: комнаты + L-коридоры. Замени на BSP/пещеры/клеточные автоматы.
G.T = { WALL: 0, FLOOR: 1, STAIRS: 2 };
G.Dungeon = {
  generate(W, H, rng) {
    const tiles = new Uint8Array(W * H), rooms = [];
    const carve = (x, y) => { tiles[y * W + x] = G.T.FLOOR; };
    for (let n = 0; n < 80 && rooms.length < 14; n++) {
      const w = rng.int(4, 11), h = rng.int(3, 7), x = rng.int(1, W - w - 2), y = rng.int(1, H - h - 2);
      if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j);
      const room = { x, y, w, h, cx: x + w / 2 | 0, cy: y + h / 2 | 0 };
      if (rooms.length) {
        const p = rooms[rooms.length - 1];
        let cx = p.cx, cy = p.cy;
        const hor = () => { while (cx !== room.cx) { cx += Math.sign(room.cx - cx); carve(cx, cy); } };
        const ver = () => { while (cy !== room.cy) { cy += Math.sign(room.cy - cy); carve(cx, cy); } };
        rng.chance(.5) ? (hor(), ver()) : (ver(), hor());
      }
      rooms.push(room);
    }
    const last = rooms[rooms.length - 1];
    tiles[last.cy * W + last.cx] = G.T.STAIRS;
    return { W, H, tiles, rooms };
  },
};