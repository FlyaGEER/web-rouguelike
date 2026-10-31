// Боссы и биомы. Чтобы добавить босса, допишите объект в G.BOSSES
// abilities: summon | stomp | nova | breath | charge | bolt | blink | drain
G.BOSSES = [
  { name: 'Король Крыс',    ch: 'R', color: '#c49a6c', hp: 28,  atk: 3,  xp: 40,  theme: 'punk',   abilities: ['summon', 'charge'], minion: 'Крыса', taunt: 'Пиии! Это МОЯ канализация!' },
  { name: 'Некромант',      ch: 'N', color: '#b08bff', hp: 55,  atk: 5,  xp: 70,  theme: 'doom',   abilities: ['summon', 'drain', 'bolt'], minion: 'Скелет', taunt: 'Твои кости станут моей армией...' },
  { name: 'Каменный Голем', ch: 'M', color: '#b9b4a6', hp: 90,  atk: 6,  xp: 100, theme: 'stoner', abilities: ['stomp', 'charge'], slow: true, taunt: 'ГРООООМ.' },
  { name: 'Лич',            ch: 'L', color: '#7fe9ff', hp: 80,  atk: 7,  xp: 130, theme: 'metal',  abilities: ['blink', 'bolt', 'nova', 'summon'], minion: 'Призрак', taunt: 'Время — моё оружие.' },
  { name: 'Дракон Бездны',  ch: 'D', color: '#ff5a2a', hp: 140, atk: 10, xp: 250, theme: 'thrash', abilities: ['breath', 'nova', 'charge', 'stomp'], taunt: 'ГОРИ!' },
];
// wall/floor — базовый RGB (затемняется освещением)
G.BIOMES = [
  { name: 'Подвал',        wall: [70, 52, 44],  floor: [130, 105, 90] },
  { name: 'Склеп',         wall: [52, 42, 90],  floor: [120, 100, 160] },
  { name: 'Каменные копи', wall: [70, 70, 76],  floor: [140, 140, 150] },
  { name: 'Ледяной чертог', wall: [38, 70, 96], floor: [100, 160, 200] },
  { name: 'Огненная бездна', wall: [100, 36, 24], floor: [190, 90, 50] },
];
G.biomeFor = d => G.BIOMES[(d - 1) % G.BIOMES.length];