import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (name) => readFile(new URL(name, root), 'utf8');

function makeReact() {
  return {
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: initial => ({ current: initial }),
    useEffect: () => {},
    useCallback: cb => cb,
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    createElement: (type, props, ...children) => ({
      type,
      props: {
        ...(props ?? {}),
        children: children.length === 1 ? children[0] : children,
      },
    }),
  };
}

function loadBrowserModule(source) {
  let registered;
  const window = {
    __ModuleLoader__: {
      load(entry) { registered = entry; },
    },
  };
  vm.runInNewContext(source, { window }, { timeout: 2500, filename: 'lib/client.js' });
  assert.ok(registered, 'client bundle must register with the DSH module loader');
  const module = registered.factory((id) => {
    assert.equal(id, 'react', 'the browser plugin must reuse host React');
    return makeReact();
  });
  return { id: registered.id, module };
}

function fakeHost() {
  const registrations = [];
  const effects = [];
  const elementStyles = [];
  const selected = [];
  const document = {
    head: {
      appendChild(node) { elementStyles.push(node); },
    },
    createElement(tag) {
      assert.equal(tag, 'style');
      return {
        type: tag,
        textContent: '',
        setAttribute(key, value) { this[key] = value; },
        remove() { elementStyles.splice(elementStyles.indexOf(this), 1); },
      };
    },
  };
  const ctx = {
    layout: { selectPanel(value) { selected.push(value); } },
    effect(factory) {
      const disposer = factory();
      effects.push(disposer);
      return disposer;
    },
    slots: {
      inject(name, callback) {
        const result = callback();
        if (result && typeof result.next === 'function') {
          for (const entry of result) assert.equal(typeof entry, 'function');
        }
      },
      register(options, Component) {
        const record = { options, Component };
        registrations.push(record);
        return () => {
          const n = registrations.indexOf(record);
          if (n >= 0) registrations.splice(n, 1);
        };
      },
    },
  };
  return { ctx, document, registrations, effects, elementStyles, selected };
}

function flatten(node) {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (typeof node !== 'object') return [node];
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  return [node, ...flatten(node.props?.children)];
}

function textOf(node) {
  return flatten(node).filter(x => typeof x === 'string' || typeof x === 'number').join('');
}

test('manifest declares a DSH self-activating client bundle', async () => {
  const manifest = JSON.parse(await read('package.json'));
  assert.equal(manifest.name, 'dsh-research-workbench');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-layout'));
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-sidebar'));
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-renderer'));
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.exports['./client'], './lib/client.js');
  assert.match(await read('cordis.patch.yml'), /name: 'dsh-research-workbench'/);
});

