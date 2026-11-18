import { icon } from './icons.js';
import { ELEMENTS, REALMS, DIFFICULTIES, UPGRADES, RELICS, bossForWave, FOES } from './content.js';
import { format, clamp } from './math.js';
import { WORKSHOP_TOOLS, MILESTONES, normalizeWorkshop, buyTool } from './workshop.js';
import { FORGE_SERVICES, purchaseService, purchaseRelic } from './forge-services.js';
import { REACTIONS } from './element-reactions.js';

export function routeMarkup(realm = 0, allDone = false, extraClass = '') {
  return `<div class="route ${extraClass}">${REALMS.map((r, i) => `<div class="route-node ${i < realm || allDone ? 'done' : i === realm ? 'active' : ''}"><i></i><span>${r.name}</span></div>`).join('')}</div>`;
}
const timeString = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const relicSlots = ids => ids.map(id => { const r = RELICS.find(r => r.id === id); return `<div class="relic-slot" data-tooltip="${r.name}: ${r.description}" title="${r.name}: ${r.description}">${icon(r.symbol, '', r.color)}</div>`; }).join('');
const dots = (n, max = 4) => `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="pip${i < n ? ' on' : ''}"></i>`).join('')}</span>`;

export class FoundryInterface {
  constructor(root, run, audio) {
    this.root = root; this.run = run; this.audio = audio; this.lastState = ''; this.lastSignature = ''; this.lastHud = 0;
    this.guide = false; this.announcement = document.getElementById('announcement');
    this.workshopOpen = false; this.codexOpen = false; this.codexTab = 'creatures';
    root.addEventListener('click', event => this.action(event));
    run.listeners.push(() => this.render(true));
    this.render(true);
  }
  action(event) {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const { action, value } = button.dataset;
    this.audio.unlock(); this.audio.event('click');
    if (action === 'start') { this.guide = false; this.run.curated = false; this.run.begin(); }
    if (action === 'difficulty') { this.run.difficulty = Number(value); this.render(true); }
    if (action === 'element') { this.run.releaseBubble(); this.run.element = Number(value); this.render(true); }
    if (action === 'pause' || action === 'resume') this.run.togglePause();
    if (action === 'sound') { this.audio.setMute(!this.audio.muted); this.render(true); }
    if (action === 'motion') { this.run.reducedMotion = !this.run.reducedMotion; this.render(true); }
    if (action === 'upgrade') { this.run.curated = false; this.run.chooseUpgrade(value); }
    if (action === 'reroll') this.run.reroll();
    if (action === 'title') { this.guide = false; this.run.state = 'title'; this.render(true); }
    if (action === 'guide') { this.guide = !this.guide; this.render(true); }
    if (action === 'workshop') { this.workshopOpen = !this.workshopOpen; this.render(true); }
    if (action === 'tool') { buyTool(this.run, value); this.render(true); }
    if (action === 'codex') { this.codexOpen = !this.codexOpen; this.render(true); }
    if (action === 'codex-tab') { this.codexTab = value; this.render(true); }
    if (action === 'service') purchaseService(this.run, value);
    if (action === 'buy-relic') purchaseRelic(this.run);
  }
  hud() {
    const g = this.run, p = g.player, boss = g.boss;
    const entries = Object.entries(g.upgrades).slice(0, 5);
    const roster = [...new Set(g.spawnQueue.concat(g.enemies.map(e => e.kind)))].slice(0, 3);
    if (!roster.length) roster.push('rime', 'charger', 'sentinel');
    const count = kind => g.spawnQueue.filter(e => e === kind).length + g.enemies.filter(e => e.kind === kind).length;
    const upgrades = entries.length ? entries.map(([id, level]) => { const u = UPGRADES.find(u => u.id === id); return `<div class="kit-row">${icon(u.symbol)}<div><div class="kit-name">${u.name}</div>${dots(level)}</div></div>`; }).join('') : `<div class="kit-row">${icon('anvil')}<div><div class="kit-name">Apprentice's tools</div>${dots(1)}</div></div><div class="kit-note">The forge remembers<br>every fracture.</div>`;
    const relics = relicSlots(g.relics) + Array.from({ length: Math.max(0, 6 - g.relics.length) }, () => `<div class="relic-slot empty">${icon('prism')}</div>`).join('');
    return `<section class="hud${['forge', 'paused', 'victory', 'defeat'].includes(g.state) ? ' dimmed' : ''}" aria-label="Run status">
      <div class="realm-status"><div class="realm-line">REALM ${g.realm + 1} OF 3 <span>—</span> <strong>${REALMS[g.realm].name}</strong></div><div class="wave-line">WAVE ${g.wave}/8 <span>— ${g.wave === 8 ? 'BOSS 2 OF 2' : g.wave === 5 ? 'BOSS 1 OF 2' : 'THE FOUNDRY DESCENT'}</span></div>
        <div class="heat"><div class="meter-label"><span>FURNACE HEAT</span><strong class="number">${Math.floor(g.heat)}/${g.stats.heatCap}</strong></div><div class="meter"><i style="width:${clamp(g.heat / g.stats.heatCap * 100, 0, 100)}%"></i></div><div class="heat-warning">${g.heat > g.stats.heatCap * .8 ? 'CRITICAL · FREEZE GLASS TO COOL' : 'COLD CONTAINS. FIRE CONSUMES.'}</div></div>
        <div class="incoming"><header>INCOMING</header>${roster.map(kind => `<div class="incoming-row">${icon(kind === 'cinder' ? 'flame' : kind === 'sentinel' ? 'skull' : kind === 'spitter' ? 'eye' : 'frost')}<span>${FOES[kind].name.split(' ').at(-1)}</span><b>×${count(kind)}</b></div>`).join('')}</div></div>
      <div class="objectives"><div class="objective"><b>WIN</b><span>Clear 8 waves · Shatter both wardens</span></div><div class="objective lose"><b>LOSE</b><span>Health reaches zero</span></div></div>
      <div class="boss-status"><div class="boss-name">${boss ? bossForWave(g.wave) : REALMS[g.realm].subtitle.toUpperCase()}</div><div class="boss-subtitle">${boss ? `PHASE ${boss.phase} · ${boss.phase === 2 ? 'CORONA FRACTURE' : 'FURNACE HEART'}` : `BREATH BECOMES GLASS. GLASS BECOMES A WEAPON.`}</div><div class="boss-meter"><i style="width:${boss ? Math.max(0, boss.hp / boss.maxHp * 100) : Math.max(0, 100 - g.waveTime * 2)}%"></i></div><div class="boss-hp number">${boss ? `${format(boss.hp)} / ${format(boss.maxHp)} HP` : `${g.enemies.length + g.spawnQueue.length} CREATURES REMAIN`}</div></div>
      ${routeMarkup(g.realm, false, 'hud-route')}
      <div class="score-cluster"><div class="score-caption">SCORE</div><div class="score-value">${format(g.score)}</div><div class="score-detail"><span>COMBO <b>×${g.combo.toFixed(2)}</b></span><span>CULLET <b>${format(g.cullet)}</b></span></div><div class="combo-track"><i style="width:${clamp(g.comboTime / 6 * 100, 0, 100)}%"></i></div></div>
      <aside class="run-kit"><div class="kit-heading">RUN UPGRADES</div>${upgrades}<div class="relics"><div class="kit-heading">RELICS <small>${g.relics.length}/6</small></div><div class="relic-grid">${relics}</div></div><div class="kit-note">${g.relics.length ? 'Some things are stronger<br>after they break.' : 'Wardens guard relics.<br>Make them let go.'}</div></aside>
      <div class="run-time">${DIFFICULTIES[g.difficulty].name}<br><strong>${timeString(g.elapsed)}</strong> · SEED ${g.seed}</div>
      <div class="vitals"><div class="vital-row health">${icon('heart')}<div><div class="meter-label"><span>HEALTH</span><strong class="number">${Math.ceil(p.hp)}/${p.maxHp}</strong></div><div class="meter"><i style="width:${p.hp / p.maxHp * 100}%"></i></div></div></div><div class="vital-row breath">${icon('lung')}<div><div class="meter-label"><span>BREATH</span><strong class="number">${Math.floor(p.breath)}/${p.maxBreath}</strong></div><div class="meter"><i style="width:${p.breath / p.maxBreath * 100}%"></i></div></div></div></div>
      <div class="element-selector">${ELEMENTS.map((e, i) => `<button class="element-key ${i === g.element ? 'active' : ''}" data-action="element" data-value="${i}" style="--element:${e.color}" aria-pressed="${i === g.element}" aria-label="${i + 1}: ${e.name}"><kbd>${i + 1}</kbd>${icon(e.symbol)}<span>${e.name}</span></button>`).join('')}</div>
      <div class="element-hint">${g.element === 0 ? 'FREEZE STOPS PROJECTILES · COOLS THE FURNACE' : g.element === 1 ? 'SOLAR BREAKS ARMOR · WATCH YOUR HEAT' : 'PRISM ECHOES THROUGH LINKED GLASS'}</div>
      <div class="controls"><span class="control"><kbd>WASD</kbd> MOVE</span><span class="control"><kbd>LMB</kbd> BLOW</span><span class="control"><kbd>RMB</kbd> SHATTER</span><span class="control"><kbd>SPACE</kbd> DASH + SHATTER</span><span class="control"><kbd>1–3</kbd> GLASS TYPE</span><span class="control"><kbd>P</kbd> PAUSE</span><span class="control"><kbd>M</kbd> SOUND</span><div class="utility"><button data-action="sound" aria-label="${this.audio.muted ? 'Enable' : 'Mute'} sound">${icon('sound')}</button><button data-action="pause" aria-label="Pause game">${icon('pause')}</button></div></div>
    </section>`;
  }
  title() {
    const g = this.run;
    return `<section class="screen title-screen" aria-label="Title screen"><div class="title-topline"><span class="maker-mark">${icon('prism')} THE CELESTIAL GLASSFORGE</span><span>AN ELEMENTAL ACTION ROGUELIKE</span></div>
      <div class="title-main"><div class="title-emblem">${icon('sun')}</div><h1>AETHER BLOWPIPE</h1><div class="subtitle">GLACIER &amp; FURNACE</div><div class="tagline">Breathe glass. Capture chaos. Shatter the sun.</div><p class="title-description">The last glassblower descends into a frozen foundry.<br>Trap its creatures in living glass. Break the chain before it breaks you.</p></div>
      <div class="title-cards">${ELEMENTS.map((e, i) => `<div class="element-card" style="--element:${e.color}">${icon(e.symbol, '', e.color)}<h3 style="color:${e.color}">${i + 1} · ${e.name}</h3><p>${e.description}</p></div>`).join('')}</div>
      <div class="title-route">${routeMarkup(0)}<div class="title-route-caption">3 REALMS &nbsp; / &nbsp; 8 WAVES &nbsp; / &nbsp; 2 WARDENS &nbsp; / &nbsp; ONE BREATH AT A TIME</div></div>
      <div class="difficulty" aria-label="Difficulty">${DIFFICULTIES.map((d, i) => `<button class="${i === g.difficulty ? 'selected' : ''}" data-action="difficulty" data-value="${i}" aria-pressed="${i === g.difficulty}">${d.name}<small>${d.description}</small></button>`).join('')}</div>
      <button class="primary start-run" data-action="start">${icon('anvil')} ENTER THE FOUNDRY</button><div class="start-note">HOLD LMB TO BLOW &nbsp; · &nbsp; RMB TO SHATTER &nbsp; · &nbsp; SPACE TO DASH</div>
      <div class="title-record">WORKSHOP RECORD<strong>${format(g.best.score)}</strong>${g.best.victories} WARDEN CONQUESTS · ${g.best.mastery} MASTERY<br><button class="workshop-link" data-action="workshop">OPEN PERMANENT WORKSHOP ↗</button></div><div class="title-controls"><button data-action="codex">FOUNDRY CODEX</button><button data-action="guide">FIELD GUIDE</button><button data-action="sound">${icon('sound')}${this.audio.muted ? 'SOUND OFF' : 'SOUND ON'}</button></div></section>`;
  }
  forge() {
    const g = this.run;
    return `<section class="screen forge-screen" aria-label="Forge refit screen"><div class="forge-header"><div class="forge-location">${REALMS[g.realm].name}<b>WAVE ${g.wave} CLEARED · THE FIRE IS YOURS</b></div><span>${icon('anvil', '', '#bda679')}</span><div class="forge-bank">${format(g.cullet)}<small>CULLET SALVAGED</small></div></div>
      <div class="forge-title"><div class="smallcaps">THE TRAVELING FORGE</div><h1 style="margin-top:14px">Refine your next breath.</h1><p>Choose one refit. Every fracture changes the way you fight.</p><div class="reward-note">ONE REFIT FREE · CHOOSE WITH MOUSE OR 1 / 2 / 3</div></div>
      <div class="forge-offers">${g.offers.map((u, i) => `<button class="upgrade-card" data-action="upgrade" data-value="${u.id}">${icon(u.symbol, '', u.color)}<span class="upgrade-type">${u.type} · REFIT ${(g.upgrades[u.id] || 0) + 1}</span><h2>${u.name}</h2><p class="upgrade-summary">${u.summary}</p><div class="upgrade-flavor">${u.detail}</div><div class="upgrade-footer"><span>[${i + 1}] TAKE REFIT</span><span class="upgrade-level">${Array.from({ length: 4 }, (_, j) => `<i class="${j <= (g.upgrades[u.id] || 0) ? 'filled' : ''}"></i>`).join('')}</span></div></button>`).join('')}</div>
      <div class="forge-bottom"><button class="text-button" data-action="reroll"${g.cullet < 40 ? ' disabled' : ''}>REFORGE CHOICES · 40 CULLET</button><div class="forge-tip">${[2, 5, 7].includes(g.wave) ? 'A new relic awaits beyond this forge.' : 'Your furnace cools. Your breath returns.'}<br><span class="gold">Next: ${g.wave + 1 === 8 ? 'THE HOLLOW SUN · FINAL WARDEN' : `WAVE ${g.wave + 1} · ${REALMS[g.wave < 2 ? 0 : g.wave < 5 ? 1 : 2].name}`}</span></div></div>
      <div class="forge-services">${FORGE_SERVICES.slice(0, 2).map(s => `<button class="service-button" data-action="service" data-value="${s.id}" title="${s.description}"${g.cullet < s.price || !s.available(g) || g.forgeServicesUsed.includes(s.id) ? ' disabled' : ''}>${icon(s.symbol)}<span>${s.name}<small>${s.price} CULLET</small></span></button>`).join('')}${g.merchantRelic ? this.merchantButton() : '<span class="merchant-empty">THE RELIQUARY IS EMPTY</span>'}</div>
      ${routeMarkup(g.realm, false, 'forge-route')}</section>`;
  }
  merchantButton() {
    const g = this.run;
    const relic = RELICS.find(r => r.id === g.merchantRelic);
    return `<button class="service-button relic-offer" data-action="buy-relic" title="${relic.description}"${g.cullet < g.merchantPrice || g.relics.length >= 6 ? ' disabled' : ''}>${icon(relic.symbol, '', relic.color)}<span>${relic.name}<small>RELIC · ${g.merchantPrice} CULLET</small></span></button>`;
  }
  workshop() {
    const g = this.run;
    normalizeWorkshop(g.best);
    return `<section class="screen modal-scrim" aria-label="Permanent workshop"><div class="workshop-panel"><div class="workshop-heading"><div><span class="smallcaps">KNOWLEDGE SURVIVES THE FIRE</span><h1>The permanent workshop.</h1></div><div class="mastery-bank">${g.best.mastery}<span>MASTERY</span></div></div><p class="workshop-intro">Choose your opening tool. Each is a different promise, with a different price.<br>Earn mastery from every descent. Your original Artisan is always ready.</p><div class="workshop-tools">${WORKSHOP_TOOLS.map(tool => {
      const owned = g.best.tools.includes(tool.id);
      const selected = g.best.selectedTool === tool.id;
      return `<button class="tool-option${selected ? ' selected' : ''}" data-action="tool" data-value="${tool.id}"${!owned && g.best.mastery < tool.cost ? ' disabled' : ''}>${icon(tool.icon)}<span class="tool-info"><strong>${tool.name}</strong><em>${tool.subtitle}</em><span>${tool.description}</span><small>${tool.tradeoff}</small></span><b>${selected ? 'EQUIPPED' : owned ? 'EQUIP' : `${tool.cost} MASTERY`}</b></button>`;
    }).join('')}</div><div class="milestone-heading">MEMORIES IN THE GLASS <span>${g.best.milestones.length}/${MILESTONES.length}</span></div><div class="milestone-grid">${MILESTONES.map(m => `<div class="milestone${g.best.milestones.includes(m.id) ? ' earned' : ''}" title="${m.description}">${icon('star')}<span>${m.name}</span></div>`).join('')}</div><button class="text-button" data-action="workshop">RETURN TO THE FOUNDRY</button></div></section>`;
  }
  codex() {
    let body;
    if (this.codexTab === 'creatures') {
      body = `<div class="codex-creatures">${Object.entries(FOES).map(([id, foe]) => {
        const tactics = {
          rime: 'Patient pursuers. Lead a group through one wide Freeze sphere, then shatter as they cluster.',
          cinder: 'Fast, fragile flankers. Watch the wings; a half-grown bubble is enough to catch them.',
          spitter: 'Keeps its distance and fires aimed shards. A Freeze bubble between you and it blocks the shot.',
          charger: 'A straight path lights before its charge. Move sideways or dash through it, then counterattack.',
          sentinel: 'Slow armored front line. Solar glass burns through its shell; use cold glass while your furnace cools.',
        };
        return `<article class="codex-creature">${icon(id === 'cinder' ? 'flame' : id === 'sentinel' ? 'skull' : id === 'spitter' ? 'eye' : 'frost', '', foe.color)}<div><h2>${foe.name}</h2><span>${foe.hp} BASE HEALTH · ${foe.damage} CONTACT DAMAGE</span><p>${tactics[id]}</p></div></article>`;
      }).join('')}</div>`;
    } else if (this.codexTab === 'glass') {
      body = `<div class="codex-glass">${ELEMENTS.map(e => `<article><header>${icon(e.symbol, '', e.color)}<h2>${e.name}</h2></header><p>${e.description}</p><span>${e.damage} BASE SHATTER · ${e.heat > 0 ? '+' : ''}${e.heat} HEAT / SECOND</span></article>`).join('')}</div><div class="codex-section-title">ELEMENTAL REACTIONS</div>${REACTIONS.map(r => `<article class="codex-reaction"><div style="color:${r.color}">${icon('chain')}<h2>${r.name}</h2></div><p>${r.description}</p></article>`).join('')}`;
    } else {
      body = `<div class="codex-relics">${RELICS.map(r => `<article>${icon(r.symbol, '', r.color)}<div><h2>${r.name}</h2><p>${r.description}</p></div></article>`).join('')}</div>`;
    }
    return `<section class="screen modal-scrim" aria-label="Foundry codex"><div class="codex-panel"><div class="smallcaps">OBSERVATIONS FROM THE DESCENT</div><h1>The foundry codex.</h1><nav class="codex-tabs">${['creatures', 'glass', 'relics'].map(tab => `<button class="${this.codexTab === tab ? 'selected' : ''}" data-action="codex-tab" data-value="${tab}">${tab.toUpperCase()}</button>`).join('')}</nav><div class="codex-content">${body}</div><button class="text-button" data-action="codex">CLOSE CODEX</button></div></section>`;
  }
  results() {
    const g = this.run, won = g.state === 'victory';
    const rank = won ? g.damageTaken < 90 && g.bestChain >= 3 ? 'S' : g.damageTaken < 220 ? 'A' : 'B' : g.wave > 5 ? 'B' : 'C';
    const stats = [['FINAL SCORE', format(g.score)], ['CREATURES SHATTERED', g.kills], ['LONGEST CHAIN', `×${g.bestChain}`], ['DESCENT TIME', timeString(g.elapsed)]];
    return `<section class="screen result-screen" aria-label="${won ? 'Victory' : 'Defeat'} results"><div class="result-top"><span>THE CELESTIAL GLASSFORGE</span><span>${DIFFICULTIES[g.difficulty].name} · SEED ${g.seed}</span></div><div class="result-heading"><span class="smallcaps gold">${won ? 'ALL THREE REALMS RECLAIMED' : 'THE FOUNDRY KEEPS ITS SECRETS'}</span><h1>${won ? 'THE SUN IS SHATTERED.' : 'EVERY VESSEL BREAKS.'}</h1><p>${won ? 'And in the quiet, a new world catches the light.' : g.endReason}</p></div>
      <div class="result-badge"><span class="rank">${rank}</span><span class="rank-caption">${won ? 'WARDEN CONQUEST' : 'DESCENT RANK'}</span></div><div class="result-stats">${stats.map(([name, value]) => `<div class="result-stat"><div class="stat-label">${name}</div><strong>${value}</strong></div>`).join('')}</div>
      <div class="mastery-note">WORKSHOP MASTERY<br><strong>+${Math.floor(g.cullet / 20) + g.wave * 4} KNOWLEDGE PRESERVED</strong><br>${won ? 'A perfect vessel is never finished.' : 'Change your glass. Change your fate.'}</div>
      <div class="result-build"><span>YOUR FINAL CONSTELLATION</span><div class="result-build-icons">${relicSlots(g.relics)}${Object.keys(g.upgrades).slice(0, 4).map(id => { const u = UPGRADES.find(u => u.id === id); return `<div class="relic-slot" title="${u.name}">${icon(u.symbol, '', u.color)}</div>`; }).join('')}</div></div>
      ${routeMarkup(g.realm, won, 'result-route')}<div class="result-actions"><button class="primary" data-action="start">${icon('anvil')} ${won ? 'FORGE ANOTHER RUN' : 'REFORGE & TRY AGAIN'}</button><button class="text-button" data-action="title">RETURN TO WORKSHOP</button></div><div class="result-footer">BEST ${format(g.best.score)} &nbsp; · &nbsp; PROGRESS SAVED LOCALLY &nbsp; · &nbsp; ${g.traps} CAPTURES / ${g.shatters} SHATTERS</div></section>`;
  }
  pause() {
    const g = this.run;
    return `<section class="screen modal-scrim" aria-label="Pause screen"><div class="pause-panel"><div class="smallcaps">A MOMENT BETWEEN FLAMES</div><h1 style="margin-top:18px">Hold your breath.</h1><p>The foundry will wait.<br>Wave ${g.wave} · ${REALMS[g.realm].name}</p><div class="pause-buttons"><button class="primary" data-action="resume">RESUME DESCENT</button><button class="text-button" data-action="guide">READ FIELD GUIDE</button><button class="text-button" data-action="title">RETURN TO WORKSHOP</button></div><div class="setting-row"><span>Foundry soundscape</span><button class="toggle" data-action="sound">${this.audio.muted ? 'OFF' : 'ON'}</button></div><div class="setting-row"><span>Reduce camera motion</span><button class="toggle" data-action="motion">${g.reducedMotion ? 'ON' : 'OFF'}</button></div></div></section>`;
  }
  fieldGuide() {
    return `<section class="screen modal-scrim" aria-label="Field guide"><div class="guide-panel"><div class="smallcaps">THE GLASSBLOWER'S FIELD GUIDE</div><h1 style="margin-top:14px">Make the danger fragile.</h1><h2>01 · BREATHE & CONTAIN</h2><p>Move with WASD. Aim with the mouse. Hold LMB to grow a glass sphere; release to leave it floating. Creatures touching glass become trapped. You move more slowly while blowing. Stop blowing to recover breath.</p><h2>02 · SHATTER THE CHAIN</h2><p>RMB shatters your glass. Close spheres link together for extra damage. Trap several creatures before you break the chain. SPACE dashes through danger and shatters at the same time.</p><h2>03 · READ THE TEMPERATURE</h2><p>1 FREEZE cools your furnace, slows enemies and intercepts projectiles. 2 SOLAR hits harder and burns armor, but makes heat. 3 PRISM extends chain echoes. Overheating cracks your vessel: switch to Freeze before the meter fills.</p><h2>04 · SURVIVE THE WARDENS</h2><p>Clear eight waves and both bosses to win. A dotted laser is a warning; a solid beam is lethal. Crystal pillars and small furnaces block boss fire. Break supply crates for cullet and breath. Between waves choose a free refit; reroll for 40 cullet.</p><p>P or Escape pauses. M toggles original synthesized audio. Your best score and mastery save on this browser.</p><button class="primary" data-action="guide">BACK TO THE FOUNDRY</button></div></section>`;
  }
  render(force = false) {
    const g = this.run, now = performance.now();
    const signature = `${g.state}/${g.difficulty}/${g.element}/${this.audio.muted}/${this.guide}/${this.workshopOpen}/${this.codexOpen}/${this.codexTab}`;
    if (!force && signature === this.lastSignature && now - this.lastHud < 120) return;
    this.lastHud = now;
    if (g.state === 'title') {
      if (signature === this.lastSignature && !force) return;
      this.root.innerHTML = this.title() + (this.guide ? this.fieldGuide() : '') + (this.workshopOpen ? this.workshop() : '') + (this.codexOpen ? this.codex() : '');
    } else {
      if (['forge', 'paused', 'victory', 'defeat'].includes(g.state) && signature === this.lastSignature && !force) return;
      this.root.innerHTML = this.hud() + (g.state === 'forge' ? this.forge() : g.state === 'paused' ? this.pause() : g.state === 'victory' || g.state === 'defeat' ? this.results() : '') + (this.guide ? this.fieldGuide() : '');
    }
    if (g.state !== this.lastState) this.announcement.textContent = g.state === 'playing' ? `Wave ${g.wave}, ${REALMS[g.realm].name}` : g.state;
    this.lastState = g.state; this.lastSignature = signature;
  }
}
