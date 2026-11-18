import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import assert from 'node:assert/strict';
import { buildDossier, readGameTree } from '../vendor/makefun-game.ts';
import sharp from 'sharp';

const output = resolve('out');
const hash = value => createHash('sha256').update(value).digest('hex');
function build() {
  const child = spawnSync(process.execPath, ['main.ts'], {
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: output },
    encoding: 'utf8',
  });
  if (child.status !== 0) throw new Error(child.stderr || child.stdout);
}
async function tree(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await tree(path));
    else files.push([relative(output, path).replaceAll('\\', '/'), hash(await readFile(path))]);
  }
  return files.sort((a, b) => a[0].localeCompare(b[0]));
}

build();
const first = await tree(output);
build();
const second = await tree(output);
assert.deepEqual(first, second, 'two grader invocations differ');
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};
const expected = buildDossier(output, caps);
const actual = await readFile(resolve(output, 'dossier.json'));
assert.equal(hash(expected), hash(actual), 'dossier does not match official builder');
assert.ok(actual.length < 950000, 'dossier exceeds requested 950 KB');
const game = readGameTree(output, caps);
assert.ok(game);
const names = (await readdir('screenshots')).sort();
assert.deepEqual(names, ['01-combat.png', '02-title.png', '03-upgrade.png', '04-gameover.png']);
const screenshots = [];
for (const name of names) {
  const file = resolve('screenshots', name);
  const meta = await sharp(file).metadata();
  const size = (await stat(file)).size;
  assert.equal(meta.format, 'png');
  assert.equal(meta.width, 1280);
  assert.equal(meta.height, 800);
  assert.ok(size < 262144);
  screenshots.push({ name, bytes: size });
}
console.log(JSON.stringify({ deterministic: true, officialDossierMatches: true, dossierBytes: actual.length, dossierSha256: hash(actual), screenshots }, null, 2));
