// Shared across component reloads: saving/closing hidden documents can continue
// after the agent becomes idle, and must finish before replacing the plugin.
const key = Symbol.for('research-workbench.native-office.activity.v1');
const activity = () => globalThis[key] ??= { pending: 0 };
export const nativeOfficeBusy = () => activity().pending > 0 || (activity().transactions || 0) > 0;
export async function trackOfficeCall(invoke) {
  const state = activity(); state.pending++;
  try { return await invoke(); }
  finally { state.pending--; }
}

// An open/render/read sequence must finish before silent-mode cleanup closes its document.
export async function trackOfficeTransaction(invoke) {
  const state = activity(); state.transactions = (state.transactions || 0) + 1;
  try { return await invoke(); }
  finally {
    state.transactions--;
    if (!state.transactions) {
      const waiters = [...(state.waiters || [])]; state.waiters?.clear();
      for (const waiter of waiters) waiter();
    }
  }
}
export function afterOfficeTransactions(invoke) {
  const state = activity();
  if (state.transactions) (state.waiters ??= new Set()).add(invoke);
  else invoke();
}
