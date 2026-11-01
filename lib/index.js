/** DSH Research Workbench host: paper projects + local Tectonic compilation. */
import { createPaperService } from './papers.js';

export const inject = ['webServer'];

export function apply(ctx) {
  const papers = createPaperService();
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/research-workbench/api',
    handler: (req, res) => papers.handle(req, res),
  }), 'research-workbench: paper API');
}
