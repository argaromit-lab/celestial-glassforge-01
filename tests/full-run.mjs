import { mkdir, writeFile } from 'node:fs/promises';
import { GlassforgeRun, COVER } from '../game/simulation.js';
import { dist } from '../game/math.js';
import { purchaseRelic, purchaseService } from '../game/forge-services.js';
import { ArenaNavigation } from '../game/navigation.js';

// This controller uses the same input intent structure as keyboard/mouse.
// It never changes combat stats, wave state, health, damage, or spawn tables.
// Browser tests separately prove the physical keyboard and pointer bindings.
const audio = { event() {}, update() {} };
const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
};

function play(seed, difficulty, reactionDelay) {
  const run = new GlassforgeRun(audio);
  run.seed = seed;
  run.begin(difficulty);
  const input = { x: 700, y: 400, keys: new Set(), blow: false };
  const navigation = new ArenaNavigation(COVER, 18);
  const walker = { id: 0, x: 509, y: 530 };
  let shatterWait = 0;
  let inputClock = 0;
  let distance = 0;
  let firstScore = null;
  let lastScore = 0;
  let last = { x: run.player.x, y: run.player.y };
  const milestones = [];
  const forgeChoices = [];
  const events = [];
  const dt = 1 / 60;
  const maxSteps = 60 * 60 * 18;
  let step = 0;

  for (; step < maxSteps && !['victory', 'defeat'].includes(run.state); step++) {
    if (run.state === 'forge') {
      purchaseService(run, 'repair');
      if (run.cullet >= run.merchantPrice + 55) purchaseRelic(run);
      const priority = ['fracture', 'vessel', 'choir', 'horizon', 'siphon', 'lung', 'frostbite', 'caustic', 'tether', 'bellows', 'anneal'];
      const choices = [...run.offers].sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id));
      const choice = choices[0];
      forgeChoices.push({ afterWave: run.wave, id: choice.id, hp: run.player.hp, cullet: run.cullet });
      run.chooseUpgrade(choice.id);
      milestones.push({ wave: run.wave, seconds: run.elapsed, health: run.player.hp, score: run.score });
      continue;
    }

    shatterWait -= dt;
    inputClock -= dt;
    if (inputClock <= 0) {
      inputClock = reactionDelay;
      const p = run.player;
      const threats = run.enemies.filter(e => !e.trapped && !e.dead && e.spawn <= 0);
      const closest = threats.sort((a, b) => dist(a, p) - dist(b, p))[0];
      const target = closest || run.boss || { x: 640, y: 450 };
      input.x = target.x;
      input.y = target.y;
      run.element = run.heat > 65 || !run.boss ? 0 : 1;
      if (run.stats.echo && !run.boss && run.heat < 30) run.element = 2;

      const near = dist(p, target);
      let vx = 0;
      let vy = 0;
      if (near > 104) {
        walker.x = p.x; walker.y = p.y;
        const waypoint = navigation.nextTarget(walker, target, reactionDelay);
        const dx = waypoint.x - p.x, dy = waypoint.y - p.y, wd = Math.hypot(dx, dy) || 1;
        vx += dx / wd * .95;
        vy += dy / wd * .95;
      }
      if (near < 78) {
        vx -= (target.x - p.x) / near * 1.5;
        vy -= (target.y - p.y) / near * 1.5;
      }
      // Circle incoming fire; repel from cover to avoid a stationary softlock.
      const orbit = run.boss ? .4 : near < 130 ? .12 : 0;
      vx += -(target.y - p.y) / (near || 1) * orbit;
      vy += (target.x - p.x) / (near || 1) * orbit;
      for (const cover of COVER) {
        const d = dist(p, cover);
        if (d < cover.r + 62) {
          vx += (p.x - cover.x) / Math.max(1, d) * 1.7;
          vy += (p.y - cover.y) / Math.max(1, d) * 1.7;
        }
      }
      for (const bullet of run.bullets) {
        const d = dist(p, bullet);
        if (d < 75) {
          vx += (p.x - bullet.x) / Math.max(d, 1) * 1.8;
          vy += (p.y - bullet.y) / Math.max(d, 1) * 1.8;
        }
      }
      if (p.x < 230) vx += 1;
      if (p.x > 1015) vx -= 1;
      if (p.y < 280) vy += 1;
      if (p.y > 645) vy -= 1;
      input.keys.clear();
      if (vx > .17) input.keys.add('d');
      if (vx < -.17) input.keys.add('a');
      if (vy > .17) input.keys.add('s');
      if (vy < -.17) input.keys.add('w');

      const danger = closest && dist(closest, p) < 48;
      if (danger && p.dashCd <= 0) run.dash(input);
      if (run.boss?.laser && run.boss.laser.time > .75 && p.dashCd <= 0) run.dash(input);

      const trapped = run.enemies.some(e => e.trapped);
      const armed = run.bubbles.length > 0;
      const growing = run.charge;
      input.blow = p.breath > 15 && near < 210;
      if (growing?.r > 42 || (trapped && growing?.r > 25)) input.blow = false;
      if (armed && shatterWait <= 0 && (trapped || run.boss || run.bubbles.length > 2)) {
        run.shatter();
        shatterWait = .55;
      }
      if (p.breath < 15) input.blow = false;
    }

    run.update(dt, input);
    const travelled = Math.hypot(run.player.x - last.x, run.player.y - last.y);
    distance += travelled;
    last = { x: run.player.x, y: run.player.y };
    if (run.score > lastScore && firstScore == null) firstScore = run.elapsed;
    lastScore = run.score;
    if (run.events.length) events.push(...run.events.splice(0));
  }
  return {
    seed,
    difficulty,
    reactionDelay,
    state: run.state,
    wave: run.wave,
    elapsed: run.elapsed,
    framesAdvanced: step,
    distanceTravelled: distance,
    timeToFirstScore: firstScore,
    score: run.score,
    kills: run.kills,
    captures: run.traps,
    shatters: run.shatters,
    longestChain: run.bestChain,
    health: run.player.hp,
    damageTaken: run.damageTaken,
    lossReason: run.endReason,
    remainingEnemies: run.enemies.map(e => ({ kind: e.kind, hp: e.hp, trapped: e.trapped, x: e.x, y: e.y })),
    player: { x: run.player.x, y: run.player.y },
    upgrades: run.upgrades,
    relics: run.relics,
    milestones,
    forgeChoices,
    shatterEvents: events.length,
  };
}

const results = [];
for (const [seed, difficulty, delay] of [[38141, 0, .08], [42, 0, .08], [38141, 1, .08], [38141, 1, .38]]) {
  const result = play(seed, difficulty, delay);
  results.push(result);
  console.log(JSON.stringify({ seed, difficulty, delay, state: result.state, wave: result.wave, kills: result.kills, hp: result.health, seconds: result.elapsed, lossReason: result.lossReason }));
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/bot-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), controller: 'intent-driven; no combat stat overrides', results }, null, 2));
if (results.some(r => r.framesAdvanced < 600 || r.distanceTravelled < 500 || r.kills === 0)) process.exitCode = 1;
