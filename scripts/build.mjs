import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildNativeOffice, bundledLicenses } from './build-native-office.mjs';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (manifest.name !== 'dsh-research-workbench') throw new Error('Unexpected package name');
const src = await readFile(resolve(root, 'src/client.js'), 'utf8');
if (!src.includes('window.__ModuleLoader__.load({')) throw new Error('Missing DSH browser module registration');
await mkdir(resolve(root, 'lib/workbench'), { recursive: true });
const files=['index.js','client.js','papers.js','workbench/content.js','workbench/office.js','workbench/office-import.js','workbench/tools.js','workbench/deadlines.js','workbench/updates.js','workbench/update-archive.js','workbench/native-office-activity.js','workbench/files.js','workbench/service-utils.js','workbench/competitions.js','workbench/servers.js','workbench/server-tools.js','workbench/ssh-credentials.js'];
await Promise.all(files.map(file=>copyFile(resolve(root, 'src',file),resolve(root,'lib',file))));
const nativeOffice = await buildNativeOffice();
const fileClient = await build({ absWorkingDir: root, entryPoints: ['src/file-client.jsx'], bundle: true, format: 'cjs', platform: 'browser', target: 'es2022', external: ['react'], loader: { '.css': 'text' }, write: false, legalComments: 'eof', logLevel: 'warning', define: { 'process.env.NODE_ENV': '"production"' } });
const fileFactory = `/* FILE_WORKSPACE_BEGIN */\nfileClient = (function(require) { var module = { exports: {} }; var exports = module.exports;\n${fileClient.outputFiles[0].text}\nreturn module.exports; })(require);\n/* FILE_WORKSPACE_END */`;
const extension = await build({ absWorkingDir: root, entryPoints: ['src/research-client.jsx'], bundle: true, format: 'cjs', platform: 'browser', target: 'es2022', external: ['react'], loader: { '.css': 'text' }, write: false, legalComments: 'eof', logLevel: 'warning', define: { 'process.env.NODE_ENV': '"production"' } });
const extensionFactory = `/* RESEARCH_EXTENSION_BEGIN */\nresearchClient = (function(require) { var module = { exports: {} }; var exports = module.exports;\n${extension.outputFiles[0].text}\nreturn module.exports; })(require);\n/* RESEARCH_EXTENSION_END */`;
await writeFile(resolve(root, 'lib/client.js'), src.replace('/* NATIVE_OFFICE_CLIENT */', nativeOffice).replace('/* FILE_WORKSPACE_CLIENT */', fileFactory).replace('/* RESEARCH_EXTENSION_CLIENT */', extensionFactory));
const ssh = await build({ absWorkingDir: root, entryPoints: ['src/ssh-transport.js'], outfile: 'lib/ssh-transport.js', bundle: true, format: 'esm', platform: 'node', target: 'es2022', external: ['cpu-features','*.node'], metafile: true, legalComments: 'eof', logLevel: 'warning', banner: { js: "import { createRequire as createSshRequire } from 'node:module'; import { fileURLToPath as sshFileURL } from 'node:url'; import { dirname as sshDirname } from 'node:path'; const require = createSshRequire(import.meta.url); const __filename = sshFileURL(import.meta.url); const __dirname = sshDirname(__filename);" } });
await writeFile(resolve(root, 'lib/ssh-transport.NOTICES.txt'), await bundledLicenses(ssh.metafile));
// Upstream crypto documentation contains a whitespace-only comment line.
const sshPath = resolve(root, 'lib/ssh-transport.js');
await writeFile(sshPath, (await readFile(sshPath, 'utf8')).replace(/^[ \t]+$/gm, ''));
await writeFile(resolve(root, 'lib/file-client.NOTICES.txt'), '@tabler/icons-react (MIT), Copyright (c) 2020-2026 Paweł Kuna\n' + await readFile(resolve(root, 'node_modules/@tabler/icons-react/LICENSE'), 'utf8'));
console.log('Prepared research panels and integrated native WPS/Office tools, settings and helper.');