test('checked-in client artifacts are exactly regenerated from their source', async () => {
  const client = (await read('lib/client.js')).replace(/\/\* NATIVE_OFFICE_BEGIN \*\/[\s\S]*?\/\* NATIVE_OFFICE_END \*\//, '/* NATIVE_OFFICE_CLIENT */');
  assert.equal(client, await read('src/client.js'));
  assert.equal(await read('lib/index.js'), await read('src/index.js'));
  assert.equal(await read('lib/papers.js'), await read('src/papers.js'));
  for (const name of ['content','office','office-import','tools','deadlines','updates','update-archive','native-office-activity']) assert.equal(await read(`lib/workbench/${name}.js`), await read(`src/workbench/${name}.js`));
});

test('browser module registers five native DSH main pages and sidebar rows in order', async () => {
  const { id, module } = loadBrowserModule(await read('lib/client.js'));
  assert.equal(id, 'dsh-research-workbench');
  assert.deepEqual(Array.from(module.inject), ['slots', 'layout', 'remote', 'remote.settings']);
  assert.equal(typeof module.apply, 'function');

  const host = fakeHost();
  // source accesses document from its vm world; use the host's fake document.
  // Re-run in a global with both fields, keeping its same module-loader contract.
  let entry;
  vm.runInNewContext(await read('lib/client.js'), {
    window: { __ModuleLoader__: { load(value) { entry = value; } }, addEventListener() {}, removeEventListener() {} },
    document: host.document,
    setInterval: () => 1, clearInterval() {},
  }, { timeout: 2500 });
  const plugin = entry.factory((name) => {
    assert.equal(name, 'react');
    return makeReact();
  });
  plugin.apply(host.ctx);
  const main = host.registrations.filter(x => x.options.name === 'main');
  const sidebar = host.registrations.filter(x => x.options.name === 'sidebar.panellist');
  assert.equal(main.length, 5);
  assert.equal(sidebar.length, 5);
  assert.deepEqual(main.map(x => x.options.key), [
    'research-proposals', 'research-slides', 'research-papers', 'research-ip', 'research-ccf',
  ]);
  assert.deepEqual(sidebar.map(x => [x.options.id, x.options.label, x.options.order]), [
    ['research-proposals', '项目书', 20],
    ['research-slides', 'PPT 工作台', 30],
    ['research-papers', '论文管理', 40],
    ['research-ip', '专利与软著', 50],
    ['research-ccf', 'CCF 截稿', 60],
  ]);
  assert.equal(host.elementStyles.length, 1);
  const updates = host.registrations.find(x => x.options.name === 'plugins.detail.section');
  assert.ok(updates, 'updates belong to the native plugin detail page');
  assert.ok(host.registrations.some(x => x.options.name === 'settings.section' && x.options.id === 'research-native-office'));
  assert.equal(updates.Component({ subject: { kind: 'bundle', pkg: { name: 'other-plugin' } } }), null);
  assert.match(textOf(updates.Component({ subject: { kind: 'bundle', pkg: { name: 'dsh-research-workbench' } } })), /版本与更新/);
  assert.match(host.elementStyles[0].textContent, /\.drw-artifact-workspace/);
  for (const record of sidebar) {
    const icon = record.Component({ size: 20, active: false });
    assert.equal(typeof icon.type, 'function');
  }

  const proposal = main[0];
  const proposalPage = proposal.Component(proposal.options.inject());
  assert.match(textOf(proposalPage), /项目书/);
  assert.match(textOf(proposalPage), /新建一份结构完整/);
  const returnChat = flatten(proposalPage).filter(x => x?.type === 'button').find(x => textOf(x).includes('返回聊天'));
  assert.ok(returnChat);
  await returnChat.props.onClick();
  assert.equal(host.selected.at(-1), null);

  const paper = main[2];
  const paperPage = paper.Component(paper.options.inject());
  assert.match(textOf(paperPage), /论文管理/);
  assert.match(textOf(paperPage), /正在加载本地论文项目/);
  const buttons = flatten(paperPage).filter(x => x?.type === 'button');
  const paperReturn = buttons.find(x => textOf(x).includes('返回聊天'));
  assert.ok(paperReturn);
  await paperReturn.props.onClick();
  assert.equal(host.selected.at(-1), null);
  const slidePage = main[1].Component(main[1].options.inject());
  assert.match(textOf(slidePage), /PPT 工作台/);
  const ipPage = main[3].Component(main[3].options.inject());
  assert.match(textOf(ipPage), /专利与软著/);

  // The component cannot silently replace the existing DSH brand or chat panel.
  assert.ok(!main.some(x => x.options.key === 'conversation'));
  assert.ok(!host.registrations.some(x => x.options.name.startsWith('sidebar.brand.')));
  for (const dispose of host.effects) dispose();
  assert.equal(host.elementStyles.length, 0, 'unloading must remove plugin CSS');
});

test('the plugin does not scrape or mutate the existing DSH DOM structure', async () => {
  const source = await read('src/client.js');
  assert.doesNotMatch(source, /MutationObserver|querySelector|innerHTML|appendChild\(.*sidebar|data-dsh-catnap/);
  assert.doesNotMatch(source, /sidebar\.brand\.|conversation\.hero\.brand/);
});
