import { mkdir, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { launchBrowser, origin } from './browser.mjs';
import pngquant from 'pngquant-bin';

await mkdir('artifacts/raw', { recursive: true });
await mkdir('screenshots', { recursive: true });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const manifest = [];
for (const [state, filename] of [['combat', '01-combat.png'], ['title', '02-title.png'], ['upgrade', '03-upgrade.png'], ['victory', '04-gameover.png']]) {
  await page.goto(`${origin}/?qa&shot=${state}`);
  await page.waitForFunction(() => window.__shotReady === true);
  await page.waitForTimeout(220);
  const rawPath = `artifacts/raw/${filename}`;
  await page.screenshot({ path: rawPath, animations: 'disabled', type: 'png' });
  // PNG palette encoding only; no crops, paint, compositing, or content edits.
  let chosen;
  const budget = state === 'combat' ? 218000 : 135000;
  for (const colors of [160, 128, 96, 80, 64, 56, 48, 44, 40, 32, 24, 16]) {
    const buffer = execFileSync(pngquant, ['--speed', '1', '--nofs', '--strip', '--output', '-', String(colors), '--', rawPath], { maxBuffer: 5000000 });
    chosen = { bytes: buffer.length, colors, buffer };
    if (buffer.length <= budget) break;
  }
  if (chosen.bytes >= 262144) throw new Error(`${filename} exceeds per-image limit`);
  await writeFile(`screenshots/${filename}`, chosen.buffer);
  const diagnostics = await page.evaluate(() => window.__AETHER_DIAGNOSTICS__);
  manifest.push({ filename, state, width: 1280, height: 800, bytes: chosen.bytes, palette: chosen.colors, rawBytes: (await stat(rawPath)).size, diagnostics });
  console.log(`${filename}: ${chosen.bytes} bytes, ${chosen.colors} color PNG, state=${diagnostics.state}`);
}
await browser.close();
await writeFile('artifacts/screenshots.json', JSON.stringify({ capturedAt: new Date().toISOString(), viewport: [1280, 800], errors, screenshots: manifest }, null, 2));
if (errors.length) throw new Error(errors.join('\n'));
