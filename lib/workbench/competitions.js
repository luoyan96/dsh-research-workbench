/** Reads ML Contests' public data at runtime; no upstream dataset or GPL code is bundled. */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { authorized } from '../papers.js';
import { atomicJson, boundedJson, sendJson } from './service-utils.js';

export const COMPETITIONS_API = '/research-workbench/competitions';
export const COMPETITIONS_SOURCE = 'https://raw.githubusercontent.com/mlcontests/mlcontests.github.io/master/competitions.json';
const HISTORY = 'https://api.github.com/repos/mlcontests/mlcontests.github.io/commits?path=competitions.json&per_page=1';
const SOURCE_PAGE = 'https://github.com/mlcontests/mlcontests.github.io';
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const text = (x, max = 240) => typeof x === 'string' ? x.trim().slice(0, max) : '';
export function competitionDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = MONTHS.indexOf(match[2].toLowerCase()), year = Number(match[3]), day = Number(match[1]);
  if (month < 0 || year < 2000 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day ? date.toISOString().slice(0,10) : null;
}
function link(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function normalizeCompetitions(data) {
  if (!data || !Array.isArray(data.data) || !data.data.length || data.data.length > 10000) throw Error('竞赛数据格式无效');
  const rows = new Map(); let invalidDates = 0, timelineConflicts = 0;
  for (const item of data.data) {
    const name = text(item?.name), url = link(item?.url);
    if (!name || !url) continue;
    const submissionDeadline = competitionDate(item.deadline), registrationDeadline = competitionDate(item['registration-deadline']);
    if (item.deadline && !submissionDeadline) invalidDates++;
    if (item['registration-deadline'] && !registrationDeadline) invalidDates++;
    const timelineConflict = !!(submissionDeadline && registrationDeadline && registrationDeadline > submissionDeadline);
    if (timelineConflict) timelineConflicts++;
    const id = 'ml-' + createHash('sha256').update(url).digest('hex').slice(0,24);
    const conference = text(item.conference, 80);
    rows.set(id, { id, name, url, submissionDeadline, registrationDeadline, startDate: competitionDate(item.launched),
      platform: text(item.platform, 64) || '未分类', sponsor: text(item.sponsor, 160), prize: text(item.prize, 80),
      conference: /^https?:/i.test(conference) ? '' : conference,
      conferenceYear: Number.isInteger(item['conference-year']) ? item['conference-year'] : null,
      tags: Array.isArray(item.tags) ? [...new Set(item.tags.filter(x => typeof x === 'string').map(x => text(x, 50)))].slice(0,24) : [],
      note: text(item.note, 600), timelineConflict, dateIssue: !!(timelineConflict || (item.deadline && !submissionDeadline) || (item['registration-deadline'] && !registrationDeadline)),
    });
  }
  if (!rows.size) throw Error('竞赛数据没有可读取的记录');
  return { competitions: [...rows.values()], invalidDates, timelineConflicts, source: COMPETITIONS_SOURCE, sourcePage: SOURCE_PAGE,
    attribution: 'ML Contests 社区维护数据（仓库标注 GPL-3.0）。日期仅精确到天，报名资格、费用与最终时刻请核对赛事官网。' };
}
export function createCompetitionService(options = {}) {
  const root = options.root || process.env.DSH_RWB_DATA_DIR || path.join(homedir(), '.dsh', 'research-workbench');
  const cacheFile = path.join(root, 'competitions-cache.json'), now = options.now || Date.now, fetchImpl = options.fetchImpl || fetch;
  const ttl = options.ttlMs ?? 6 * 3600000; let cache, pending;
  const headers = { accept: 'application/json', 'user-agent': 'dsh-research-workbench' };
  async function get(url) { return boundedJson(await fetchImpl(url, { headers, signal: AbortSignal.timeout(12000), redirect: 'error' })); }
  async function load() {
    if (cache) return;
    try {
      const saved = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
      if (saved.schema === 2 && Number.isFinite(saved.fetchedAt) && Array.isArray(saved.competitions) && saved.source === COMPETITIONS_SOURCE) cache = saved;
    } catch { /* No valid local snapshot yet. */ }
  }
  async function list(force = false) {
    await load();
    if (pending) return pending;
    if (!force && cache && now() - cache.fetchedAt < ttl) return { ok: true, ...cache, cache: true, stale: false };
    pending = (async () => {
      try {
        const normalized = normalizeCompetitions(await get(COMPETITIONS_SOURCE));
        let sourceUpdatedAt = null;
        try {
          const commits = await get(HISTORY), stamp = commits[0]?.commit?.committer?.date;
          if (typeof stamp === 'string' && Number.isFinite(Date.parse(stamp))) sourceUpdatedAt = stamp;
        } catch { /* A failed metadata lookup never becomes a made-up source date. */ }
        const value = { schema: 2, ...normalized, sourceUpdatedAt, fetchedAt: now() };
        await atomicJson(cacheFile, value); cache = value;
        return { ok: true, ...value, stale: false, cache: false };
      } catch (error) {
        if (cache) return { ok: true, ...cache, stale: true, cache: true, warning: '在线更新失败，展示上次缓存：' + String(error.message).slice(0,180) };
        return { ok: false, error: '无法获取科研竞赛数据：' + String(error.message).slice(0,180), source: COMPETITIONS_SOURCE };
      }
    })();
    try { return await pending; } finally { pending = null; }
  }
  async function handle(req, res) {
    if (!authorized(req, false, options.connection)) return sendJson(res, 403, { ok: false, error: '请从本机已登录的 DSH 页面访问' });
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: '仅支持 GET' });
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== COMPETITIONS_API) return sendJson(res, 404, { ok: false, error: '路径不存在' });
    const value = await list(url.searchParams.get('refresh') === '1'); sendJson(res, value.ok ? 200 : 503, value);
  }
  return { list, handle };
}
