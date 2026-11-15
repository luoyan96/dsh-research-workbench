import ssh2 from 'ssh2';
import { generateKeyPairSync } from 'node:crypto';

const hostKey = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type:'pkcs1',format:'pem' }, publicKeyEncoding: { type:'spki',format:'pem' } }).privateKey;
export async function sshFixture(options = {}) {
  const clients = new Set(), commands = [], authAttempts = [];
  const server = new ssh2.Server({ hostKeys: [options.hostKey || hostKey] }, client => {
    clients.add(client); client.on('error',()=>{}); client.once('close',()=>clients.delete(client));
    client.on('authentication', ctx => {
      authAttempts.push(ctx.method);
      if (ctx.username !== 'research-test') return ctx.reject();
      if (ctx.method === 'password' && ctx.password === 'synthetic-password-only') return ctx.accept();
      if (ctx.method === 'publickey' && options.authorizedKey && ctx.key.data.equals(options.authorizedKey.getPublicSSH()) && (!ctx.signature || options.authorizedKey.verify(ctx.blob,ctx.signature,ctx.hashAlgo) === true)) return ctx.accept();
      ctx.reject();
    });
    client.on('ready',()=>client.on('session',accept=>{ const session=accept();session.on('exec',(accept,reject,info)=>{
      commands.push(info.command); const stream=accept(); stream.on('error',()=>{});
      if (info.command.startsWith('nvidia-smi')) { stream.write('Synthetic GPU, 12, 1024, 24576\n'); stream.exit(0); stream.end(); }
      else if (info.command.includes('hold-fixture')) { stream.write('fixture job is running\n'); }
      else if (info.command.includes('disconnect-fixture')) client.destroy();
      else if (info.command.includes('flood-fixture')) { stream.write(Buffer.alloc(8192,65)); }
      else { stream.write('synthetic remote stdout\n'); stream.stderr.write('synthetic remote stderr\n'); stream.exit(info.command.includes('fail-fixture')?7:0); stream.end(); }
    }); }));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return { port:server.address().port, commands, authAttempts, async close(){for(const client of clients)client.destroy();await new Promise(resolve=>server.close(resolve));} };
}
