export const ELEMENTS = [
  { name: 'FREEZE', subtitle: 'Contain the storm', color: '#88edff', dark: '#173d58', symbol: 'frost', heat: -8, damage: 68, description: 'Large, patient glass. Slows captured prey and cools your furnace.' },
  { name: 'SOLAR', subtitle: 'Feed the furnace', color: '#ffbc69', dark: '#693921', symbol: 'sun', heat: 14, damage: 105, description: 'Volatile molten glass. Burns through armor, but raises furnace heat.' },
  { name: 'PRISM', subtitle: 'Multiply the fracture', color: '#dfb8ff', dark: '#43355e', symbol: 'prism', heat: 3, damage: 81, description: 'Luminous prismatic glass. Longer chains echo into nearby enemies.' },
];
export const REALMS = [
  { name: 'HOT SHOP', short: 'Hot Shop', subtitle: 'The last ember', waves: [1, 2], tint: '#e9a66c', floor: '#373938' },
  { name: 'FROST YARD', short: 'Frost Yard', subtitle: 'A quiet kind of hunger', waves: [3, 4, 5], tint: '#9adcd3', floor: '#31424b' },
  { name: 'GLACIER VAULT', short: 'Glacier Vault', subtitle: 'Where the sun was buried', waves: [6, 7, 8], tint: '#8bd6ff', floor: '#334653' },
];
export const DIFFICULTIES = [
  { id: 'apprentice', name: 'APPRENTICE', description: 'Room to breathe', damage: .65, count: .85, heat: .75, score: .8 },
  { id: 'glasswright', name: 'GLASSWRIGHT', description: 'The intended flame', damage: 1, count: 1, heat: 1, score: 1 },
  { id: 'inferno', name: 'INFERNO', description: 'Beautifully unforgiving', damage: 1.35, count: 1.25, heat: 1.2, score: 1.5 },
];
export const FOES = {
  rime: { name: 'RIME SKULK', hp: 62, speed: 35, radius: 16, color: '#9edce6', score: 95, damage: 12 },
  cinder: { name: 'CINDER MOTH', hp: 45, speed: 49, radius: 15, color: '#f6ae70', score: 90, damage: 9 },
  spitter: { name: 'FROST SPITTER', hp: 80, speed: 25, radius: 19, color: '#b5c6ec', score: 140, damage: 14 },
  charger: { name: 'SHARD KNIGHT', hp: 115, speed: 29, radius: 24, color: '#8cb3bf', score: 225, damage: 20 },
  sentinel: { name: 'IRON SENTINEL', hp: 165, speed: 21, radius: 27, color: '#d3b580', score: 325, damage: 24 },
};
export const UPGRADES = [
  { id: 'lung', name: 'Cathedral Lungs', type: 'BREATH', symbol: 'lung', color: '#8fe6df', summary: '+25 maximum breath', detail: 'Longer charges, wider traps. Keep a little air for the retreat.', apply: g => { g.player.maxBreath += 25; g.player.breath = g.player.maxBreath; } },
  { id: 'fracture', name: 'Fracture Geometry', type: 'CHAIN', symbol: 'prism', color: '#dfb8ff', summary: '+24% shatter damage', detail: 'Every fault is an invitation. Amplifies all three glass types.', apply: g => { g.stats.power *= 1.24; } },
  { id: 'anneal', name: 'Cold Annealing', type: 'THERMAL', symbol: 'frost', color: '#9bdfff', summary: '+28 heat capacity · −15 heat', detail: 'Let the glacier take the strain. More room for solar glass.', apply: g => { g.stats.heatCap += 28; g.heat = Math.max(0, g.heat - 15); } },
  { id: 'bellows', name: 'Silver Bellows', type: 'RECOVERY', symbol: 'wind', color: '#b7d3e6', summary: '+35% breath recovery', detail: 'A quiet inhale before the next impossible thing.', apply: g => { g.stats.recovery *= 1.35; } },
  { id: 'tether', name: 'Mercury Filament', type: 'CHAIN', symbol: 'chain', color: '#e8c495', summary: '+45 chain link distance', detail: 'Distant bubbles become one beautiful catastrophe.', apply: g => { g.stats.chainRange += 45; } },
  { id: 'vessel', name: 'Tempered Vessel', type: 'VITALITY', symbol: 'heart', color: '#f4a9a0', summary: '+30 health · restore 45', detail: 'Reforge the cracks instead of hiding them.', apply: g => { g.player.maxHp += 30; g.player.hp = Math.min(g.player.maxHp, g.player.hp + 45); } },
  { id: 'slip', name: 'Quicksilver Step', type: 'MOBILITY', symbol: 'dash', color: '#c0e9ea', summary: 'Dash recharges 25% faster', detail: 'Step between the furnace and its shadow.', apply: g => { g.stats.dashCooldown *= .75; } },
  { id: 'choir', name: 'Resonance Choir', type: 'PRISM', symbol: 'sun', color: '#dbb3f4', summary: '+1 prism echo · +12% radius', detail: 'One fracture sings. The next one answers.', apply: g => { g.stats.echo++; g.stats.radius *= 1.12; } },
  { id: 'magnet', name: 'Cullet Constellation', type: 'SALVAGE', symbol: 'star', color: '#ecd18e', summary: '+65 salvage attraction', detail: 'Even your broken work finds its way home.', apply: g => { g.stats.magnet += 65; } },
  { id: 'frostbite', name: 'Winter in the Glass', type: 'FREEZE', symbol: 'frost', color: '#7de3fb', summary: 'Frozen glass deals +40 damage', detail: 'The slowest moment can be the deadliest.', apply: g => { g.stats.frostBonus += 40; } },
  { id: 'sunheart', name: 'Ember Reservoir', type: 'SOLAR', symbol: 'sun', color: '#ffc67d', summary: 'Solar costs 35% less heat', detail: 'Borrow the sun. Return it in pieces.', apply: g => { g.stats.solarHeat *= .65; } },
  { id: 'horizon', name: 'Horizon Lens', type: 'GLASS', symbol: 'eye', color: '#abd9e6', summary: '+20% bubble growth', detail: 'See a larger possibility in every breath.', apply: g => { g.stats.growth *= 1.2; } },
  { id: 'brittle', name: 'Brittle Covenant', type: 'RISK / REWARD', symbol: 'skull', color: '#e1b4a5', summary: '+35% damage · −15 max health', detail: 'A sharper edge has a thinner heart. Power asks for something back.', apply: g => { g.stats.power *= 1.35; g.player.maxHp = Math.max(50, g.player.maxHp - 15); g.player.hp = Math.min(g.player.hp, g.player.maxHp); } },
  { id: 'caustic', name: 'Caustic Memory', type: 'REACTION', symbol: 'sun', color: '#efc29c', summary: '+20% elemental reaction damage', detail: 'Cold and fire remember each other long after the glass has broken.', apply: g => { g.stats.reactionPower *= 1.2; } },
  { id: 'stasis', name: 'Stasis Vessel', type: 'CONTROL', symbol: 'eye', color: '#aad8e4', summary: '+2 seconds glass lifetime', detail: 'Give your plan time to become inevitable.', apply: g => { g.stats.glassLifetime += 2; } },
  { id: 'siphon', name: 'Salvaged Breath', type: 'SUSTAIN', symbol: 'wind', color: '#a0dccb', summary: 'Each kill restores 3 breath', detail: 'The foundry gives back a little of what it takes.', apply: g => { g.stats.killBreath += 3; } },
];
export const RELICS = [
  { id: 'phoenix', name: 'Phoenix Tear', symbol: 'flame', color: '#f5ae69', description: 'Once per run, survive a fatal blow with 60 health.' },
  { id: 'winter', name: 'Winter Crown', symbol: 'frost', color: '#95e9ff', description: 'Every third shatter chills all living enemies.' },
  { id: 'mirror', name: 'Broken Halo', symbol: 'sun', color: '#e7c58b', description: 'Multi-trap chains restore 8 breath.' },
  { id: 'heart', name: 'Glass Heart', symbol: 'heart', color: '#efa9b2', description: 'Clear a wave without damage to recover 12 health.' },
  { id: 'star', name: 'Aether Compass', symbol: 'star', color: '#d5b1eb', description: 'Cullet pickups grant extra score.' },
  { id: 'seed', name: 'Living Cullet', symbol: 'prism', color: '#99e7bd', description: 'Every fifth kill drops a healing mote.' },
  { id: 'hourglass', name: 'Winter Hourglass', symbol: 'eye', color: '#a8d9e8', description: 'Glass remains intact for four extra seconds.' },
  { id: 'quench', name: 'Quenchstone', symbol: 'frost', color: '#91cbe9', description: 'Every dash removes 5 furnace heat.' },
  { id: 'siren', name: 'Siren’s Reed', symbol: 'wind', color: '#b1dfd1', description: 'Each captured creature restores 3 breath.' },
  { id: 'fuse', name: 'Gold Fault', symbol: 'chain', color: '#e6bd7a', description: 'Each linked bubble adds 8% more shatter damage.' },
  { id: 'lens', name: 'Lunar Lens', symbol: 'prism', color: '#bfc3ed', description: 'Prism blasts gain 40 radius.' },
  { id: 'mason', name: 'Mason’s Promise', symbol: 'anvil', color: '#c2d4b8', description: 'Recover breath 40% faster within 85 of cover.' },
];
export const realmForWave = wave => wave <= 2 ? 0 : wave <= 5 ? 1 : 2;
export const bossForWave = wave => wave === 5 ? 'THE RIME REGENT' : wave === 8 ? 'HELIOS, THE HOLLOW SUN' : null;
