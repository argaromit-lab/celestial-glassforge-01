import test from 'node:test';
import assert from 'node:assert/strict';
import { GlassforgeRun, COVER } from '../game/simulation.js';
import { random, segmentDistance, dist } from '../game/math.js';
import { UPGRADES, RELICS, realmForWave, bossForWave } from '../game/content.js';
import { ArenaNavigation } from '../game/navigation.js';
import { describeReaction, primeElement, spreadPrismBurn } from '../game/element-reactions.js';
import { purchaseService, purchaseRelic } from '../game/forge-services.js';
import { buyTool, normalizeWorkshop, applyStartingTool, awardMilestones } from '../game/workshop.js';

const memory = new Map();
globalThis.localStorage = {
  getItem(key) { return memory.get(key) ?? null; },
  setItem(key, value) { memory.set(key, value); },
};

function fresh() {
  memory.clear();
  const audio = { event() {}, update() {} };
  const run = new GlassforgeRun(audio);
  run.begin(0);
  run.spawnQueue = [];
  run.enemies = [];
  run.bannerTime = 0;
  return run;
}

function glass(run, x, y, element = 0, radius = 48) {
  const bubble = {
    id: run.nextId++,
    x,
    y,
    r: radius,
    element,
    age: 1,
    life: 8,
    active: true,
    trappedIds: [],
    vx: 0,
    vy: 0,
  };
  run.bubbles.push(bubble);
  return bubble;
}

test('seeded content generation is reproducible and nonconstant', () => {
  const first = random(88);
  const second = random(88);
  const third = random(89);
  const a = Array.from({ length: 20 }, () => first());
  const b = Array.from({ length: 20 }, () => second());
  const c = Array.from({ length: 20 }, () => third());
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.every(value => value >= 0 && value < 1));
});

test('all eight waves belong to the intended realm and exactly two bosses', () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => realmForWave(i + 1)), [0, 0, 1, 1, 1, 2, 2, 2]);
  const bosses = Array.from({ length: 8 }, (_, i) => bossForWave(i + 1)).filter(Boolean);
  assert.equal(bosses.length, 2);
  assert.ok(bosses[0].includes('RIME'));
  assert.ok(bosses[1].includes('HELIOS'));
});

test('line distance clamps both ends of a finite laser', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };
  assert.equal(segmentDistance({ x: 5, y: 3 }, a, b), 3);
  assert.equal(segmentDistance({ x: 13, y: 0 }, a, b), 3);
  assert.equal(segmentDistance({ x: -4, y: 0 }, a, b), 4);
});

test('solid cover separates player and obstacle collision volumes', () => {
  const run = fresh();
  const cover = COVER[0];
  run.player.x = cover.x + 5;
  run.player.y = cover.y + 4;
  run.collideCover(run.player);
  assert.ok(dist(run.player, cover) >= run.player.r + cover.r - .001);
});

test('navigation routes around a crystal instead of through it', () => {
  const navigation = new ArenaNavigation(COVER, 20);
  const start = { x: 280, y: 356 };
  const goal = { x: 410, y: 356 };
  assert.equal(navigation.clearLine(start, goal), false);
  const path = navigation.findPath(start, goal);
  assert.ok(path.length > 1);
  assert.ok(path.some(point => Math.abs(point.y - 356) > 35));
  for (const point of path) {
    assert.ok(COVER.every(c => dist(point, c) >= c.r + 15));
  }
});

test('glass captures an enemy and expiry releases it without a softlock', () => {
  const run = fresh();
  const foe = run.spawnEnemy('rime', 520, 460);
  foe.spawn = 0;
  const bubble = glass(run, 520, 460);
  run.updateBubbles(1 / 60);
  assert.equal(foe.trapped, bubble.id);
  assert.deepEqual(bubble.trappedIds, [foe.id]);
  bubble.life = .001;
  run.updateBubbles(.01);
  assert.equal(run.bubbles.length, 0);
  assert.equal(foe.trapped, null);
});

test('linked glass boosts damage, kills once and produces salvage', () => {
  const run = fresh();
  const enemy = run.spawnEnemy('sentinel', 540, 440);
  enemy.spawn = 0;
  glass(run, 500, 440, 1);
  glass(run, 590, 440, 1);
  run.shatter();
  assert.equal(run.bestChain, 2);
  assert.equal(run.bubbles.length, 0);
  assert.equal(run.kills, 1);
  assert.ok(run.score > 0);
  assert.equal(run.pickups.filter(p => p.kind === 'cullet').length, 1);
  run.kill(enemy, 5);
  assert.equal(run.kills, 1, 'dead enemies must never pay twice');
});

test('pause prevents glass detonation and damage', () => {
  const run = fresh();
  glass(run, 500, 440);
  run.togglePause();
  run.shatter();
  run.hurt(40, 'paused damage');
  assert.equal(run.bubbles.length, 1);
  assert.equal(run.player.hp, 150);
  run.togglePause();
  run.shatter();
  assert.equal(run.bubbles.length, 0);
});

test('Freeze absorbs a projectile but Solar does not', () => {
  const run = fresh();
  const bubble = glass(run, 500, 450, 0);
  run.shoot(500, 450, 0, 0, '#fff');
  run.updateBullets(.01);
  assert.equal(run.bullets.length, 0);
  bubble.element = 1;
  run.shoot(500, 450, 0, 0, '#fff');
  run.updateBullets(.01);
  assert.equal(run.bullets.length, 1);
});

