/** Integrated @copylee/dsh-office 1.2.0 (MIT). See NOTICE.md for provenance/adapters. */
import { apply as applyOffice } from '../vendor/copylee-office/src/index.js';
export { name, inject, Config } from '../vendor/copylee-office/src/index.js';
export { DEFAULTS, ENTRY_ID, resolveConfig } from '../vendor/copylee-office/src/settings.js';
export { createTools } from '../vendor/copylee-office/src/tools.js';
export { HelperClient, ensureHelperExe, helperSourcePath } from '../vendor/copylee-office/src/helper-client.js';
export { promptText, redirectText } from '../vendor/copylee-office/src/prompt.js';

export function apply(ctx: any, config = {}) {
  applyOffice(ctx, config);
  if (process.platform !== 'win32') return;
  ctx.inject(['systemPrompt'], (scope: any) => {
    scope.effect(() => scope.systemPrompt.section({
      name: 'research-office:research-routing', order: 74,
      text: [
        '# Research Workbench and native Office',
        'For local .docx/.xlsx/.pptx files or work explicitly requested in WPS/Office, use the research_office_* tools. Name the target document explicitly when several are open.',
        'When the user explicitly asks to modify a saved Research Workbench proposal, slides or IP draft by its project/ID, use research_artifact_* with its revision checks. LaTeX sources use research_paper_write. These are separate from a native Office file.',
        'Editing an exported Office file does not automatically update a structured Research Workbench draft. Do not claim the two have synchronized; tell the user which file or draft was changed. Preserve original templates and use a copy when asked.',
      ].join('\n'),
    }), 'research-office: research routing');
  });
}
