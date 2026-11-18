import { FOES, UPGRADES } from './content.js';

// Deterministic editorial snapshots of possible runs. All entities, effects,
// menus and controls come from the same game renderer and gameplay systems.
// Opt-in via ?shot= only; ordinary play always begins at the title screen.
export function setSnapshot(run, name) {
  run.reset(); run.curated = true; run.assisted = true; run.bannerTime = 0;
  if (name === 'title') { run.state = 'title'; return; }
  run.wave = 8; run.realm = 2; run.state = 'playing';
  run.score = 63660; run.cullet = 1006; run.combo = 4.5; run.comboTime = 5.4;
  run.elapsed = 708; run.time = 27; run.heat = 115; run.kills = 147; run.traps = 189; run.shatters = 83; run.bestChain = 6;
  run.upgrades = { fracture: 3, lung: 2, tether: 2, frostbite: 1, sunheart: 2 };
  run.relics = ['winter', 'phoenix', 'mirror', 'heart', 'star', 'seed'];
  run.player.x = 500; run.player.y = 558; run.player.angle = -2.55; run.player.walk = .8;
  run.boss = { x: 699, y: 426, r: 62, hp: 1284, maxHp: 2150, phase: 2, age: 28, attack: 2, laser: { angle: -.26, length: 340, time: 1.2, tell: .95, duration: 1.9 }, type: 'solar', hit: 0 };
  function enemy(kind, x, y) { const e = run.spawnEnemy(kind, x, y); e.age = 3 + x / 99; e.spawn = 0; return e; }
  const trapped1 = [enemy('rime', 360, 435), enemy('rime', 390, 448)];
  const trapped2 = [enemy('charger', 486, 400)];
  const trapped3 = [enemy('cinder', 936, 508), enemy('rime', 899, 520)];
  const bubble = (x, y, r, element, enemies) => {
    const b = { id: run.nextId++, x, y, r, element, age: .9, active: true, life: 7, vx: 0, vy: 0, trappedIds: enemies.map(e => e.id) };
    enemies.forEach(e => { e.trapped = b.id; }); run.bubbles.push(b); return b;
  };
  bubble(376, 442, 64, 0, trapped1); bubble(492, 405, 58, 2, trapped2); bubble(925, 516, 62, 0, trapped3);
  enemy('sentinel', 810, 370); enemy('charger', 867, 625); enemy('spitter', 1011, 414);
  enemy('rime', 260, 625); enemy('cinder', 580, 305); enemy('rime', 795, 578); enemy('cinder', 311, 518);
  const knight = enemy('charger', 566, 654); knight.charge = .4; knight.ax = -.4; knight.ay = -.9;
  run.spawnQueue = ['rime', 'rime', 'rime', 'charger', 'sentinel', 'spitter'];
  run.ring(650, 570, 160, '#ffc77b', .85); run.rings[0].life = .44;
  run.ring(761, 545, 124, '#afdfff', .8); run.rings[1].life = .46;
  run.burst(656, 557, '#e5cbff', 38, 230); run.burst(760, 536, '#ffca84', 30, 200);
  run.updateEffects(.16);
  run.float('CHAIN x2!', 667, 494, '#ffe2a0', 34, 4);
  run.float('SHATTER!', 746, 619, '#d3f8ff', 23, 4);
  run.float('+325', 827, 468, '#fff0c0', 29, 4);
  run.float('+95', 607, 574, '#e2f9ff', 25, 4);
  run.float('+90', 841, 553, '#ffddb3', 23, 4);
  run.float('AETHER GLASSBLOWER', 489, 620, '#d1e9e9', 10, 4);
  // A live charge shows the artisan's molten thread, not a painted screenshot effect.
  run.charge = { id: run.nextId++, x: 437, y: 515, r: 27, element: 1, age: .7, active: false, life: 8, trappedIds: [], angle: -2.55, vx: 0, vy: 0 };
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2 + .1;
    run.shoot(699 + Math.cos(angle) * 123, 421 + Math.sin(angle) * 108, angle, 90, '#ffbd74');
  }
  for (const [x, y, value] of [[474, 611, 12], [442, 557, 8], [833, 492, 8], [763, 622, 10], [638, 644, 12], [812, 651, 8], [294, 437, 8], [1013, 577, 8]]) run.drop(x, y, value);
  if (name === 'upgrade') {
    run.labels = []; run.charge = null;
    run.state = 'forge'; run.wave = 7; run.boss = null;
    run.merchantRelic = 'lens'; run.merchantPrice = 150;
    run.offers = ['fracture', 'anneal', 'choir'].map(id => UPGRADES.find(u => u.id === id));
  }
  if (name === 'victory' || name === 'gameover') {
    run.labels = []; run.charge = null;
    run.state = 'victory'; run.score = 98420; run.elapsed = 742; run.kills = 168; run.bestChain = 6;
    run.boss = null; run.damageTaken = 62; run.best.score = Math.max(run.best.score, run.score);
  }
  if (name === 'defeat') { run.state = 'defeat'; run.player.hp = 0; run.endReason = 'The solar lance caught you. Dash through it, or hide behind a pillar.'; }
}
