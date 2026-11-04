import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildNativeOffice } from './build-native-office.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (manifest.name !== 'dsh-research-workbench') throw new Error('Unexpected package name');
const src = await readFile(resolve(root, 'src/client.js'), 'utf8');
if (!src.includes('window.__ModuleLoader__.load({')) throw new Error('Missing DSH browser module registration');
await mkdir(resolve(root, 'lib/workbench'), { recursive: true });
const files=['index.js','client.js','papers.js','workbench/content.js','workbench/office.js','workbench/office-import.js','workbench/tools.js','workbench/deadlines.js','workbench/updates.js','workbench/update-archive.js','workbench/native-office-activity.js'];
await Promise.all(files.map(file=>copyFile(resolve(root, 'src',file),resolve(root,'lib',file))));
const nativeOffice = await buildNativeOffice();
await writeFile(resolve(root, 'lib/client.js'), src.replace('/* NATIVE_OFFICE_CLIENT */', nativeOffice));
console.log('Prepared research panels and integrated native WPS/Office tools, settings and helper.');
