import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  parseImportedDocx,parseImportedPptx,patchImportedOffice,
  OfficeImportError,replaceOfficeXml,openOfficeZip
} from '../src/workbench/office-import.js';
const file=(name)=>readFile(new URL('./fixtures/'+name,import.meta.url));
test('DOCX has real headings and editable paragraphs',async()=>{
  const raw=await file('sample.docx');
  const parsed=parseImportedDocx(raw);
  assert.equal(parsed.map.kind,'docx');
  assert(parsed.sections.some(s=>s.heading==='一、项目背景'));
  assert(parsed.sections.some(s=>s.body.includes('研究背景第一段')));
  assert.deepEqual(parseImportedDocx(raw).sections,parsed.sections);
  const previous={title:'测试',author:'',organization:'',sections:parsed.sections};
  const changed={...previous,sections:previous.sections.map(s=>({...s,body:s.body.replace('研究背景第一段','研究背景已经修改')}))};
  const updated=patchImportedOffice('docx',raw,parsed.map,previous,changed);
  assert(updated);
  assert(parseImportedDocx(updated).sections.some(s=>s.body.includes('研究背景已经修改')));
  assert(openOfficeZip(updated).items.has('word/media/image1.png'));
  // Original paragraph, table, image objects retained within the archive.
  assert.equal(openOfficeZip(updated).items.size,openOfficeZip(raw).items.size);
  const reordered={...previous,sections:[...previous.sections].reverse()};
  assert.equal(patchImportedOffice('docx',raw,parsed.map,previous,reordered),null);
  const inserted={...previous,sections:[...previous.sections, {heading:'新加',body:'内容'}]};
  assert.equal(patchImportedOffice('docx',raw,parsed.map,previous,inserted),null);
});
test('PPTX slide order, title and body map to editable text boxes',async()=>{
  const raw=await file('sample.pptx');
  const parsed=parseImportedPptx(raw);
  assert.equal(parsed.slides.length,2);
  assert.equal(parsed.slides[0].title,'研究背景');
  assert.equal(parsed.slides[1].title,'技术路线');
  const previous={title:'研究汇报',organization:'',author:'',slides:parsed.slides};
  const changed={...previous,slides:parsed.slides.map((s,i)=>i===0?{...s,title:'新的研究背景'}:s)};
  const updated=patchImportedOffice('pptx',raw,parsed.map,previous,changed);
  assert(updated);
  assert.equal(parseImportedPptx(updated).slides[0].title,'新的研究背景');
  assert.equal(openOfficeZip(updated).items.size,openOfficeZip(raw).items.size);
  assert([...openOfficeZip(updated).items.keys()].some(n=>n.startsWith('ppt/media/')));
  const changeBody={...previous,slides:previous.slides.map((s,i)=>i===0?{...s,body:s.body.replace('原生导入','Office 导入')}:s)};
  const withBody=patchImportedOffice('pptx',raw,parsed.map,previous,changeBody);
  assert(withBody);
  assert(parseImportedPptx(withBody).slides[0].body.includes('Office 导入'));
  const newSlide={...previous,slides:[...parsed.slides,{title:'新',body:'新',footer:'',layout:'bullets'}]};
  assert.equal(patchImportedOffice('pptx',raw,parsed.map,previous,newSlide),null);
});
test('invalid content and truncated ZIP fail without writing files',async()=>{
  assert.throws(()=>parseImportedDocx(Buffer.from('hello')),OfficeImportError);
  assert.throws(()=>parseImportedPptx(Buffer.from('not a powerpoint')),OfficeImportError);
  const raw=await file('sample.docx');
  const broken=Buffer.from(raw);
  const item=openOfficeZip(raw).items.get('word/document.xml');
  const start=broken.indexOf(item.compressed);
  assert(start>=0); broken[start + Math.floor(item.compressed.length/2)] ^= 0xff;
  assert.throws(()=>parseImportedDocx(broken),OfficeImportError);
});
