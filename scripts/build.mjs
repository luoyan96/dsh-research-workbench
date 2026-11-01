import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (manifest.name !== 'dsh-research-workbench') throw new Error('Unexpected package name');
const src = await readFile(resolve(root, 'src/client.js'), 'utf8');
if (!src.includes('window.__ModuleLoader__.load({')) throw new Error('Missing DSH browser module registration');
await mkdir(resolve(root, 'lib'), { recursive: true });
await Promise.all([
  copyFile(resolve(root, 'src/index.js'), resolve(root, 'lib/index.js')),
  copyFile(resolve(root, 'src/client.js'), resolve(root, 'lib/client.js')),
]);
console.log('Prepared DSH host + browser plugin artifacts (no external build dependencies).');
