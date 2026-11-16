import { AsyncLocalStorage } from 'node:async_hooks';

// A full document identity: two uploads may have the same basename.
export const officeDocumentKey = value => String(value || '').replaceAll('\\', '/').toLowerCase();

/** Keep workbench conversations quiet without changing the user's global Office preferences. */
export function createWorkspaceTools(createTools, host, getWorkspace) {
  const mode = new AsyncLocalStorage();
  const helper = { ...host.helper, async call(...args) {
    const context = mode.getStore(); context?.signal?.throwIfAborted?.();
    const result = await host.helper.call(...args);
    context?.signal?.throwIfAborted?.();
    return result;
  } };
  const tools = createTools({ ...host, helper, settings: () => mode.getStore()
    ? { ...host.settings(), silent: true, showOnOpen: false, follow: false, typing: false, card: false }
    : host.settings() });
  return tools.map(tool => ({ ...tool, async execute(args, exec) {
    exec?.signal?.throwIfAborted?.();
    const session = exec?.agent?.session?.id;
    const file = session ? await getWorkspace()?.current(session) : null;
    const operation = tool.name.replace(/^research_office_/, '');
    if (!file || !['open','read','edit','render','save','close'].includes(operation)) return tool.execute(args,exec);
    const target = operation === 'open' ? args.path : args.doc;
    if (target && officeDocumentKey(target) !== officeDocumentKey(file.path)) return tool.execute(args,exec);
    const input = operation === 'open' ? { ...args, path:file.path, app:file.app, show:false } : { ...args, doc:file.path, app:file.app };
    return mode.run({ signal:exec?.signal }, () => tool.execute(input,exec));
  } }));
}