test('every upgrade changes a functional statistic or health', () => {
  assert.equal(UPGRADES.length, 16);
  for (const upgrade of UPGRADES) {
    const run = fresh();
    run.player.hp = 100;
    const before = JSON.stringify({ stats: run.stats, player: run.player });
    upgrade.apply(run);
    const after = JSON.stringify({ stats: run.stats, player: run.player });
    assert.notEqual(before, after, `${upgrade.id} is cosmetic only`);
  }
});

test('forge accepts only offered upgrades and advances exactly one wave', () => {
  const run = fresh();
  run.openForge();
  run.chooseUpgrade('not-offered');
  assert.equal(run.wave, 1);
  const offered = run.offers[0].id;
  run.chooseUpgrade(offered);
  assert.equal(run.wave, 2);
  assert.equal(run.state, 'playing');
  assert.equal(run.upgrades[offered], 1);
  run.chooseUpgrade(offered);
  assert.equal(run.wave, 2);
});

test('merchant refuses overspending and duplicate service purchases', () => {
  const run = fresh();
  run.player.hp = 50;
  run.openForge();
  run.cullet = 54;
  assert.equal(purchaseService(run, 'repair'), false);
  assert.equal(run.player.hp, 50);
  run.cullet = 110;
  assert.equal(purchaseService(run, 'repair'), true);
  assert.equal(run.player.hp, 95);
  assert.equal(run.cullet, 55);
  assert.equal(purchaseService(run, 'repair'), false);
  assert.equal(run.player.hp, 95);
});

test('relic purchase pays once and enforces the six-slot limit', () => {
  const run = fresh();
  run.openForge();
  run.cullet = 1000;
  run.merchantRelic = 'lens';
  run.merchantPrice = 125;
  assert.equal(purchaseRelic(run), true);
  assert.equal(run.cullet, 875);
  assert.deepEqual(run.relics, ['lens']);
  assert.equal(purchaseRelic(run), false);
  run.relics = RELICS.slice(0, 6).map(r => r.id);
  run.merchantRelic = 'lens';
  assert.equal(purchaseRelic(run), false);
});

test('Phoenix forgives one fatal hit and only one', () => {
  const run = fresh();
  run.relics = ['phoenix'];
  run.player.hp = 1;
  run.hurt(100, 'first');
  assert.equal(run.player.hp, 60);
  assert.equal(run.state, 'playing');
  assert.equal(run.phoenixUsed, true);
  run.player.invuln = 0;
  run.hurt(100, 'second');
  assert.equal(run.state, 'defeat');
  assert.equal(run.endReason, 'second');
});

test('mixed elements prime actual reactions, not just labels', () => {
  assert.equal(describeReaction(0, 0), null);
  assert.equal(describeReaction(0, 1).id, 'thermal-shock');
  assert.equal(describeReaction(0, 2).id, 'cold-refraction');
  const run = fresh();
  const foe = run.spawnEnemy('sentinel', 500, 440);
  const first = primeElement(foe, 0);
  assert.equal(first, null);
  assert.equal(foe.slow, 2.8);
  const second = primeElement(foe, 1);
  assert.equal(second.id, 'thermal-shock');
  assert.ok(foe.burn > 0);
  const close = run.spawnEnemy('rime', 520, 450);
  const far = run.spawnEnemy('rime', 900, 650);
  spreadPrismBurn(run, foe, 80);
  assert.ok(close.burn > 0);
  assert.equal(far.burn, undefined);
});

test('workshop unlocks spend real mastery and apply the selected tradeoff', () => {
  const run = fresh();
  run.state = 'title';
  normalizeWorkshop(run.best);
  run.best.mastery = 99;
  assert.equal(buyTool(run, 'sunkeeper'), false);
  run.best.mastery = 100;
  assert.equal(buyTool(run, 'sunkeeper'), true);
  assert.equal(run.best.mastery, 0);
  assert.equal(run.best.selectedTool, 'sunkeeper');
  run.reset();
  assert.equal(applyStartingTool(run), 'sunkeeper');
  assert.equal(run.player.maxHp, 115);
  assert.equal(run.stats.power, 1.2);
  assert.equal(run.element, 1);
});

test('milestones award mastery once, save safely and survive a reload', () => {
  const run = fresh();
  run.traps = 1;
  const first = awardMilestones(run);
  assert.ok(first.includes('first-glass'));
  const mastery = run.best.mastery;
  assert.deepEqual(awardMilestones(run), []);
  assert.equal(run.best.mastery, mastery);
  run.save();
  const reloaded = new GlassforgeRun({ event() {}, update() {} });
  assert.equal(reloaded.best.mastery, mastery);
  assert.ok(reloaded.best.milestones.includes('first-glass'));
});

test('restart clears hazards, temporary upgrades and carried relics', () => {
  const run = fresh();
  run.wave = 8;
  run.relics = ['phoenix', 'winter'];
  run.upgrades.fracture = 3;
  run.stats.power = 3;
  glass(run, 500, 440);
  run.shoot(700, 400, 1, 100, '#fff');
  run.begin(1);
  assert.equal(run.wave, 1);
  assert.deepEqual(run.relics, []);
  assert.deepEqual(run.upgrades, {});
  assert.equal(run.stats.power, 1);
  assert.equal(run.bullets.length, 0);
  assert.equal(run.bubbles.length, 0);
});
