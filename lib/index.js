/** DSH Research Workbench: proposals, editable slides, LaTeX, patent/software dossiers. */
import { createPaperService } from './papers.js';
import { createContentService } from './workbench/content.js';
import { registerResearchTools } from './workbench/tools.js';

export const inject = ['webServer', 'connection'];

export function apply(ctx) {
  const papers = createPaperService({ connection: ctx.connection });
  const contents = createContentService({ connection: ctx.connection });
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix', path: '/research-workbench/api',
    handler: (req, res) => papers.handle(req, res),
  }), 'research-workbench: paper API');
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix', path: '/research-workbench/content',
    handler: (req, res) => contents.handle(req, res),
  }), 'research-workbench: artifact API');
  // Optional: the Web UI remains usable if this DSH profile does not load
  // model tools. The callback runs only when the normal tool registry exists.
  ctx.inject?.(['tools'], scope => {
    scope.effect(() => registerResearchTools(scope, contents, papers), 'research-workbench: agent tools');
  });
}
