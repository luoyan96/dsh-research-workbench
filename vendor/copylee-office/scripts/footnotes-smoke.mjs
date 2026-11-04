// Native footnote acceptance. Only creates/opens documents in its own temp folder.
// node scripts/footnotes-smoke.mjs [--wps]
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { formulasOf } from '../lib/types/omml.js'
import assert from 'node:assert/strict'

const suite = process.argv.includes('--wps') ? 'wps' : 'microsoft'
const dir = mkdtempSync(join(tmpdir(), `dsh-footnotes-${suite}-`))
let doc = join(dir, 'acceptance.docx')
const exe = join(dir, 'helper.exe')
const refs = ['System', 'System.Core', 'Microsoft.CSharp', 'System.Drawing', 'System.Windows.Forms', 'System.Web.Extensions']
execFileSync('C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe', ['-nologo', '-debug:pdbonly', '-target:exe', `-out:${exe}`, ...refs.map(r => `-r:${r}.dll`), resolve('helper/OfficeHelper.cs')])
// Independent COM fixture: this does not use any new plugin operation.
const seed = join(dir, 'seed.ps1')
writeFileSync(seed, `
$ErrorActionPreference='Stop'
$app=New-Object -ComObject '${suite === 'wps' ? 'kwps.Application' : 'Word.Application'}'
$d=$null
try {
 $d=$app.Documents.Add()
 $d.Content.Text="Anchor one.\rAnchor two.\rAnchor three.\r"
 for($i=1;$i -le 3;$i++) { $r=$d.Paragraphs.Item($i).Range.Duplicate; $r.End=$r.End-1; $r.Collapse(0); $n=$d.Footnotes.Add($r,[Type]::Missing,"Original note $i") }
 $d.SaveAs2('${doc.replaceAll("'", "''")}',16)
 $d.Close(0)
 $d=$app.Documents.Add()
 $d.Content.Text="First page.\rSecond page.\rThird section.\r"
 $d.Paragraphs.Item(2).Format.PageBreakBefore=-1
 $r=$d.Paragraphs.Item(3).Range.Duplicate; $r.Collapse(1); $r.InsertBreak(2)
 foreach($text in @('First page.','Second page.','Third section.')) {
  $r=$d.Content.Duplicate; $ok=$r.Find.Execute($text); if(!$ok){throw 'missing fixture text'}; $r.Collapse(0)
  $n=$d.Footnotes.Add($r,[Type]::Missing,"Numbering $text")
 }
 $d.SaveAs2('${join(dir,'numbering.docx').replaceAll("'", "''")}',16)
} finally { if($d){$d.Close(0)}; ${suite === 'microsoft' ? '$app.Quit()' : ''} }
`, 'utf8')
execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', seed], { timeout: 60000 })
const child = spawn(exe, [], { env: { ...process.env, DSH_OFFICE_SUITE: suite, DSH_OFFICE_DEBUG: '1' }, windowsHide: true })
let buffer = '', next = 0, ready
const pending = new Map(), started = new Promise(r => { ready = r })
const log = []
child.stderr.on('data', b => { process.stderr.write(b); log.push(String(b)) })
child.stdout.on('data', b => {
 buffer += b
 for (let i; (i = buffer.indexOf('\n')) >= 0;) {
  const line = buffer.slice(0, i); buffer = buffer.slice(i + 1)
  if (!line.trim()) continue
  const reply = JSON.parse(line)
  if (reply.event === 'ready') ready()
  else pending.get(reply.id)?.(reply)
 }
})
const call = (cmd, args = {}) => new Promise((resolveCall, reject) => {
 const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(Error(`timeout: ${cmd}`)) }, 90000)
 pending.set(id, reply => { clearTimeout(timer); pending.delete(id); log.push({cmd, args, reply}); reply.ok ? resolveCall(reply.result) : reject(Error(JSON.stringify(reply))) })
 child.stdin.write(JSON.stringify({ cmd, doc, ...args, id }) + '\n')
})
const edit = async (...ops) => {
 const result = await call('edit', {ops, math: formulasOf(ops), typing:false, follow:false, card:false})
 assert.equal(result.failed, undefined, JSON.stringify(result))
 assert.ok(result.done.every(s => !s.includes('IGNORED')), JSON.stringify(result))
 console.log('ok', ops.map(o => o.op).join(', '))
 return result
}
const read = () => call('read', {full:true, footnotes:true})
const failure = async (code, ...ops) => {
 const result = await call('edit', {ops})
 assert.equal(result.failed?.code, code, JSON.stringify(result))
 console.log('ok rejected', code)
}
try {
 await started
 await call('open', { path:doc, show:false })
 let r=await read()
 console.log('baseline:', JSON.stringify(r))
 assert.equal(r.footnotes.length,3)
 const scoped=await call('read',{from:2,count:1,full:true})
 assert.deepEqual(scoped.footnotes.map(n=>n.i),[2])
 const all=await call('read',{from:2,count:1,full:true,footnotes:true})
 assert.equal(all.footnotes.length,3)
 assert.deepEqual(r.items.filter(n=>n.text.includes('[footnote:')).map(n=>n.text.match(/\[footnote:(\d+)\]/)[1]),['1','2','3'])
 const old=r.footnotes.map(n=>({para:n.para,text:n.text,offset:n.offset}))
 await edit({op:'insert_footnote',para:1,expect:'Anchor one.',text:'Undo probe.'})
 await call('undo')
 r=await read(); assert.equal(r.footnotes.length,3,'one undo must remove the footnote batch')
 assert.deepEqual(r.footnotes.map(n=>({para:n.para,text:n.text,offset:n.offset})),old)
 await edit({op:'insert_footnote',para:1,expect:'Anchor one.',find:'one',text:'中文引注 English $E=mc^2$。'}, {op:'insert_footnote',para:3,expect:'Anchor three.',text:'新增末注。'})
 r=await read()
 assert.equal(r.footnotes.length,5)
 for(const original of old) { const now=r.footnotes.find(n=>n.text===original.text); assert.equal(now?.para,original.para) }
 assert.deepEqual(r.footnotes.map(n=>n.label),['1','2','3','4','5'])
 await edit({op:'edit_footnote',footnote:1,expect:'中文引注',text:'中文引注 **English** $E=mc^2$。',size:10}, {op:'format_text',footnote:1,expect:'中文引注',find:'English',italic:true,latinFont:'Times New Roman'})
 await failure('ANCHOR_MISMATCH',{op:'delete_footnote',footnote:2,expect:'wrong'})
 await failure('BAD_ARGS',{op:'set_text',para:1,expect:'Anchor',text:'discard'})
 await failure('BAD_ARGS',{op:'insert_paragraphs',items:[{text:'bad [fn:unclosed'}]})
 await edit({op:'delete_footnote',footnote:3,expect:'Original note 2'})
 r=await read(); assert.equal(r.footnotes.length,4)
 assert.deepEqual(r.footnotes.map(n=>n.label),['1','2','3','4'])
 await edit({op:'insert_paragraphs',where:'end',items:[{text:'内联甲[fn:作者，完整引注。]乙\\footnote{英文 **Source**，$\\frac{a}{b}$。}丙\\cite{1}。'},{text:'替换占位。'},{text:'重写占位。'}]}, {op:'insert_references',items:['Author. Reference[M]. 2026.']})
 r=await read(); assert.equal(r.footnotes.length,6)
 const replacementPara=r.items.find(n=>n.text==='替换占位。').i
 const rewrittenPara=r.items.find(n=>n.text==='重写占位。').i
 await edit({op:'replace_text',find:'替换占位',replace:'替换完成[fn:替换引注]'}, {op:'set_text',para:rewrittenPara,expect:'重写占位',text:'重写完成\\footnote{重写引注}'})
 r=await read(); assert.equal(r.footnotes.length,8)
 await edit({op:'delete_range',para:replacementPara,expect:'替换完成'})
 r=await read(); assert.equal(r.footnotes.length,7)
 await edit({op:'footnote_settings',numbering:'page'})
 r=await read(); assert.equal(r.footnotes[0].label,'1')
 await edit({op:'footnote_settings',numbering:'section',section:1})
 await edit({op:'footnote_settings',numbering:'continuous'})
 await call('save')
 await call('save',{path:join(dir,'acceptance.pdf')})
 await call('close',{save:true})
 await call('open',{path:doc,show:false})
 r=await read(); assert.equal(r.footnotes.length,7)
 assert.ok(!r.footnotes.some(n=>n.text.includes('$')),'equations must be converted in footnotes')
 assert.ok(r.items.some(n=>n.text.includes('[footnote:')))
 writeFileSync(join(dir,'readback.json'),JSON.stringify(r,null,2))
 await call('close',{save:true})
 doc=join(dir,'numbering.docx')
 await call('open',{path:doc,show:false})
 await edit({op:'footnote_settings',numbering:'continuous'})
 r=await read(); assert.equal(r.pages,3); assert.deepEqual(r.footnotes.map(n=>n.label),['1','2','3'])
 await edit({op:'footnote_settings',numbering:'page'})
 r=await read(); assert.deepEqual(r.footnotes.map(n=>n.label),['1','1','1'])
 await edit({op:'footnote_settings',numbering:'section'})
 r=await read(); assert.deepEqual(r.footnotes.map(n=>n.label),['1','2','1'])
 await edit({op:'footnote_settings',numbering:'page',section:1})
 r=await read(); assert.deepEqual(r.footnotes.map(n=>n.label),['1','1','1'])
 writeFileSync(join(dir,'numbering-readback.json'),JSON.stringify(r,null,2))
 await call('save'); await call('save',{path:join(dir,'numbering.pdf')})
 console.log('PASS',suite,dir)
} finally {
 try {await call('close',{save:true})} catch {}
 child.stdin.end()
 writeFileSync(join(dir,'trace.json'),JSON.stringify(log,null,2))
 console.log('artifacts:',dir)
}
