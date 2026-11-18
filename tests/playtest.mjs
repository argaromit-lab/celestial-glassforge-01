import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchBrowser, origin } from './browser.mjs';
import sharp from 'sharp';

await mkdir('artifacts', { recursive: true });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [], outsideRequests = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) outsideRequests.push(r.url()); });
async function check(name, action) {
  await action(); checks.push({ name, pass: true }); console.log(`PASS ${name}`);
}
await page.goto(`${origin}/?qa`); await page.waitForFunction(() => window.__shotReady);
await check('title, difficulty and field guide', async () => {
  await page.getByRole('button', { name: /APPRENTICE/ }).click();
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.difficulty), 0);
  await page.getByRole('button', { name: 'FIELD GUIDE', exact: true }).click();
  await page.getByRole('heading', { name: 'Make the danger fragile.' }).waitFor();
  await page.getByRole('button', { name: 'BACK TO THE FOUNDRY' }).click();
});
await check('permanent workshop and three codex tabs are usable', async () => {
  await page.getByRole('button', { name: /OPEN PERMANENT WORKSHOP/ }).click();
  await page.getByRole('heading', { name: 'The permanent workshop.' }).waitFor();
  assert.equal(await page.locator('.tool-option').count(), 4);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'FOUNDRY CODEX', exact: true }).click();
  assert.equal(await page.locator('.codex-creature').count(), 5);
  await page.getByRole('button', { name: 'GLASS', exact: true }).click();
  assert.equal(await page.locator('.codex-reaction').count(), 3);
  await page.getByRole('button', { name: 'RELICS', exact: true }).click();
  assert.equal(await page.locator('.codex-relics article').count(), 12);
  await page.keyboard.press('Escape');
});
await check('start and movement respond to real keyboard', async () => {
  await page.getByRole('button', { name: 'ENTER THE FOUNDRY' }).click();
  const before = await page.evaluate(() => ({ ...window.__AETHER_QA__.run.player }));
  await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
  const after = await page.evaluate(() => ({ ...window.__AETHER_QA__.run.player }));
  assert.ok(after.x > before.x + 45); assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.state), 'playing');
});
await check('LMB grows glass and spends breath, release recovers', async () => {
  await page.mouse.move(760, 520); await page.mouse.down(); await page.waitForTimeout(850);
  const growing = await page.evaluate(() => ({ r: window.__AETHER_QA__.run.charge?.r, breath: window.__AETHER_QA__.run.player.breath }));
  assert.ok(growing.r > 30); assert.ok(growing.breath < 90);
  await page.mouse.up(); await page.waitForTimeout(120);
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.bubbles.length > 0));
  const spent = growing.breath; await page.waitForTimeout(650);
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.player.breath) > spent);
});
await check('RMB shatters and SPACE dashes through real input', async () => {
  const before = await page.evaluate(() => ({ s: window.__AETHER_QA__.run.shatters, x: window.__AETHER_QA__.run.player.x }));
  await page.mouse.click(760, 520, { button: 'right' });
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.shatters), before.s + 1);
  await page.keyboard.down('a'); await page.keyboard.press('Space'); await page.waitForTimeout(250); await page.keyboard.up('a');
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.dashes) > 0);
});
await check('three glass types, pause and sound toggles', async () => {
  for (const key of ['2', '3', '1']) { await page.keyboard.press(key); assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.element), Number(key) - 1); }
  await page.keyboard.press('p');
  const t = await page.evaluate(() => window.__AETHER_QA__.run.time); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.time), t);
  await page.getByRole('button', { name: 'RESUME DESCENT' }).click();
  await page.keyboard.press('m'); await page.waitForFunction(() => window.__AETHER_DIAGNOSTICS__.sound.muted === true);
  await page.keyboard.press('m');
});
await check('capture, kill, score and pickup using real combat input', async () => {
  await page.evaluate(() => {
    const q = window.__AETHER_QA__, g = q.run; q.start(0);
    g.spawnQueue = []; g.enemies = []; g.boss = null;
    g.player.x = 505; g.player.y = 523;
    const e = g.spawnEnemy('rime', 574, 523); e.spawn = 0;
  });
  await page.mouse.move(720, 523); await page.mouse.down(); await page.waitForTimeout(1100); await page.mouse.up();
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.traps) > 0);
  await page.mouse.click(720, 523, { button: 'right' });
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.kills) > 0);
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.score) > 0);
  await page.keyboard.down('d'); await page.waitForTimeout(350); await page.keyboard.up('d');
  assert.ok(await page.evaluate(() => window.__AETHER_QA__.run.cullet) > 0);
});
await check('wave clear, forge choice, reroll and next wave', async () => {
  await page.waitForFunction(() => window.__AETHER_QA__.run.state === 'forge');
  await page.evaluate(() => { const g = window.__AETHER_QA__.run; g.cullet = 300; g.player.hp = 90; g.notify(); });
  await page.getByRole('button', { name: /Mend the Vessel/ }).click();
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.player.hp), 135);
  await page.locator('[data-action="buy-relic"]').click();
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.relics.length), 1);
  await page.getByRole('button', { name: /REFORGE CHOICES/ }).click();
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.cullet), 105);
  await page.keyboard.press('1');
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.wave), 2);
  assert.equal(await page.evaluate(() => Object.values(window.__AETHER_QA__.run.upgrades).reduce((a, b) => a + b, 0)), 1);
});
await check('thermal mechanics and overheat have consequences', async () => {
  const result = await page.evaluate(() => {
    const q = window.__AETHER_QA__, g = q.run; q.start(0); g.enemies = []; g.spawnQueue = Array(100).fill('rime');
    g.element = 1; g.heat = 125; const hp = g.player.hp;
    q.advance(1, { blow: true, x: 800, y: 500 });
    const damaged = g.player.hp < hp; g.releaseBubble(); g.element = 0; g.player.breath = 100;
    const before = g.heat; q.advance(1, { blow: true });
    return { damaged, cooled: g.heat < before };
  });
  assert.ok(result.damaged); assert.ok(result.cooled);
});
await check('boss phases, telegraph, cover interception and victory', async () => {
  const result = await page.evaluate(() => {
    const q = window.__AETHER_QA__, g = q.run; q.start(0); g.wave = 8; g.queueWave(); g.spawnQueue = []; g.enemies = [];
    const b = g.boss; b.hp = 100; g.player.x = 900; g.player.y = 550;
    b.attack = .01; b.age = 6;
    q.advance(.1); const phase2 = b.phase === 2; const telegraph = !!b.laser;
    g.bullets = []; g.shoot(343, 355, 0, 0, '#ffffff'); g.updateBullets(.01); const blocked = !g.bullets.length;
    g.bubbles.push({ id: 9000, x: b.x + 65, y: b.y, r: 65, element: 1, active: true, trappedIds: [], age: 1, life: 5, vx: 0, vy: 0 });
    g.shatter(); q.advance(2.5); return { phase2, telegraph, blocked, state: g.state };
  });
  assert.ok(result.phase2); assert.ok(result.telegraph); assert.ok(result.blocked); assert.equal(result.state, 'victory');
  await page.getByRole('heading', { name: 'THE SUN IS SHATTERED.' }).waitFor();
});
await check('fatal damage, defeat and one-click retry', async () => {
  await page.getByRole('button', { name: 'FORGE ANOTHER RUN' }).click();
  await page.evaluate(() => { const g = window.__AETHER_QA__.run; g.player.hp = 1; g.player.invuln = 0; g.hurt(10, 'A test projectile cracked the vessel.'); });
  await page.getByRole('heading', { name: 'EVERY VESSEL BREAKS.' }).waitFor();
  await page.getByRole('button', { name: 'REFORGE & TRY AGAIN' }).click();
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.player.hp), 150);
  assert.equal(await page.evaluate(() => window.__AETHER_QA__.run.wave), 1);
});

