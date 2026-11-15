import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export class ServiceError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function reject(status, code, message) { throw new ServiceError(status, code, message); }
export async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + '.' + randomUUID() + '.tmp';
  try { await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}
export function sendJson(res, status, value) {
  const bytes = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': bytes.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(bytes);
}
export async function jsonBody(req, limit = 24000) {
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > limit) reject(413, 'TOO_LARGE', '请求内容过大'); parts.push(part); }
  try { const value = JSON.parse(Buffer.concat(parts).toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { reject(400, 'BAD_JSON', '请求内容无效'); }
}
export async function boundedJson(response, limit = 3 * 1024 * 1024) {
  if (!response.ok) throw Error('数据源返回 HTTP ' + response.status);
  if (Number(response.headers?.get('content-length')) > limit) throw Error('数据源体积超限');
  const parts = []; let size = 0;
  for await (const part of response.body) { size += part.length; if (size > limit) throw Error('数据源体积超限'); parts.push(Buffer.from(part)); }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
