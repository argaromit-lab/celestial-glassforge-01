import { clamp, random, dist, TAU, circleHit, segmentDistance } from './math.js';
import { ELEMENTS, DIFFICULTIES, FOES, UPGRADES, RELICS, realmForWave, bossForWave } from './content.js';
import { applyStartingTool, awardMilestones, normalizeWorkshop } from './workshop.js';
import { prepareMerchant } from './forge-services.js';
import { primeElement, spreadPrismBurn, updateElementStatus } from './element-reactions.js';
import { ArenaNavigation } from './navigation.js';

const BOUNDS = { left: 193, right: 1055, top: 247, bottom: 683 };
export const COVER = [
  { x: 343, y: 356, r: 29, kind: 'ice', seed: 20 },
  { x: 907, y: 345, r: 31, kind: 'ice', seed: 31 },
  { x: 373, y: 594, r: 27, kind: 'furnace', seed: 45 },
  { x: 949, y: 609, r: 27, kind: 'furnace', seed: 81 },
  { x: 606, y: 283, r: 25, kind: 'ice', seed: 68 },
  { x: 724, y: 660, r: 23, kind: 'ice', seed: 13 },
];

export class GlassforgeRun {
  constructor(audio) {
    this.audio = audio; this.rng = random(38141); this.state = 'title'; this.seed = 38141;
    this.difficulty = 1; this.element = 0; this.listeners = []; this.events = [];
    this.navigation = new ArenaNavigation(COVER, 20);
    this.best = this.loadSave(); this.reset(); this.state = 'title';
  }
  loadSave() {
    try { return normalizeWorkshop({ score: 0, victories: 0, runs: 0, mastery: 0, ...JSON.parse(localStorage.getItem('aether-blowpipe-save-v1') || '{}') }); }
    catch { return { score: 0, victories: 0, runs: 0, mastery: 0 }; }
  }
  save() { try { localStorage.setItem('aether-blowpipe-save-v1', JSON.stringify(this.best)); } catch { /* A private browser can play without persistence. */ } }
  reset() {
    this.rng = random(this.seed); this.nextId = 1; this.time = 0; this.elapsed = 0; this.wave = 1; this.realm = 0;
    this.player = { x: 509, y: 530, r: 15, hp: 150, maxHp: 150, breath: 100, maxBreath: 100, angle: -.5, invuln: 0, dash: 0, dashCd: 0, dx: 1, dy: 0, walk: 0 };
    this.stats = { power: 1, growth: 1, radius: 1, heatCap: 128, recovery: 1, chainRange: 95, dashCooldown: 1.45, echo: 0, magnet: 82, frostBonus: 0, solarHeat: 1, glassLifetime: 8.5, reactionPower: 1, killBreath: 0 };
    this.enemies = []; this.bubbles = []; this.bullets = []; this.particles = []; this.rings = []; this.labels = []; this.pickups = [];
    this.crates = [{ x: 246, y: 500, r: 20, hp: 55 }, { x: 1007, y: 465, r: 20, hp: 55 }, { x: 581, y: 638, r: 20, hp: 55 }];
    this.boss = null; this.heat = 32; this.score = 0; this.combo = 1; this.comboTime = 0; this.cullet = 0;
    this.kills = 0; this.traps = 0; this.bestChain = 0; this.shatters = 0; this.dashes = 0; this.damageTaken = 0;
    this.upgrades = {}; this.relics = []; this.phoenixUsed = false; this.waveDamage = 0; this.waveTime = 0;
    this.spawnQueue = []; this.spawnClock = 0; this.waveClearing = 0; this.charge = null; this.blowCooldown = 0;
    this.shake = 0; this.hitstop = 0; this.flash = 0; this.banner = ''; this.bannerTime = 0; this.offers = [];
    this.endReason = ''; this.forgeRound = 0; this.totalHits = 0; this.totalBlown = 0; this.assisted = false;
    this.forgeServicesUsed = []; this.merchantRelic = null; this.merchantPrice = 100; this.milestonesEarned = [];
  }
  begin(difficulty = this.difficulty) {
    this.difficulty = difficulty; this.reset(); this.startingTool = applyStartingTool(this); this.state = 'playing'; this.queueWave(); this.audio.event('forge'); this.notify();
  }
  notify() { this.listeners.forEach(f => f()); }
  queueWave() {
    this.realm = realmForWave(this.wave); this.waveTime = 0; this.waveDamage = 0; this.waveClearing = 0;
    this.spawnClock = .5; this.bullets = []; this.bubbles = []; this.charge = null;
    const roster = this.wave < 3 ? ['rime', 'cinder'] : this.wave < 5 ? ['rime', 'spitter', 'charger', 'cinder'] : ['rime', 'cinder', 'spitter', 'charger', 'sentinel'];
    const count = Math.round((5 + this.wave * 2) * DIFFICULTIES[this.difficulty].count);
    this.spawnQueue = Array.from({ length: count }, (_, i) => roster[(i + this.wave) % roster.length]);
    if (bossForWave(this.wave)) {
      const hp = this.wave === 8 ? 2150 : 1250;
      this.boss = { x: 689, y: 415, r: this.wave === 8 ? 62 : 49, hp, maxHp: hp, phase: 1, age: 0, attack: 1.8, laser: null, hit: 0, type: this.wave === 8 ? 'solar' : 'rime' };
      this.audio.event('boss');
    } else this.boss = null;
    this.banner = bossForWave(this.wave) || `WAVE ${this.wave} · ${this.realm === 0 ? 'TEMPER THE FLAME' : this.realm === 1 ? 'WINTER IS LISTENING' : 'BREAK THE SILENCE'}`;
    this.bannerTime = 2.2;
    this.notify();
  }
  spawnEnemy(kind, x, y) {
    const def = FOES[kind];
    if (x == null) { const side = this.rng() * 4 | 0; x = side % 2 ? 214 + this.rng() * 810 : side === 0 ? 205 : 1039; y = side % 2 ? side === 1 ? 255 : 675 : 270 + this.rng() * 395; }
    const foe = { id: this.nextId++, kind, x, y, r: def.radius, hp: def.hp * (1 + (this.wave - 1) * .055), maxHp: def.hp * (1 + (this.wave - 1) * .055), age: 0, attack: 1 + this.rng() * 2, hit: 0, trapped: null, slow: 0, charge: 0, ax: 0, ay: 0, spawn: .55 };
    this.enemies.push(foe); return foe;
  }
  float(text, x, y, color = '#e7f5ed', size = 24, life = 1.1) {
    this.labels.push({ text, x, y, startY: y, color, size, life, maxLife: life });
  }
  burst(x, y, color, count = 20, force = 140) {
    for (let i = 0; i < count; i++) {
      const angle = this.rng() * TAU, speed = force * (.25 + this.rng());
      this.particles.push({ x, y, z: this.rng() * 15, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * .7, vz: 40 + this.rng() * 120, angle, spin: (this.rng() - .5) * 12, size: 2 + this.rng() * 8, color, life: .5 + this.rng() * .7, maxLife: 1.2 });
    }
    if (this.particles.length > 450) this.particles.splice(0, this.particles.length - 450);
  }
  ring(x, y, radius, color, life = .5) { this.rings.push({ x, y, radius, color, life, maxLife: life }); }
  releaseBubble() {
    if (!this.charge) return;
    const b = this.charge;
    if (b.r > 13) { b.active = true; b.vx = Math.cos(b.angle) * 56; b.vy = Math.sin(b.angle) * 56; this.bubbles.push(b); this.totalBlown++; }
    this.charge = null; this.blowCooldown = .16;
  }
  startBlowing(dt, input) {
    const p = this.player;
    if (p.breath < 3 || this.blowCooldown > 0) return;
    if (!this.charge) {
      this.charge = { id: this.nextId++, x: p.x, y: p.y, r: 9, element: this.element, angle: p.angle, age: 0, life: this.stats.glassLifetime + (this.hasRelic('hourglass') ? 4 : 0), active: false, trappedIds: [], vx: 0, vy: 0 };
      this.audio.event('blow');
    }
    const b = this.charge;
    const element = ELEMENTS[b.element];
    b.age += dt; b.angle = p.angle;
    b.r = Math.min(67 * this.stats.radius, b.r + dt * 35 * this.stats.growth);
    b.x = p.x + Math.cos(p.angle) * (35 + b.r * .65); b.y = p.y + Math.sin(p.angle) * (35 + b.r * .65);
    p.breath = Math.max(0, p.breath - dt * 23);
    const heat = element.heat * (b.element === 1 ? this.stats.solarHeat : 1);
    this.heat = clamp(this.heat + dt * heat * DIFFICULTIES[this.difficulty].heat, 0, this.stats.heatCap + 5);
    if (b.r >= 67 * this.stats.radius || p.breath <= 1) this.releaseBubble();
  }
  shatter() {
    if (this.state !== 'playing') return;
    this.releaseBubble();
    if (!this.bubbles.length) return;
    const all = [...this.bubbles];
    this.bubbles = []; let totalTraps = 0, linked = 0;
    for (const b of all) {
      const neighbors = all.filter(o => o !== b && dist(o, b) < b.r + o.r + this.stats.chainRange).length;
      const n = 1 + neighbors; linked = Math.max(linked, n); totalTraps += b.trappedIds.length;
      const e = ELEMENTS[b.element];
      const coldRefraction = b.element === 2 && this.enemies.some(enemy => enemy.affinity === 0 && enemy.affinityTime > 0 && dist(enemy, b) < b.r * 2 + enemy.r);
      const blast = b.r * 1.6 + 25 + (b.element === 2 ? this.stats.echo * 14 + (this.hasRelic('lens') ? 40 : 0) : 0) + (coldRefraction ? 30 : 0);
      const damage = (e.damage + b.r * .85 + (b.element === 0 ? this.stats.frostBonus : 0)) * this.stats.power * (1 + neighbors * (this.hasRelic('fuse') ? .38 : .3));
      this.ring(b.x, b.y, blast, e.color, .65); this.burst(b.x, b.y, e.color, 22 + n * 6, 190);
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        if (dist(enemy, b) < blast + enemy.r || b.trappedIds.includes(enemy.id)) {
          const reaction = primeElement(enemy, b.element);
          const reactionFactor = reaction?.id === 'thermal-shock' ? 1.35 * this.stats.reactionPower : 1;
          enemy.trapped = null; enemy.hp -= damage * reactionFactor; enemy.hit = .18;
          if (reaction) {
            this.float(reaction.name, enemy.x, enemy.y - 54, reaction.color, 15, 1.4);
            if (reaction.id === 'sun-dog') spreadPrismBurn(this, enemy, blast);
          }
          if (b.element === 0) enemy.slow = 2.8;
          if (enemy.hp <= 0) this.kill(enemy, n); else this.float(Math.floor(damage).toString(), enemy.x, enemy.y - 30, e.color, 19);
        }
      }
      if (this.boss && this.boss.hp > 0 && dist(this.boss, b) < blast + this.boss.r) {
        this.boss.hp -= damage * (b.element === 1 ? 1.2 : 1); this.boss.hit = .2; this.totalHits++;
        this.float(Math.floor(damage).toString(), this.boss.x + 28, this.boss.y - 75, '#ffe5b8', 30);
      }
      for (const crate of this.crates) if (crate.hp > 0 && dist(crate, b) < blast + 15) {
        crate.hp -= damage;
        if (crate.hp <= 0) { this.burst(crate.x, crate.y, '#ddb46e', 12); this.drop(crate.x, crate.y, 35, 'cullet'); this.drop(crate.x + 13, crate.y + 12, 18, 'breath'); }
      }
    }
    this.shatters++; this.bestChain = Math.max(this.bestChain, linked);
    this.shake = Math.min(1, .25 + linked * .08); this.hitstop = .055;
    this.audio.event('shatter', linked);
    if (linked > 1) { this.float(`CHAIN x${linked}!`, all[0].x, all[0].y - 58, '#ffe4a3', 32, 1.3); this.combo = Math.min(6, this.combo + linked * .25); this.comboTime = 6; }
    if (this.hasRelic('mirror') && totalTraps > 1) this.player.breath = Math.min(this.player.maxBreath, this.player.breath + 8);
    if (this.hasRelic('winter') && this.shatters % 3 === 0) this.enemies.forEach(e => { e.slow = 3; });
    this.events.push({ type: 'shatter', count: linked, trapped: totalTraps });
    this.notify();
  }
  dash(input) {
    const p = this.player;
    if (this.state !== 'playing' || p.dashCd > 0) return;
    let x = Number(input.keys.has('d') || input.keys.has('arrowright')) - Number(input.keys.has('a') || input.keys.has('arrowleft'));
    let y = Number(input.keys.has('s') || input.keys.has('arrowdown')) - Number(input.keys.has('w') || input.keys.has('arrowup'));
    if (!x && !y) { x = Math.cos(p.angle); y = Math.sin(p.angle); }
    const len = Math.hypot(x, y); p.dx = x / len; p.dy = y / len;
    p.dash = .19; p.invuln = Math.max(p.invuln, .3); p.dashCd = this.stats.dashCooldown;
    this.dashes++; this.audio.event('dash'); this.shatter();
    if (this.hasRelic('quench')) this.heat = Math.max(0, this.heat - 5);
    this.ring(p.x, p.y, 52, '#c3f8ff', .24);
  }
  hasRelic(id) { return this.relics.includes(id); }
  drop(x, y, value, kind = 'cullet') { this.pickups.push({ x, y, r: kind === 'cullet' ? 6 : 9, value, kind, age: 0 }); }
  kill(enemy, chain = 1) {
    if (enemy.dead) return;
    enemy.dead = true; this.kills++;
    const points = Math.floor(FOES[enemy.kind].score * this.combo * DIFFICULTIES[this.difficulty].score);
    this.score += points; this.combo = Math.min(6, this.combo + .12); this.comboTime = 5;
    this.player.breath = Math.min(this.player.maxBreath, this.player.breath + this.stats.killBreath);
    this.float(`+${points}`, enemy.x, enemy.y - 22, '#fff2cc', enemy.kind === 'sentinel' ? 29 : 23);
    this.burst(enemy.x, enemy.y, FOES[enemy.kind].color, 9, 100);
    this.drop(enemy.x, enemy.y, 8 + chain * 2);
    if (this.kills % 7 === 0) this.drop(enemy.x + 15, enemy.y, 18, 'breath');
    if (this.kills % 15 === 0 || (this.hasRelic('seed') && this.kills % 5 === 0)) this.drop(enemy.x - 13, enemy.y + 10, 14, 'health');
  }
  hurt(damage, cause) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'playing') return;
    const hit = damage * DIFFICULTIES[this.difficulty].damage;
    p.hp = Math.max(0, p.hp - hit); p.invuln = .85;
    this.damageTaken += hit; this.waveDamage += hit; this.combo = Math.max(1, this.combo - .7);
    this.shake = .55; this.flash = .15; this.audio.event('hit');
    this.float(`−${Math.round(hit)}`, p.x, p.y - 45, '#ffb4a0', 25);
    if (p.hp <= 0) {
      if (this.hasRelic('phoenix') && !this.phoenixUsed) {
        p.hp = 60; p.invuln = 3; this.phoenixUsed = true; this.heat *= .5;
        this.ring(p.x, p.y, 160, '#ffc57a', 1); this.float('PHOENIX REFORGED', p.x, p.y - 60, '#ffdba2', 26, 2);
      } else this.finish(false, cause);
    }
  }
  finish(won, cause = '') {
    this.releaseBubble(); this.state = won ? 'victory' : 'defeat'; this.endReason = cause;
    this.best.runs++; this.best.score = Math.max(this.best.score, Math.floor(this.score));
    this.best.mastery += Math.floor(this.cullet / 20) + this.wave * 4;
    if (won) { this.best.victories++; this.score += 5000 + Math.floor(this.player.hp * 35); this.best.score = Math.max(this.best.score, Math.floor(this.score)); }
    this.milestonesEarned = awardMilestones(this);
    this.save(); this.audio.event(won ? 'victory' : 'defeat'); this.notify();
  }
  openForge() {
    this.state = 'forge'; this.forgeRound++; this.charge = null; this.bubbles = []; this.bullets = [];
    this.heat = Math.max(10, this.heat - 26); this.player.breath = this.player.maxBreath;
    if (!this.waveDamage && this.hasRelic('heart')) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 12);
    prepareMerchant(this); this.makeOffers(); this.audio.event('forge'); this.notify();
  }
  makeOffers() {
    const pool = UPGRADES.filter(u => (this.upgrades[u.id] || 0) < 4);
    this.offers = [];
    while (this.offers.length < 3 && pool.length) this.offers.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
  }
  reroll() { if (this.cullet < 40 || this.state !== 'forge') return; this.cullet -= 40; this.makeOffers(); this.audio.event('click'); this.notify(); }
  chooseUpgrade(id) {
    if (this.state !== 'forge' || !this.offers.some(u => u.id === id)) return;
    const upgrade = UPGRADES.find(u => u.id === id);
    upgrade.apply(this); this.upgrades[id] = (this.upgrades[id] || 0) + 1;
    if (this.wave === 2 || this.wave === 5 || this.wave === 7) {
      const pool = RELICS.filter(r => !this.hasRelic(r.id));
      if (pool.length && this.relics.length < 6) { const r = pool[Math.floor(this.rng() * pool.length)]; this.relics.push(r.id); this.banner = `RELIC FOUND · ${r.name.toUpperCase()}`; }
    }
    this.wave++; this.state = 'playing'; this.queueWave(); this.notify();
  }
  togglePause() {
    if (this.state === 'playing') { this.releaseBubble(); this.state = 'paused'; }
    else if (this.state === 'paused') this.state = 'playing';
    this.notify();
  }
  collideCover(entity, radius = entity.r) {
    for (const cover of COVER) {
      const dx = entity.x - cover.x, dy = entity.y - cover.y, d = Math.hypot(dx, dy), reach = radius + cover.r;
      if (d < reach && d > .01) { entity.x = cover.x + dx / d * reach; entity.y = cover.y + dy / d * reach; }
    }
    entity.x = clamp(entity.x, BOUNDS.left + radius, BOUNDS.right - radius);
    entity.y = clamp(entity.y, BOUNDS.top + radius, BOUNDS.bottom - radius);
  }
  update(dt, input) {
    if (this.state !== 'playing') return;
    this.time += dt; this.elapsed += dt; this.waveTime += dt;
    this.hitstop = Math.max(0, this.hitstop - dt); const step = this.hitstop > 0 ? dt * .08 : dt;
    this.bannerTime = Math.max(0, this.bannerTime - dt); this.flash = Math.max(0, this.flash - dt); this.shake = Math.max(0, this.shake - dt * 2.1);
    this.blowCooldown = Math.max(0, this.blowCooldown - step);
    const p = this.player; p.invuln = Math.max(0, p.invuln - step); p.dashCd = Math.max(0, p.dashCd - step); p.dash = Math.max(0, p.dash - step);
    const keys = input.keys;
    let mx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let my = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    const l = Math.hypot(mx, my) || 1; mx /= l; my /= l;
    p.angle = Math.atan2(input.y - p.y, input.x - p.x);
    if (p.dash > 0) {
      p.x += p.dx * step * 650; p.y += p.dy * step * 650;
      if (this.rng() < .7) this.particles.push({ x: p.x, y: p.y, z: 12, vx: -p.dx * 10, vy: -p.dy * 10, vz: 4, angle: p.angle, spin: 1, size: 5, color: '#a7efff', life: .25, maxLife: .25 });
    } else { p.x += mx * step * (input.blow ? 157 : 205); p.y += my * step * (input.blow ? 157 : 205); }
    p.walk += Math.hypot(mx, my) * step * 10;
    this.collideCover(p);
    if (input.blow) this.startBlowing(step, input); else {
      this.releaseBubble();
      const nearCover = this.hasRelic('mason') && COVER.some(c => dist(c, p) < 85);
      p.breath = Math.min(p.maxBreath, p.breath + step * 21 * this.stats.recovery * (nearCover ? 1.4 : 1));
    }
    this.heat = Math.max(0, this.heat - step * (1.2 + (this.realm === 2 ? .6 : 0)));
    if (this.heat >= this.stats.heatCap) { this.heat = this.stats.heatCap - 17; this.hurt(22, 'The furnace overheated. Freeze glass cools it down.'); this.float('OVERHEAT', p.x, p.y - 65, '#ffb681', 25); }
    if (this.comboTime > 0) this.comboTime -= step; else this.combo = Math.max(1, this.combo - step * .18);
    this.spawnClock -= step;
    if (this.spawnClock <= 0 && this.spawnQueue.length) { this.spawnEnemy(this.spawnQueue.shift()); this.spawnClock = .58 + this.rng() * .35; }
    this.updateBubbles(step);
    this.updateEnemies(step);
    this.updateBoss(step);
    this.updateBullets(step);
    this.updatePickups(step);
    this.updateEffects(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.boss && this.boss.hp <= 0) {
      this.burst(this.boss.x, this.boss.y, '#ffcb82', 95, 320); this.ring(this.boss.x, this.boss.y, 300, '#ffe4a1', 1.5);
      this.float('WARDEN SHATTERED', this.boss.x, this.boss.y - 60, '#ffe4b2', 34, 2.5); this.score += 5000; this.cullet += 150;
      this.boss = null; this.shake = 1; this.audio.event('shatter');
    }
    if (!this.spawnQueue.length && !this.enemies.length && !this.boss) {
      this.waveClearing += step;
      if (this.waveClearing > 1.8) { if (this.wave === 8) this.finish(true); else this.openForge(); }
    }
    this.audio.update(dt, true, this.realm);
  }
  updateBubbles(dt) {
    const all = this.charge ? [...this.bubbles, this.charge] : this.bubbles;
    for (const b of all) {
      if (b.active) { b.age += dt; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(.28, dt); b.vy *= Math.pow(.28, dt); this.collideCover(b, b.r * .35); }
      for (const e of this.enemies) {
        if (e.dead || e.trapped || e.spawn > 0 || dist(e, b) > b.r + e.r * .3 || b.r < 22) continue;
        e.trapped = b.id; b.trappedIds.push(e.id); this.traps++; this.audio.event('trap');
        if (this.hasRelic('siren')) this.player.breath = Math.min(this.player.maxBreath, this.player.breath + 3);
        this.float('TRAPPED!', b.x, b.y - b.r - 13, ELEMENTS[b.element].color, 18, .9);
      }
    }
    for (const b of this.bubbles) if (b.life <= 0) {
      for (const e of this.enemies) if (e.trapped === b.id) e.trapped = null;
      this.burst(b.x, b.y, ELEMENTS[b.element].color, 5, 30);
    }
    this.bubbles = this.bubbles.filter(b => b.life > 0);
    if (this.bubbles.length > 12) {
      const old = this.bubbles.shift(); this.enemies.forEach(e => { if (e.trapped === old.id) e.trapped = null; });
    }
  }
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.age += dt; e.spawn = Math.max(0, e.spawn - dt); e.hit = Math.max(0, e.hit - dt); e.slow = Math.max(0, e.slow - dt);
      updateElementStatus(this, e, dt);
      if (e.dead) continue;
      if (e.trapped) {
        const b = this.bubbles.find(b => b.id === e.trapped) || (this.charge?.id === e.trapped ? this.charge : null);
        if (b) { const index = b.trappedIds.indexOf(e.id); e.x = b.x + Math.sin(e.age * 1.5 + index * 2) * b.r * .33; e.y = b.y + Math.cos(e.age * 1.4 + index * 2) * b.r * .24; continue; }
        e.trapped = null;
      }
      if (e.spawn > 0) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, def = FOES[e.kind];
      e.attack -= dt;
      if (e.kind === 'spitter' && d < 350 && e.attack <= 0) {
        this.shoot(e.x, e.y, Math.atan2(dy, dx), 132, '#b0d9ff', 12); e.attack = 2.6;
      }
      if (e.kind === 'charger' && e.attack <= 0) {
        if (e.charge === 0) { e.charge = .65; e.ax = dx / d; e.ay = dy / d; }
        else { e.charge -= dt; if (e.charge <= -.35) { e.charge = 0; e.attack = 2.8; } }
      }
      const speed = def.speed * (e.slow > 0 ? .35 : 1);
      const waypoint = this.navigation.nextTarget(e, p, dt);
      const wx = waypoint.x - e.x, wy = waypoint.y - e.y, wd = Math.hypot(wx, wy) || 1;
      if (e.charge < 0) { e.x += e.ax * 280 * dt; e.y += e.ay * 280 * dt; }
      else if (e.charge === 0 && !(e.kind === 'spitter' && d < 255)) { e.x += wx / wd * speed * dt; e.y += wy / wd * speed * dt; }
      this.collideCover(e);
      for (const other of this.enemies) {
        if (other.id <= e.id || other.dead || other.trapped) continue;
        const ox = other.x - e.x, oy = other.y - e.y, od = Math.hypot(ox, oy), reach = (e.r + other.r) * .85;
        if (od < reach && od > .1) { const s = (reach - od) * .35; other.x += ox / od * s; other.y += oy / od * s; e.x -= ox / od * s; e.y -= oy / od * s; }
      }
      if (circleHit(p, e, -4)) this.hurt(def.damage, `${def.name.toLowerCase()} broke your vessel. Trap before it reaches you.`);
    }
  }
  shoot(x, y, angle, speed, color, damage = 14) {
    this.bullets.push({ x, y, r: 5.5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, damage, life: 7, tail: [] });
  }
  updateBoss(dt) {
    const b = this.boss; if (!b || b.hp <= 0) return;
    b.age += dt; b.hit = Math.max(0, b.hit - dt); b.attack -= dt;
    b.phase = b.hp / b.maxHp < .48 ? 2 : 1;
    if (dist(this.player, b) < b.r + 13) this.hurt(22, 'You touched the warden core. Stay outside its corona.');
    if (b.attack <= 0) {
      const aimed = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      if (Math.floor(b.age / 3) % 2 === 0) b.laser = { angle: aimed, time: 0, duration: 1.9, tell: .95 };
      else {
        const count = b.phase === 2 ? 14 : 10;
        for (let i = 0; i < count; i++) this.shoot(b.x + Math.cos(i / count * TAU) * b.r, b.y + Math.sin(i / count * TAU) * b.r, i / count * TAU + b.age * .1, b.phase === 2 ? 125 : 99, b.type === 'solar' ? '#ffad64' : '#98ddff', 16);
      }
      b.attack = b.phase === 2 ? 2.1 : 3.1;
    }
    if (b.laser) {
      const laser = b.laser; laser.time += dt;
      const end = { x: b.x + Math.cos(laser.angle) * 1200, y: b.y + Math.sin(laser.angle) * 1200 };
      let length = 1000;
      for (const cover of COVER) if (segmentDistance(cover, b, end) < cover.r && (cover.x - b.x) * Math.cos(laser.angle) + (cover.y - b.y) * Math.sin(laser.angle) > 0) length = Math.min(length, dist(cover, b) - cover.r);
      laser.length = length;
      const clipped = { x: b.x + Math.cos(laser.angle) * length, y: b.y + Math.sin(laser.angle) * length };
      if (laser.time > laser.tell && segmentDistance(this.player, b, clipped) < 19) this.hurt(26, 'The solar lance caught you. Dash through it, or hide behind a pillar.');
      if (laser.time > laser.duration) b.laser = null;
    }
  }
  updateBullets(dt) {
    for (const b of this.bullets) {
      b.tail.unshift({ x: b.x, y: b.y }); if (b.tail.length > 6) b.tail.pop();
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (COVER.some(c => circleHit(b, c)) || this.bubbles.some(c => dist(c, b) < c.r && c.element === 0)) { b.life = 0; this.burst(b.x, b.y, b.color, 4, 25); }
      if (circleHit(b, this.player)) { this.hurt(b.damage, 'A furnace projectile cracked the glass. Freeze bubbles intercept projectiles.'); b.life = 0; }
    }
    this.bullets = this.bullets.filter(b => b.life > 0 && b.x > 170 && b.x < 1080 && b.y > 228 && b.y < 705);
  }
  updatePickups(dt) {
    for (const p of this.pickups) {
      p.age += dt;
      const d = dist(p, this.player);
      if (d < this.stats.magnet) { p.x += (this.player.x - p.x) * dt * 6; p.y += (this.player.y - p.y) * dt * 6; }
      if (d < 24) {
        p.collected = true;
        if (p.kind === 'cullet') { this.cullet += p.value; this.score += this.hasRelic('star') ? p.value * 6 : p.value; }
        if (p.kind === 'health') this.player.hp = Math.min(this.player.maxHp, this.player.hp + p.value);
        if (p.kind === 'breath') this.player.breath = Math.min(this.player.maxBreath, this.player.breath + p.value);
        this.audio.event('pickup', p.value / 10);
      }
    }
    this.pickups = this.pickups.filter(p => !p.collected && p.age < 30);
  }
  updateEffects(dt) {
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= dt * 300; p.angle += p.spin * dt; p.vx *= Math.pow(.3, dt); p.vy *= Math.pow(.3, dt); if (p.z < 0) { p.z = 0; p.vz *= -.25; } }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
    for (const label of this.labels) { label.life -= dt; label.y -= dt * 30; }
    this.labels = this.labels.filter(l => l.life > 0);
  }
}
