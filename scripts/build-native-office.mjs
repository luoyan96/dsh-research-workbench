import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const upstream = path.join(root, 'vendor', 'copylee-office');
export const OFFICE_ENTRY = 'research-native-office';
export const OFFICE_STATUS = '/api/research-workbench/office/status';

export async function verifyOfficeSource() {
  const receipt = JSON.parse(await readFile(path.join(upstream, 'UPSTREAM.json'), 'utf8'));
  if (receipt.commit !== '2069af2d6b2b2a9819321a73ea3427716b686608' || receipt.version !== '1.2.0') throw Error('Unexpected Office upstream snapshot');
  for (const [name, digest] of Object.entries(receipt.files)) {
    const actual = createHash('sha256').update(await readFile(path.join(upstream, name))).digest('hex');
    if (actual !== digest) throw Error('Upstream source was modified: ' + name);
  }
  return receipt;
}

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Office adapter no longer matches upstream: ' + before.slice(0, 70));
  return source.replace(before, after);
}

const statusBridge = `  // Research integration: Connection admits authenticated owner peers only.
  ctx.inject(['connection'], (webCtx: Context) => {
    webCtx.effect(() => (webCtx as any).get('connection').fetch.register({
      path: '${OFFICE_STATUS}', methods: ['POST'], requestBody: 'streaming',
      fetch: async () => {
        try { return Response.json({ ok: true, apps: await helper.call<AppStatus[]>('status', {}, 30_000) }, { headers: { 'cache-control': 'no-store' } }) }
        catch (error) { return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { headers: { 'cache-control': 'no-store' } }) }
      },
    }), 'research-office: authenticated status')
  })

`;

// Keep the full upstream source byte-for-byte. These explicit, fail-closed
// adapters are the integration diff, so upstream upgrades remain reviewable.
export function adaptOfficeSource(filename, original) {
  let source = original.replaceAll('\r\n', '\n').replaceAll('office_', 'research_office_').replaceAll("'dsh-office'", "'research-workbench-office'");
  if (filename.endsWith('/src/index.ts')) {
    source = "import { trackOfficeCall, afterOfficeTransactions } from '../../../src/workbench/native-office-activity.js';\n" + source;
    source = replaceOnce(source, "export const name = '@copylee/dsh-office'", "export const name = 'dsh-research-workbench/native-office'");
    source = replaceOnce(source, "name: 'office:guide'", "name: 'research-office:guide'");
    source = replaceOnce(source, '=> client.call<T>(cmd, { suite: settings().suite, ...args }, timeoutMs),', '=> trackOfficeCall(() => client.call<T>(cmd, { suite: settings().suite, ...args }, timeoutMs)),');
    source = replaceOnce(source, 'const working = new WeakSet<object>()', 'const working = new Set<object>()');
    source = replaceOnce(source, '    working.delete(agent)\n', '    working.delete(agent)\n    if (working.size > 0) return // Other Office agents still own background work.\n');
    source = replaceOnce(source, "    void helper.call('card', { text: 'AI 已完成'", "    afterOfficeTransactions(() => {\n      if (working.size > 0) return\n      void helper.call('card', { text: 'AI 已完成'");
    source = replaceOnce(source, "    void helper.call<string[]>('settle', {}, 60_000).then(said => { for (const line of said) ctx.logger.info(`office: ${line}`) }).catch(() => {})\n  }", "      void helper.call<string[]>('settle', {}, 60_000).then(said => { for (const line of said) ctx.logger.info(`office: ${line}`) }).catch(() => {})\n    })\n  }");
    source = replaceOnce(source, '  const tools = createTools({', "  // The research file UI shares this exact helper and settings with model tools.\n  ;(ctx as any).reflect.provide('researchOffice', { call: helper.call, settings }, undefined)\n\n  const tools = createTools({");
    const start = source.indexOf('  // Settings page bridge');
    const end = source.indexOf("  ctx.inject(['systemPrompt']", start);
    if (start < 0 || end < 0) throw Error('Office status adapter no longer matches upstream');
    source = source.slice(0, start) + statusBridge + source.slice(end);
  }
  if (filename.endsWith('/src/settings.ts')) source = replaceOnce(source, "export const ENTRY_ID = 'copylee-office'", `export const ENTRY_ID = '${OFFICE_ENTRY}'`);
  if (filename.endsWith('/src/client/index.ts')) {
    source = replaceOnce(source, "const STATUS_ROUTE = '/api/dsh-office/status'", `const STATUS_ROUTE = '${OFFICE_STATUS}'`);
    source = replaceOnce(source, "fetch(STATUS_ROUTE, { credentials: 'same-origin' })", "fetch(STATUS_ROUTE, { method: 'POST', credentials: 'same-origin' })");
    source = source.replaceAll("'Office'", "'Office / WPS'");
  }
  if (filename.endsWith('/src/client/nav-icon.ts')) source = 'export function registerNavIcon() { return () => {}; }';
  if (filename.endsWith('/src/client/accent.ts')) {
    source = source.replaceAll('--cl-accent', '--research-office-accent').replaceAll('copylee.dsh.accent', 'research-workbench.office.accent').replaceAll('copylee-dsh-accent', 'research-workbench-office-accent');
  }
  if (filename.endsWith('/src/helper-client.ts')) source = source.replaceAll("'dsh-office'", "'research-workbench-office'");
  return source;
}

