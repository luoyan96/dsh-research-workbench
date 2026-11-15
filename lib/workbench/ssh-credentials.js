/** Local-only secret protection. Plaintext never enters server views, agent tools or command argv. */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import path from 'node:path';

const DPAPI = "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $r=([Console]::In.ReadLine()|ConvertFrom-Json); $b=[Convert]::FromBase64String($r.data); if($r.decrypt){$o=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)}else{$o=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)}; [Console]::Out.Write([Convert]::ToBase64String($o))";
function dpapi(bytes, decrypt) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-Command',DPAPI], { windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    const parts = []; let length = 0;
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdout.on('data', bytes => { length += bytes.length; if (length > 60000) child.kill(); else parts.push(bytes); });
    child.stderr.resume(); child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); reject(Error('无法访问 Windows 本机凭据保护')); });
    child.on('close', code => { clearTimeout(timer); if (code !== 0 || length > 60000) reject(Error('Windows 凭据保护失败，请使用当前 Windows 用户重新保存凭据')); else resolve(Buffer.from(Buffer.concat(parts).toString('utf8').trim(), 'base64')); });
    child.stdin.end(JSON.stringify({ data: bytes.toString('base64'), decrypt }) + '\n');
  });
}
export function createCredentialProtector(root, options = {}) {
  const platform = options.platform || process.platform;
  let loading;
  async function key() {
    if (!loading) loading = (async () => {
      await fs.mkdir(root, { recursive: true, mode: 0o700 });
      const file = path.join(root, '.ssh-vault-key');
      try { await fs.writeFile(file, randomBytes(32), { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      const bytes = await fs.readFile(file); if (bytes.length !== 32) throw Error('本机 SSH 凭据密钥无效'); return bytes;
    })();
    return loading;
  }
  return {
    async protect(value) {
      const bytes = Buffer.from(JSON.stringify(value));
      if (platform === 'win32') return 'dpapi:' + (await dpapi(bytes, false)).toString('base64');
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', await key(), iv);
      const body = Buffer.concat([cipher.update(bytes), cipher.final()]);
      return 'aes:' + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
    },
    async unprotect(value) {
      if (!value) return {};
      if (value.startsWith('dpapi:')) {
        if (platform !== 'win32') throw Error('此 SSH 凭据只能由原 Windows 用户解密，请重新填写');
        return JSON.parse((await dpapi(Buffer.from(value.slice(6), 'base64'), true)).toString('utf8'));
      }
      if (!value.startsWith('aes:')) throw Error('SSH 凭据格式无效，请重新保存');
      const bytes = Buffer.from(value.slice(4), 'base64');
      const decipher = createDecipheriv('aes-256-gcm', await key(), bytes.subarray(0,12)); decipher.setAuthTag(bytes.subarray(12,28));
      return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    },
  };
}