await page.evaluate(() => { window.__AETHER_QA__.snapshot('combat'); });
await page.waitForTimeout(2000);
const performanceMetrics = await page.evaluate(() => window.__AETHER_DIAGNOSTICS__);
const pixels = await page.locator('canvas').screenshot();
const { data, info } = await sharp(pixels).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let minL = 255, maxL = 0, edge = 0, samples = 0;
const bins = new Uint32Array(64);
for (let y = 1; y < info.height; y += 3) for (let x = 1; x < info.width; x += 3) {
  const p = (y * info.width + x) * 3, r = data[p], g = data[p + 1], b = data[p + 2];
  const lum = .2126 * r + .7152 * g + .0722 * b; minL = Math.min(minL, lum); maxL = Math.max(maxL, lum);
  bins[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)]++; samples++;
  const prev = p - 3;
  if (Math.abs(r - data[prev]) + Math.abs(g - data[prev + 1]) + Math.abs(b - data[prev + 2]) > 48) edge++;
}
const probabilities = Array.from(bins).map(n => n / samples).filter(Boolean);
const pixelMetrics = { contrast: maxL - minL, edgeDensity: edge / samples, colorEntropyBits: -probabilities.reduce((s, p) => s + p * Math.log2(p), 0), dominantColorShare: Math.max(...probabilities) };
assert.ok(pixelMetrics.contrast > 90); assert.ok(pixelMetrics.edgeDensity > .04);

const layout = {};
for (const state of ['combat', 'title', 'upgrade', 'victory']) {
  await page.evaluate(state => window.__AETHER_QA__.snapshot(state), state);
  layout[state] = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('#interface button, #interface h1, #interface h2, .kit-name, .objective, .realm-line, .wave-line, .result-stat')];
    const r = document.getElementById('viewport').getBoundingClientRect();
    return nodes.map(e => ({ text: e.textContent.trim().slice(0, 70), x: e.getBoundingClientRect().x - r.x, y: e.getBoundingClientRect().y - r.y, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height, scroll: e.scrollWidth > e.clientWidth + 2 })).filter(b => b.x < -1 || b.y < -1 || b.x + b.width > r.width + 1 || b.y + b.height > r.height + 1 || b.scroll);
  });
  assert.deepEqual(layout[state], [], `${state} has clipped/outside UI`);
}
// Smaller desktop still uses the same authored 16:10 composition.
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(100);
const fit = await page.locator('#viewport').boundingBox(); assert.ok(fit.width <= 1025 && fit.height <= 769);
assert.deepEqual(errors, []); assert.deepEqual(outsideRequests, []);
await writeFile('artifacts/qa-report.json', JSON.stringify({ timestamp: new Date().toISOString(), checks, errors, outsideRequests, performanceMetrics, pixelMetrics, layout, smallerDesktop: fit }, null, 2));
console.log(JSON.stringify({ checks: checks.length, errors: errors.length, outsideRequests: outsideRequests.length, performanceMetrics, pixelMetrics }, null, 2));
await browser.close();
