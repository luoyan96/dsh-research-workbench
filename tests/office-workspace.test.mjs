import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceTools} from '../src/workbench/office-workspace.js';
import {createTools,DEFAULTS} from '../lib/native-office.js';

const file={app:'ppt',path:'C:\\workbench\\upload-A\\QA.pptx'};
function fixture(options={}) {
  const calls=[];
  const helper={async call(cmd,args){calls.push({cmd,args});await options.before?.(cmd,args);
    if(cmd==='open')return{app:'ppt',suite:'wps',path:args.path,name:'QA.pptx',saved:true,how:options.attached?'attached':'opened',background:options.attached};
    if(cmd==='edit')return{done:['title updated'],failed:null};if(cmd==='save')return{path:args.doc,bytes:100};return 'closed';}};
  const host={helper,settings:()=>({...DEFAULTS,finalCheck:false}),saveImage:async()=>{},vision:async()=>false};
  const tools=createWorkspaceTools(createTools,host,()=>({current:async session=>session==='bound'?file:null}));
  return {calls,run:(name,args={},session='bound',signal=new AbortController().signal)=>tools.find(x=>x.name==='research_office_'+name).execute(args,{agent:{session:{id:session}},signal})};
}
test('bound workbench files remain quiet even with global live settings and model show:true',async()=>{
  const f=fixture();await f.run('open',{path:file.path,show:true});await f.run('edit',{ops:[{op:'set_text',slide:1,shape:'title',text:'FISH-732'}]});await f.run('save');
  assert.deepEqual(f.calls.map(x=>x.cmd),['open','edit','save']);assert.equal(f.calls[0].args.silent,true);assert.equal(f.calls[0].args.show,false);assert.equal(f.calls[1].args.follow,false);assert.equal(f.calls[1].args.typing,false);assert.equal(f.calls[1].args.card,false);assert.equal(f.calls[1].args.doc,file.path);assert.equal(f.calls[2].args.doc,file.path);
});
test('unbound conversations and explicitly different files retain the user’s Office preferences',async()=>{
  const f=fixture();await f.run('open',{path:'C:\\human\\notes.pptx'},'unbound');await f.run('open',{path:'C:\\reference\\other.pptx'});assert.ok(f.calls.every(x=>x.args.show===true && x.args.silent!==true));
});
test('concurrent live and bound calls do not leak quiet settings between conversations',async()=>{
  let proceed;const gate=new Promise(r=>proceed=r);const f=fixture({before:async(_cmd,args)=>{if(args.path===file.path)await gate;}});
  const bound=f.run('open',{});await new Promise(r=>setImmediate(r));await f.run('open',{path:'C:\\human\\notes.pptx'},'unbound');proceed();await bound;
  assert.equal(f.calls[0].args.silent,true);assert.equal(f.calls[1].args.show,true);await f.run('edit',{ops:[{op:'set_text'}]});assert.equal(f.calls.at(-1).args.doc,file.path);
});
test('cancellation prevents dispatch and does not report success after an in-flight command settles',async()=>{
  const f=fixture();const cancelled=new AbortController();cancelled.abort();await assert.rejects(f.run('open',{},'bound',cancelled.signal),{name:'AbortError'});assert.equal(f.calls.length,0);
  let proceed;const gate=new Promise(r=>proceed=r);const running=fixture({before:async()=>gate});const signal=new AbortController();const result=running.run('open',{},'bound',signal.signal);await new Promise(r=>setImmediate(r));signal.abort();proceed();await assert.rejects(result,{name:'AbortError'});assert.equal(running.calls.length,1);
});
test('same-named user documents never inherit close permission from a helper-owned path',async()=>{
  const f=fixture();await f.run('open');await assert.rejects(f.run('close',{doc:'C:\\human\\QA.pptx',save:false}),/yours|user|opened/i);assert.equal(f.calls.filter(x=>x.cmd==='close').length,0);await f.run('close',{doc:file.path,save:false});assert.equal(f.calls.at(-1).args.doc,file.path);
});
test('an attached hidden document retains helper close ownership',async()=>{
  const f=fixture({attached:true});await f.run('open');await f.run('close',{save:false});assert.equal(f.calls.at(-1).cmd,'close');
});
