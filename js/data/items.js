// kind: heal | fire | tele | map | str | gold | weapon | armor
G.WEAPONS = [['Кинжал', 2], ['Меч', 4], ['Топор', 6], ['Клеймор', 9]];
G.ARMORS  = [['Кожанка', 1], ['Кольчуга', 2], ['Латы', 4], ['Мифрил', 6]];
G.makeItem = (rng, depth) => {
  const r = rng.next(), tier = Math.min(3, Math.floor((depth + rng.int(0, 2)) / 2));
  if (r < .25) return { kind: 'gold', name: 'Золото', ch: '$', color: '#ffd34d', power: rng.int(5, 15) * depth };
  if (r < .45) return { kind: 'heal', name: 'Зелье лечения', ch: '!', color: '#ff4d6d', power: 12 + depth * 2 };
  if (r < .55) return { kind: 'fire', name: 'Свиток огня', ch: '?', color: '#ff9d4d', power: 8 + depth * 3 };
  if (r < .62) return { kind: 'tele', name: 'Свиток телепорта', ch: '?', color: '#6ad1ff' };
  if (r < .68) return { kind: 'map', name: 'Свиток карты', ch: '?', color: '#6fdc6f' };
  if (r < .73) return { kind: 'str', name: 'Зелье силы', ch: '!', color: '#c77dff' };
  if (r < .87) { const [n, p] = G.WEAPONS[tier]; return { kind: 'weapon', name: n, ch: '/', color: '#d0d8e8', power: p }; }
  const [n, p] = G.ARMORS[tier]; return { kind: 'armor', name: n, ch: '[', color: '#c0a060', power: p };
};
G.describe = it => ({
  heal: `Восстанавливает ${it.power} HP`,
  fire: `Огонь: ${it.power} урона всем в поле зрения`,
  tele: 'Телепортирует в случайную комнату',
  map: 'Открывает карту всего этажа',
  str: '+1 к атаке навсегда',
  gold: `${it.power} золота (очки)`,
  weapon: `Оружие: +${it.power} к атаке (экипируется само, если лучше)`,
  armor: `Броня: −${it.power} к получаемому урону (экипируется само)`,
}[it.kind] || '');