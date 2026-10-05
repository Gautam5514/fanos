// The pure logic in src/shared/ (reducer, AI engine, seed config) is also used by the
// frontend for optimistic updates and demo mode. The frontend copy is the source of truth:
// run `npm run sync-shared` after editing frontend/app/lib/{reducer,ai,seed}.js.
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';

const FILES = ['reducer.js', 'ai.js', 'seed.js'];
const from = new URL('../../frontend/app/lib/', import.meta.url);
const to = new URL('../src/shared/', import.meta.url);

for (const f of FILES) {
  copyFileSync(new URL(f, from), new URL(f, to));
  console.log(`synced ${fileURLToPath(new URL(f, to))}`);
}
