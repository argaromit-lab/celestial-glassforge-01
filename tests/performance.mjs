import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { launchBrowser, origin } from './browser.mjs';

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(`${origin}/?qa&shot=combat`);
await page.waitForFunction(() => window.__shotReady);
await page.evaluate(() => {
  const g = window.__AETHER_QA__.run;
  g.curated = false;
  g.labels = [];
  g.heat = 55;
  g.player.invuln = 0;
});
await mkdir('artifacts/motion', { recursive: true });
const samples = [];
const start = performance.now();
for (let i = 0; i < 12; i++) {
  await page.mouse.move(699 + Math.cos(i * .55) * 140, 430 + Math.sin(i * .55) * 90);
  if (i % 3 === 0) await page.mouse.down();
  if (i % 3 === 2) { await page.mouse.up(); await page.mouse.click(650, 420, { button: 'right' }); }
  const key = ['a', 'w', 'd', 's'][Math.floor(i / 3)];
  await page.keyboard.down(key);
  await page.waitForTimeout(440);
  await page.keyboard.up(key);
  if (i === 3 || i === 7) await page.keyboard.press('Space');
  samples.push(await page.evaluate(() => window.__AETHER_DIAGNOSTICS__));
  if (i % 4 === 0) await page.screenshot({ path: `artifacts/motion/frame-${i}.png` });
}
await page.mouse.up();
const elapsed = (performance.now() - start) / 1000;
const after = samples.at(-1);
const frames = after.frame - samples[0].frame;
const steady = samples.slice(3);
const averageFrameMs = steady.reduce((sum, sample) => sum + sample.frameMs, 0) / steady.length;
const averageRenderMs = steady.reduce((sum, sample) => sum + sample.renderMs, 0) / steady.length;
assert.deepEqual(errors, []);
assert.ok(frames > 220, 'active game stalled');
assert.ok(after.totalBlown > 0, 'performance scenario never blew glass');
assert.ok(after.shatters > 83, 'performance scenario never shattered');
assert.ok(samples.some(s => s.player.x !== samples[0].player.x), 'player never moved');
const report = {
  measuredAt: new Date().toISOString(),
  scenario: 'live wave-eight gameplay with real movement, blowing, dashing, shattering, boss attacks and bloom',
  viewport: [1280, 800],
  renderer: 'Canvas2D, static arena cache + painter pass + two additive bloom passes',
  browser: await browser.version(),
  softwareWebGL: 'not applicable; no WebGL context',
  elapsed,
  frames,
  averageFrameMs,
  averageFPS: 1000 / averageFrameMs,
  averageRenderMs,
  maximumParticles: Math.max(...samples.map(s => s.particles)),
  bloomTargetBytes: 320 * 200 * 4,
  renderTargetCount: 2,
  simulationHz: 60,
  errors,
  samples,
};
await writeFile('artifacts/performance.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ fps: report.averageFPS, renderMs: averageRenderMs, frames, errors: errors.length, finalState: after.state, health: after.health, particles: report.maximumParticles }, null, 2));
await browser.close();