function removeCsMethod(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) throw Error('Helper adapter no longer matches ' + signature);
  let at = source.indexOf('{', start), depth = 0;
  for (; at < source.length; at++) {
    if (source[at] === '{') depth++;
    if (source[at] === '}' && --depth === 0) return source.slice(0, start) + source.slice(at + 1);
  }
  throw Error('Unbalanced helper method');
}

export function adaptOfficeHelper(source) {
  source = source.replaceAll('\r\n', '\n');
  source = replaceOnce(source, '        Sweep();\n        SweepOwn();', '        // Research integration: never kill processes based on stale PID notes.');
  source = removeCsMethod(source, '    static void SweepOwn()');
  source = removeCsMethod(source, '    static void Sweep()');
  source = replaceOnce(source, '            doc.Save();\n            result["path"] = (string)doc.FullName;', '            bool readOnly = false;\n            try { readOnly = Truthy(doc.ReadOnly); } catch (Exception) { }\n            if (readOnly) throw new Fail("READ_ONLY", "The document is read-only or locked by another Office instance. Close the other instance or save a copy with a new path; do not retry an in-place save.");\n            doc.Save();\n            result["path"] = (string)doc.FullName;');
  return '// Integrated from @copylee/dsh-office 1.2.0 (MIT); see vendor/copylee-office/LICENSE and NOTICE.md.\n' + source.replaceAll('"dsh-office"', '"research-workbench-office"');
}

async function bundledLicenses(metafile) {
  const packages = new Map();
  for (const input of Object.keys(metafile.inputs)) {
    if (!input.includes('node_modules/')) continue;
    let directory = path.dirname(path.resolve(root, input));
    while (directory !== root && directory !== path.dirname(directory)) {
      try {
        const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
        const key = `${pkg.name}@${pkg.version}`;
        if (!packages.has(key)) {
          const files = await readdir(directory);
          const notices = files.filter(name => /^(?:licen[cs]e|copying|notice)(?:$|[.-])/i.test(name));
          const texts = await Promise.all(notices.map(async name => `${name}\n${await readFile(path.join(directory, name), 'utf8')}`));
          if (!texts.length && pkg.name.startsWith('@deepseek-ai/dsh-') && pkg.license === 'MIT') texts.push(await readFile(path.join(root, 'vendor/licenses/deepseek-harness-MIT.txt'), 'utf8'));
          if (!texts.length) throw Error('Missing bundled license text: ' + key);
          packages.set(key, `${key}\nDeclared license: ${pkg.license || 'see upstream'}\n${texts.join('\n\n')}`);
        }
        break;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      directory = path.dirname(directory);
    }
  }
  return [...packages].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).join('\n\n' + '='.repeat(72) + '\n\n');
}

export async function buildNativeOffice() {
  await verifyOfficeSource();
  const adapters = { name: 'research-office-adapters', setup(builder) {
    builder.onLoad({ filter: /[\\/]vendor[\\/]copylee-office[\\/]src[\\/].*\.ts$/ }, async args => ({ contents: adaptOfficeSource(args.path.replaceAll('\\', '/'), await readFile(args.path, 'utf8')), loader: 'ts', resolveDir: path.dirname(args.path) }));
  } };
  const common = { absWorkingDir: root, bundle: true, plugins: [adapters], legalComments: 'eof', logLevel: 'warning' };
  const host = await build({ ...common, entryPoints: [path.join(root, 'src/native-office.ts')], outfile: 'lib/native-office.js', format: 'esm', platform: 'node', target: 'es2022', metafile: true, banner: { js: '// @copylee/dsh-office 1.2.0, Copyright (c) 2026 Copy, MIT. Integrated by Research Workbench; see NOTICE.md.' } });
  const client = await build({ ...common, entryPoints: [path.join(upstream, 'src/client/index.ts')], write: false, format: 'cjs', platform: 'browser', target: 'es2022', external: ['react'], define: { 'process.env.NODE_ENV': '"production"' } });
  const code = client.outputFiles[0].text;
  const clientFactory = `/* NATIVE_OFFICE_BEGIN */\nnativeOfficeClient = (function(require) { var module = { exports: {} }; var exports = module.exports;\n${code}\nreturn module.exports; })(require);\n/* NATIVE_OFFICE_END */`;
  await mkdir(path.join(root, 'helper'), { recursive: true });
  await writeFile(path.join(root, 'helper/OfficeHelper.cs'), adaptOfficeHelper(await readFile(path.join(upstream, 'helper/OfficeHelper.cs'), 'utf8')));
  await writeFile(path.join(root, 'lib/native-office.NOTICES.txt'), await bundledLicenses(host.metafile));
  return clientFactory;
}
