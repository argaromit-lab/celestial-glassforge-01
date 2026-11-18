import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
await mkdir(destination, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  await cp(resolve(import.meta.dirname, directory), resolve(destination, directory), { recursive: true });
}
const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
await writeFile(resolve(destination, 'dossier.json'), dossier);
console.log(`Dossier written to ${destination}`);
