import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (manifest.name !== 'dsh-research-workbench') throw new Error('Unexpected package name');
const src = await readFile(resolve(root, 'src/client.js'), 'utf8');
if (!src.includes('window.__ModuleLoader__.load({')) throw new Error('Missing DSH browser module registration');
await mkdir(resolve(root, 'lib/workbench'), { recursive: true });
const files=['index.js','client.js','papers.js','workbench/content.js','workbench/office.js','workbench/office-import.js','workbench/tools.js','workbench/deadlines.js'];
await Promise.all(files.map(file=>copyFile(resolve(root, 'src',file),resolve(root,'lib',file))));
console.log('Prepared DSH host, native browser panels, paper service, artifact studio & Office exporters (zero external runtime dependencies).');
