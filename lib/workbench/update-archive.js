import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const LIMIT = 16 * 1024 * 1024;
const NAME = 'dsh-research-workbench';
const octal = (value, width) => value.toString(8).padStart(width - 1, '0') + '\0';

// An exact copy of this plugin's package, not its separate research data. The
// native manager can reinstall this archive if updating the plugin fails.
export async function backupPlugin(profileDirectory, expectedVersion, destination) {
  const root = await fs.realpath(path.join(profileDirectory, 'node_modules', NAME));
  const files = [];
  let bytes = 0;
  async function collect(relative) {
    const location = path.join(root, relative);
    const stat = await fs.lstat(location).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (!stat) return;
    if (stat.isSymbolicLink()) throw Error('插件包内存在符号链接，请通过原生插件管理更新。');
    if (stat.isDirectory()) {
      for (const name of await fs.readdir(location)) await collect(path.join(relative, name));
    } else if (stat.isFile()) {
      bytes += stat.size;
      if (bytes > LIMIT || files.length >= 256) throw Error('插件备份超出大小限制，尚未开始更新。');
      files.push({ name: 'package/' + relative.split(path.sep).join('/'), data: await fs.readFile(location) });
    }
  }
  const entries = await fs.readdir(root);
  if (entries.includes('.git')) throw Error('本地开发检出不能自动打包恢复，请通过原生插件管理更新。');
  for (const relative of entries) if (relative !== 'node_modules') await collect(relative);
  const manifestFile = files.find(file => file.name === 'package/package.json');
  const manifest = manifestFile && JSON.parse(manifestFile.data.toString('utf8'));
  if (manifest?.name !== NAME || manifest.version !== expectedVersion || !manifest.dsh?.bundle) throw Error('实际安装版本已变化，请重新检查后再更新。');
  const chunks = [];
  for (const file of files) {
    if (Buffer.byteLength(file.name) > 100) throw Error('插件备份文件名超限，尚未开始更新。');
    const header = Buffer.alloc(512);
    header.write(file.name, 0, 100); header.write(octal(0o644, 8), 100); header.write(octal(0, 8), 108); header.write(octal(0, 8), 116);
    header.write(octal(file.data.length, 12), 124); header.write(octal(0, 12), 136); header.fill(32, 148, 156);
    header[156] = 48; header.write('ustar\0', 257); header.write('00', 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
    chunks.push(header, file.data, Buffer.alloc((512 - file.data.length % 512) % 512));
  }
  chunks.push(Buffer.alloc(1024));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, gzipSync(Buffer.concat(chunks)), { flag: 'wx' });
  return destination;
}

export function verifyPluginArchive(bytes, version) {
  const tar = gunzipSync(bytes, { maxOutputLength: LIMIT });
  let manifest;
  const names = new Set();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const checksumText = header.subarray(148, 156).toString('ascii').replace(/\0/g, '').trim();
    const checksum = header.reduce((sum, byte, i) => sum + (i >= 148 && i < 156 ? 32 : byte), 0);
    if (!/^[0-7]+$/.test(checksumText) || parseInt(checksumText, 8) !== checksum || header.subarray(345, 500).some(byte => byte !== 0)) throw Error('发行包 tar 校验失败，未安装。');
    const name = header.subarray(0, 100).toString('utf8').split('\0')[0];
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim();
    const size = /^[0-7]+$/.test(sizeText) ? parseInt(sizeText, 8) : NaN;
    if (!name.startsWith('package/') || name.includes('\\') || name.split('/').some(part => part === '..' || part === '.') || names.has(name) || ![0, 48, 53].includes(header[156]) || !Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw Error('发行包格式无效，未安装。');
    names.add(name);
    if (name === 'package/package.json') manifest = JSON.parse(tar.subarray(offset + 512, offset + 512 + size).toString('utf8'));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (manifest?.name !== NAME || manifest.version !== version || !manifest.dsh?.bundle) throw Error('发行包名称、版本或 DSH bundle 不匹配，未安装。');
  if (manifest.main !== './lib/index.js' || manifest.dsh.bundle.patch !== './cordis.patch.yml' || !names.has('package/lib/index.js') || !names.has('package/lib/client.js') || !names.has('package/cordis.patch.yml')) throw Error('发行包入口不完整，未安装。');
  return manifest;
}
