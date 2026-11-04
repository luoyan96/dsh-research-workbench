// Shared across component reloads: saving/closing hidden documents can continue
// after the agent becomes idle, and must finish before replacing the plugin.
const key = Symbol.for('research-workbench.native-office.activity.v1');
const activity = () => globalThis[key] ??= { pending: 0 };
export const nativeOfficeBusy = () => activity().pending > 0;
export async function trackOfficeCall(invoke) {
  const state = activity(); state.pending++;
  try { return await invoke(); }
  finally { state.pending--; }
}
