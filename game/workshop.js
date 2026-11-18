// Persistent progression lives outside combat state. Mastery unlocks optional
// opening tools, never bypasses waves, bosses, or the survival rules.
export const WORKSHOP_TOOLS = [
  {
    id: 'artisan',
    name: 'The Artisan',
    icon: 'anvil',
    cost: 0,
    subtitle: 'The honest beginning',
    description: 'Balanced glass, a steady hand. Begin with 150 health and 100 breath.',
    tradeoff: 'No weakness. No shortcut.',
    apply() {},
  },
  {
    id: 'winterborn',
    name: 'Winterborn',
    icon: 'frost',
    cost: 60,
    subtitle: 'Patience is a weapon',
    description: 'Freeze glass deals 25 extra damage. Start with Cold Annealing.',
    tradeoff: 'Solar glass heats the furnace 25% faster.',
    apply(run) {
      run.stats.frostBonus += 25;
      run.stats.heatCap += 28;
      run.stats.solarHeat *= 1.25;
      run.upgrades.anneal = 1;
    },
  },
  {
    id: 'sunkeeper',
    name: 'Sunkeeper',
    icon: 'sun',
    cost: 100,
    subtitle: 'A smaller, brighter flame',
    description: 'All glass deals 20% more damage. Begin with Ember Reservoir.',
    tradeoff: 'Maximum health is reduced to 115.',
    apply(run) {
      run.stats.power *= 1.2;
      run.stats.solarHeat *= .65;
      run.player.hp = 115;
      run.player.maxHp = 115;
      run.upgrades.sunheart = 1;
      run.element = 1;
    },
  },
  {
    id: 'pilgrim',
    name: 'Prism Pilgrim',
    icon: 'prism',
    cost: 150,
    subtitle: 'Follow the fault lines',
    description: 'Begin with one Prism echo and 50 extra chain link distance.',
    tradeoff: 'Breath returns 15% more slowly.',
    apply(run) {
      run.stats.echo += 1;
      run.stats.chainRange += 50;
      run.stats.recovery *= .85;
      run.element = 2;
    },
  },
];

export const MILESTONES = [
  { id: 'first-glass', name: 'A Fragile Beginning', description: 'Trap your first creature.', test: run => run.traps >= 1 },
  { id: 'chorus', name: 'A Choir of Fractures', description: 'Link at least four bubbles.', test: run => run.bestChain >= 4 },
  { id: 'cold-hand', name: 'A Steady Hand', description: 'Shatter 30 creatures in one run.', test: run => run.kills >= 30 },
  { id: 'yard', name: 'Beyond the Warmth', description: 'Reach the Frost Yard.', test: run => run.wave >= 3 },
  { id: 'regent', name: 'An Empty Throne', description: 'Defeat the Rime Regent.', test: run => run.wave >= 6 },
  { id: 'sun', name: 'No More Borrowed Light', description: 'Shatter the Hollow Sun.', test: run => run.state === 'victory' },
  { id: 'perfect', name: 'Without a Crack', description: 'Win with less than 60 damage taken.', test: run => run.state === 'victory' && run.damageTaken < 60 },
  { id: 'constellation', name: 'A New Constellation', description: 'Carry six relics in a run.', test: run => run.relics.length >= 6 },
];

export function normalizeWorkshop(save) {
  if (!Array.isArray(save.tools)) save.tools = ['artisan'];
  if (!save.tools.includes('artisan')) save.tools.unshift('artisan');
  if (!Array.isArray(save.milestones)) save.milestones = [];
  if (!WORKSHOP_TOOLS.some(t => t.id === save.selectedTool)) save.selectedTool = 'artisan';
  if (!save.tools.includes(save.selectedTool)) save.selectedTool = 'artisan';
  return save;
}

export function buyTool(run, id) {
  const tool = WORKSHOP_TOOLS.find(t => t.id === id);
  if (!tool || run.state !== 'title') return false;
  normalizeWorkshop(run.best);
  if (!run.best.tools.includes(id)) {
    if (run.best.mastery < tool.cost) return false;
    run.best.mastery -= tool.cost;
    run.best.tools.push(id);
  }
  run.best.selectedTool = id;
  run.save();
  run.audio.event('forge');
  return true;
}

export function applyStartingTool(run) {
  normalizeWorkshop(run.best);
  const tool = WORKSHOP_TOOLS.find(t => t.id === run.best.selectedTool) || WORKSHOP_TOOLS[0];
  tool.apply(run);
  return tool.id;
}

export function awardMilestones(run) {
  normalizeWorkshop(run.best);
  const earned = MILESTONES.filter(m => !run.best.milestones.includes(m.id) && m.test(run));
  for (const milestone of earned) {
    run.best.milestones.push(milestone.id);
    run.best.mastery += 12;
  }
  return earned.map(m => m.id);
}
