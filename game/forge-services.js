import { RELICS } from './content.js';

export const FORGE_SERVICES = [
  {
    id: 'repair',
    name: 'Mend the Vessel',
    symbol: 'heart',
    price: 55,
    description: 'Restore 45 health.',
    available: run => run.player.hp < run.player.maxHp,
    apply(run) {
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + 45);
    },
  },
  {
    id: 'temper',
    name: 'Deep Tempering',
    symbol: 'frost',
    price: 65,
    description: 'Gain 12 permanent heat capacity this run.',
    available: run => run.stats.heatCap < 260,
    apply(run) {
      run.stats.heatCap += 12;
    },
  },
  {
    id: 'salvage',
    name: 'Salvager’s Bargain',
    symbol: 'prism',
    price: 0,
    description: 'Trade 20 health for 65 cullet.',
    available: run => run.player.hp > 45,
    apply(run) {
      run.player.hp -= 20;
      run.damageTaken += 20;
      run.cullet += 65;
    },
  },
];

export function prepareMerchant(run) {
  const available = RELICS.filter(relic => !run.relics.includes(relic.id));
  run.merchantRelic = available.length ? available[Math.floor(run.rng() * available.length)].id : null;
  run.forgeServicesUsed = [];
  run.merchantPrice = 100 + run.realm * 25;
}

export function purchaseService(run, id) {
  if (run.state !== 'forge' || run.forgeServicesUsed.includes(id)) return false;
  const service = FORGE_SERVICES.find(service => service.id === id);
  if (!service || !service.available(run) || run.cullet < service.price) return false;
  run.cullet -= service.price;
  service.apply(run);
  run.forgeServicesUsed.push(id);
  run.audio.event('forge');
  run.notify();
  return true;
}

export function purchaseRelic(run) {
  if (run.state !== 'forge' || !run.merchantRelic || run.cullet < run.merchantPrice || run.relics.length >= 6) return false;
  if (run.relics.includes(run.merchantRelic)) return false;
  run.cullet -= run.merchantPrice;
  run.relics.push(run.merchantRelic);
  run.merchantRelic = null;
  run.audio.event('forge');
  run.notify();
  return true;
}

export function relicEffectSummary(run) {
  const effects = [];
  if (run.hasRelic('phoenix')) effects.push(run.phoenixUsed ? 'Phoenix spent' : 'One fatal blow forgiven');
  if (run.hasRelic('winter')) effects.push('Every third shatter chills');
  if (run.hasRelic('mirror')) effects.push('Multi-traps restore breath');
  if (run.hasRelic('heart')) effects.push('Flawless waves restore health');
  if (run.hasRelic('star')) effects.push('Salvage becomes score');
  if (run.hasRelic('seed')) effects.push('Every fifth kill heals');
  if (run.hasRelic('hourglass')) effects.push('Longer trap lifetime');
  if (run.hasRelic('quench')) effects.push('Dashes shed furnace heat');
  if (run.hasRelic('siren')) effects.push('Captures restore breath');
  if (run.hasRelic('fuse')) effects.push('Every chain adds bonus power');
  if (run.hasRelic('lens')) effects.push('Prism fractures reach farther');
  if (run.hasRelic('mason')) effects.push('Cover grants breath recovery');
  return effects;
}
