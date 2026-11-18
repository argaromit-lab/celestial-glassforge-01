import { GlassforgeRun } from './simulation.js';
import { FoundryRenderer } from './renderer.js';
import { FoundryInterface } from './interface.js';
import { FoundryAudio } from './audio.js';
import { setSnapshot } from './scenes.js';

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('world');
const audio = new FoundryAudio();
const run = new GlassforgeRun(audio);
const renderer = new FoundryRenderer(canvas);
const ui = new FoundryInterface(document.getElementById('interface'), run, audio);
const input = { keys: new Set(), x: 630, y: 400, blow: false };
const params = new URLSearchParams(location.search);
const qa = params.has('qa');
let snapshot = params.get('shot');
if (snapshot) { setSnapshot(run, snapshot); ui.render(true); }
function fit() { viewport.style.transform = `scale(${Math.min(innerWidth / 1280, innerHeight / 800)})`; }
window.addEventListener('resize', fit); fit();
function pointer(event) { const r = canvas.getBoundingClientRect(); input.x = (event.clientX - r.left) / r.width * 1280; input.y = (event.clientY - r.top) / r.height * 800; }
window.addEventListener('pointermove', pointer);
canvas.addEventListener('pointerdown', event => {
  pointer(event); audio.unlock(); if (run.curated) return;
  if (event.button === 0) input.blow = true;
  if (event.button === 2) run.shatter();
});
window.addEventListener('pointerup', event => { if (event.button === 0) { input.blow = false; run.releaseBubble(); } });
window.addEventListener('pointercancel', () => { input.blow = false; run.releaseBubble(); });
viewport.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  audio.unlock(); input.keys.add(key);
  if (event.repeat) return;
  if (key === 'p' || key === 'escape') {
    if (ui.guide || ui.workshopOpen || ui.codexOpen) { ui.guide = false; ui.workshopOpen = false; ui.codexOpen = false; ui.render(true); }
    else run.togglePause();
    input.blow = false;
  }
  if (key === 'm') { audio.setMute(!audio.muted); ui.render(true); }
  if (key === 'enter' && ['title', 'victory', 'defeat'].includes(run.state)) { snapshot = null; run.curated = false; run.begin(); }
  if (run.state === 'forge' && ['1', '2', '3'].includes(key)) { snapshot = null; run.curated = false; run.chooseUpgrade(run.offers[Number(key) - 1]?.id); }
  else if (['1', '2', '3'].includes(key)) { run.releaseBubble(); run.element = Number(key) - 1; ui.render(true); }
  if (key === ' ' && !run.curated) run.dash(input);
});
function clearInput() { input.keys.clear(); input.blow = false; run.releaseBubble(); }
window.addEventListener('blur', () => { clearInput(); if (run.state === 'playing' && !qa && !run.curated) run.togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (run.state === 'playing' && !qa && !run.curated) run.togglePause(); } });

let previous = performance.now(), accumulator = 0, frame = 0, nowTime = 0;
const frameTimes = [], drawTimes = [];
function loop(now) {
  const delta = Math.min((now - previous) / 1000, .1); previous = now;
  nowTime += delta; accumulator += delta;
  while (accumulator >= 1 / 60) {
    if (!run.curated) run.update(1 / 60, input);
    accumulator -= 1 / 60;
  }
  const visualTime = run.curated ? 27.6 : nowTime;
  renderer.render(run, visualTime, input); ui.render(); frame++;
  if (frame > 10) { frameTimes.push(delta * 1000); drawTimes.push(renderer.drawMs); if (frameTimes.length > 600) { frameTimes.shift(); drawTimes.shift(); } }
  if (qa || snapshot) window.__AETHER_DIAGNOSTICS__ = {
    frame, state: run.state, wave: run.wave, realm: run.realm, score: run.score, kills: run.kills,
    health: run.player.hp, breath: run.player.breath, heat: run.heat, player: { x: run.player.x, y: run.player.y },
    bubbles: run.bubbles.length, trapped: run.enemies.filter(e => e.trapped).length,
    enemies: run.enemies.length, bossHP: run.boss?.hp ?? null, particles: run.particles.length,
    shatters: run.shatters, totalBlown: run.totalBlown, traps: run.traps, dashes: run.dashes,
    frameMs: frameTimes.length ? frameTimes.reduce((a, b) => a + b) / frameTimes.length : 0,
    renderMs: drawTimes.length ? drawTimes.reduce((a, b) => a + b) / drawTimes.length : 0,
    renderer: 'Canvas2D layered 2.5D', cachedArenas: renderer.arenas.size,
    cachedArenaBytes: renderer.arenas.size * 1280 * 800 * 4,
    sound: { unlocked: !!audio.ctx, muted: audio.muted, state: audio.ctx?.state || 'locked' },
  };
  window.__shotReady = true;
  requestAnimationFrame(loop);
}
if (qa) {
  // Test-only state access. Not installed on ordinary player URLs.
  window.__AETHER_QA__ = {
    run, input,
    snapshot(name) { snapshot = name; setSnapshot(run, name); ui.render(true); return { state: run.state, name }; },
    start(difficulty = 0) { snapshot = null; run.curated = false; run.begin(difficulty); ui.render(true); },
    advance(seconds, intent = {}) {
      const saved = { ...input, keys: input.keys };
      if (intent.x != null) input.x = intent.x;
      if (intent.y != null) input.y = intent.y;
      if (intent.blow != null) input.blow = intent.blow;
      if (intent.keys) input.keys = new Set(intent.keys);
      for (let i = 0; i < seconds * 60; i++) run.update(1 / 60, input);
      Object.assign(input, saved); ui.render(true); return { state: run.state, score: run.score, hp: run.player.hp, wave: run.wave };
    },
  };
}
requestAnimationFrame(loop);
