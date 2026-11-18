import { dist } from './math.js';

// Cross-element reactions reward a deliberate sequence rather than holding
// the highest-damage element for the entire descent.
export const REACTIONS = [
  {
    id: 'thermal-shock',
    name: 'THERMAL SHOCK',
    elements: [0, 1],
    color: '#ffdcaa',
    description: 'Freeze followed by Solar: a brittle target takes 35% extra damage.',
  },
  {
    id: 'cold-refraction',
    name: 'COLD REFRACTION',
    elements: [0, 2],
    color: '#bbecff',
    description: 'Freeze followed by Prism: the shatter gains 30 blast radius.',
  },
  {
    id: 'sun-dog',
    name: 'SUN DOG',
    elements: [1, 2],
    color: '#e9bfff',
    description: 'Solar followed by Prism: nearby enemies inherit the burn.',
  },
];

export function describeReaction(previous, next) {
  if (previous === next || previous == null) return null;
  return REACTIONS.find(reaction => reaction.elements.includes(previous) && reaction.elements.includes(next)) || null;
}

export function primeElement(target, element, seconds = 3) {
  const reaction = target.affinityTime > 0 ? describeReaction(target.affinity, element) : null;
  target.affinity = element;
  target.affinityTime = seconds;
  if (element === 1) target.burn = Math.max(target.burn || 0, 2.6);
  if (element === 0) target.slow = Math.max(target.slow || 0, 2.8);
  return reaction;
}

export function spreadPrismBurn(run, center, radius) {
  let affected = 0;
  for (const enemy of run.enemies) {
    if (enemy.dead || dist(enemy, center) > radius + enemy.r) continue;
    enemy.burn = Math.max(enemy.burn || 0, 3.5);
    enemy.affinity = 1;
    enemy.affinityTime = 3.5;
    affected++;
  }
  return affected;
}

export function updateElementStatus(run, enemy, dt) {
  enemy.affinityTime = Math.max(0, (enemy.affinityTime || 0) - dt);
  enemy.burn = Math.max(0, (enemy.burn || 0) - dt);
  if (enemy.burn <= 0 || enemy.dead) return;
  enemy.hp -= 9 * dt * run.stats.power;
  if (enemy.hp <= 0) run.kill(enemy, 1);
  enemy.burnVfx = (enemy.burnVfx || 0) + dt;
  if (enemy.burnVfx > .25) {
    enemy.burnVfx = 0;
    run.burst(enemy.x, enemy.y - 15, '#ffc177', 1, 16);
  }
}
