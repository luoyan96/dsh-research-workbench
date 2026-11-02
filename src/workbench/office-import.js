/**
 * DSH Research Workbench: Office Open XML (.docx/.pptx) importer and conservative
 * in-place text patcher. Node built-ins only. Never executes document content.
 *
 * For unchanged imported artifacts the exact original bytes are returned.
 * For text edits with unchanged section/slide structure, update the original
 * XML archive to retain the Office theme, media, positioning and relationships.
 * For structural edits the caller must explicitly fall back to a new OOXML export.
 */
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export const OFFICE_IMPORT_MAX_BYTES = 12 * 1024 * 1024;
const MAX_ENTRY = 18 * 1024 * 1024;
const MAX_ALL_XML = 34 * 1024 * 1024;
const MAX_ENTRIES = 5000;
export class OfficeImportError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new OfficeImportError(code, message); };
const xmlEscape = str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
function xmlDecode(s) {
  return String(s).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
    const n = /^x/i.test(code) ? parseInt(code.slice(1), 16) : Number(code);
    return Number.isInteger(n) && n >= 0 && n <= 0x10ffff && (n < 0xd800 || n > 0xdfff) ? String.fromCodePoint(n) : '\ufffd';
  }).replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name]));
}

const crcTable = Array.from({ length:256 }, (_, j) => {
  let c = j;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function safeName(name) {
  return name && name.length < 512 && !name.startsWith('/') && !name.includes('\\') &&
    !name.includes('\0') && !name.split('/').some(p => p === '..' || p === '.');
}

export function openOfficeZip(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buf.length > OFFICE_IMPORT_MAX_BYTES) fail('OFFICE_TOO_LARGE', '单个 DOCX / PPTX 文件不能超过 12 MiB');
  if (buf.length < 22) fail('INVALID_OFFICE', '文件不是有效的 DOCX / PPTX ZIP 包');
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) fail('INVALID_OFFICE', 'Office ZIP 尾部目录缺失');
  const count = buf.readUInt16LE(eocd + 10), size = buf.readUInt32LE(eocd + 12), start = buf.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES || count === 0xffff || start === 0xffffffff || start + size > eocd)
    fail('INVALID_OFFICE', 'Office ZIP 目录非法或不支持 ZIP64');
  const items = new Map();
  let pos = start, inflatedTotal = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== 0x02014b50) fail('INVALID_OFFICE', 'Office ZIP 目录损坏');
    const flag = buf.readUInt16LE(pos + 8), method = buf.readUInt16LE(pos + 10);
    const crc = buf.readUInt32LE(pos + 16), compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24), nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30), commentLen = buf.readUInt16LE(pos + 32);
    const localPos = buf.readUInt32LE(pos + 42);
    if (pos + 46 + nameLen + extraLen + commentLen > buf.length) fail('INVALID_OFFICE', 'Office ZIP 文件名超界');
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen);
    pos += 46 + nameLen + extraLen + commentLen;
    if (!safeName(name) || items.has(name)) fail('INVALID_OFFICE', 'Office ZIP 路径非法或重复');
    if (/vbaproject\.bin$/i.test(name) || /(^|\/)activeX\//i.test(name))
      fail('UNSAFE_OFFICE', 'Office 文件含宏或 ActiveX 内容，出于安全原因不支持导入');
    inflatedTotal += uncompressedSize;
    if (uncompressedSize > 80 * 1024 * 1024 || inflatedTotal > 300 * 1024 * 1024)
      fail('OFFICE_TOO_LARGE', 'Office 文件包含解压后体积过大的附件');
    if ((flag & 1) || (method !== 0 && method !== 8) || compressedSize > OFFICE_IMPORT_MAX_BYTES)
      fail('INVALID_OFFICE', 'Office ZIP 含加密或不支持的压缩项');
    if (localPos + 30 > buf.length || buf.readUInt32LE(localPos) !== 0x04034b50) fail('INVALID_OFFICE', 'Office ZIP 本地目录损坏');
    const localName = buf.readUInt16LE(localPos + 26), localExtra = buf.readUInt16LE(localPos + 28);
    const data = localPos + 30 + localName + localExtra;
    if (data + compressedSize > buf.length) fail('INVALID_OFFICE', 'Office ZIP 数据超界');
    items.set(name, {name, crc, method, compressedSize, uncompressedSize,
      compressed:buf.subarray(data, data + compressedSize)});
  }
  if (!items.has('[Content_Types].xml')) fail('INVALID_OFFICE', 'Office ZIP 缺少内容类型清单');
  let allocated = 0;
  const get = name => {
    const entry = items.get(name);
    if (!entry) return null;
    if (entry.uncompressedSize > MAX_ENTRY || allocated + entry.uncompressedSize > MAX_ALL_XML)
      fail('OFFICE_TOO_LARGE', 'Office XML 体积过大，无法安全解析');
    let raw;
    try { raw = entry.method === 8 ? inflateRawSync(entry.compressed, {maxOutputLength:MAX_ENTRY+1}) : entry.compressed; }
    catch { fail('INVALID_OFFICE', 'Office ZIP 项解压失败'); }
    if (raw.length !== entry.uncompressedSize || crc32(raw) !== entry.crc)
      fail('INVALID_OFFICE', 'Office ZIP 文件校验失败');
    allocated += raw.length;
    return raw.toString('utf8');
  };
  return {items,get};
}

export function replaceOfficeXml(source, replacements) {
  const zip = openOfficeZip(source);
  const locals = [], central = [];
  let pos = 0;
  for (const entry of zip.items.values()) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const replacement = replacements.get(entry.name);
    const raw = replacement === undefined ? null : Buffer.from(replacement, 'utf8');
    const compressed = raw === null ? entry.compressed : deflateRawSync(raw);
    const method = raw === null ? entry.method : 8;
    const crc = raw === null ? entry.crc : crc32(raw);
    const uncompressedSize = raw === null ? entry.uncompressedSize : raw.length;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6); header.writeUInt16LE(method, 8);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(uncompressedSize, 22); header.writeUInt16LE(nameBuf.length, 26);
    locals.push(header, nameBuf, compressed);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x800, 8); cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(uncompressedSize, 24); cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(pos, 42);
    central.push(cd, nameBuf);
    pos += header.length + nameBuf.length + compressed.length;
  }
  const centralLength = central.reduce((n,b)=>n+b.length, 0);
  const foot = Buffer.alloc(22);
  foot.writeUInt32LE(0x06054b50,0);
  foot.writeUInt16LE(zip.items.size,8); foot.writeUInt16LE(zip.items.size,10);
  foot.writeUInt32LE(centralLength,12); foot.writeUInt32LE(pos,16);
  const result = Buffer.concat([...locals,...central,foot]);
  if (result.length > 40 * 1024 * 1024) fail('OFFICE_TOO_LARGE', 'Office 导出文件过大');
  return result;
}

function paragraphText(xml, tag) {
  let output = '';
  const re = new RegExp('<'+tag+':t\\b[^>]*>([\\s\\S]*?)<\\/'+tag+':t>|<'+tag+':tab\\b[^>]*/>|<'+tag+':br\\b[^>]*/>', 'g');
  for (const m of xml.matchAll(re)) output += m[1] === undefined ? (m[0].startsWith('<'+tag+':tab') ? '\t' : '\n') : xmlDecode(m[1]);
  return output.trim();
}
function wordIsHeading(xml, text) {
  const style = xml.match(/<w:pStyle\b[^>]*\bw:val=["']([^"']+)["']/)?.[1] || '';
  const outline = xml.match(/<w:outlineLvl\b[^>]*\bw:val=["'](\d+)["']/)?.[1];
  return Boolean(text && text.length <= 120 && (outline !== undefined && Number(outline) <= 5 ||
    /^(?:Heading[\s_-]?[1-9]|Title|标题[\s_-]?[1-9]|heading[1-9])$/i.test(style) ||
    /^(?:第[一二三四五六七八九十百\d]+[章节部分]|[一二三四五六七八九十]+[、.]|\d+(?:\.\d+){0,3}[\.、\s　]+)\S/.test(text)));
}

export function parseImportedDocx(bytes) {
  const zip = openOfficeZip(bytes);
  const xml = zip.get('word/document.xml');
  if (!xml || !/<w:document\b/.test(xml)) fail('BAD_DOCX', '文件不包含有效的 Word 主文档');
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((m, index)=>({index,text:paragraphText(m[0],'w'),heading:wordIsHeading(m[0],paragraphText(m[0],'w'))}));
  const sections = [], maps = [];
  let curr = null, map = null;
  for (const p of paragraphs) {
    if (p.heading) {
      if (curr) { sections.push(curr); maps.push(map); }
      curr = {heading:p.text,body:''}; map = {headingIndex:p.index,bodyIndices:[]};
    } else if (p.text) {
      if (!curr) { curr = {heading:'正文',body:''}; map = {headingIndex:null,bodyIndices:[]}; }
      curr.body += (curr.body ? '\n' : '') + p.text;
      map.bodyIndices.push(p.index);
    }
  }
  if (curr) { sections.push(curr); maps.push(map); }
  if (!sections.length) fail('EMPTY_OFFICE', 'Word 文档不包含可读取文字（不支持仅扫描图片的文档）');
  if (sections.length > 80 || sections.some(s=>s.body.length>50000))
    fail('OFFICE_TOO_LARGE', 'Word 章节数量或单节长度超出工作台限制');
  return {sections, map:{kind:'docx', sections:maps}, warnings:[
    'Word 标题及正文已导入。原件单独保存；文本编辑后尽量保留其余原始布局，复杂结构变更将使用简化排版。',
    '表格、图片、页眉页脚等不在文本编辑区内呈现，但在保真导出时保留于 Office 原件。',
  ]};
}

function attrs(xml){
  return Object.fromEntries([...xml.matchAll(/\b([A-Za-z][\w:.-]*)=["']([^"']*)["']/g)].map(m=>[m[1],xmlDecode(m[2])]));
}
function pptSlideOrder(pres, relationships) {
  const rels = new Map();
  for(const m of relationships.matchAll(/<Relationship\b[^>]*\/?\s*>/g)) {
    const a = attrs(m[0]);
    if (a.Id && a.Target && !a.TargetMode) rels.set(a.Id,a.Target);
  }
  const order=[];
  for(const m of pres.matchAll(/<p:sldId\b[^>]*\/?\s*>/g)) {
    const id=attrs(m[0])['r:id'];
    if (!id || !rels.has(id)) fail('BAD_PPTX', 'PowerPoint 幻灯片关系不存在');
    const target=rels.get(id);
    const name=target[0]==='/' ? target.slice(1) : target.startsWith('ppt/') ? target : 'ppt/'+target.replace(/^\.\//,'');
    const normalized=name.replace(/\/\.\//g,'/');
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(normalized)) fail('BAD_PPTX','PowerPoint 幻灯片路径无效');
    order.push(normalized);
  }
  return order;
}
function shapeText(xml) {
  const paragraphs = [...xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)]
    .map(m=>paragraphText(m[0],'a'));
  return paragraphs.filter(Boolean).join('\n');
}

export function parseImportedPptx(bytes) {
  const zip=openOfficeZip(bytes);
  const presentation=zip.get('ppt/presentation.xml'), rels=zip.get('ppt/_rels/presentation.xml.rels');
  if (!presentation || !rels || !/<p:presentation\b/.test(presentation)) fail('BAD_PPTX','文件不包含有效的 PowerPoint 主结构');
  const order = pptSlideOrder(presentation,rels);
  if (!order.length || order.length>80) fail('BAD_PPTX','PowerPoint 应包含 1～80 张幻灯片');
  const slides=[], slideMaps=[];
  let textCount=0;
  for(let i=0;i<order.length;i++){
    const xml=zip.get(order[i]);
    if (!xml) fail('BAD_PPTX','PowerPoint 第 '+(i+1)+' 页 XML 丢失');
    const shapeMatches=[...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)];
    const pieces=shapeMatches.map((m,j)=>({index:j,text:shapeText(m[0]),title: /<p:ph\b[^>]*\btype=["'](?:title|ctrTitle)["']/.test(m[0])})).filter(s=>s.text);
    const chosen=pieces.find(x=>x.title) || pieces.find(x=>x.text.length<=120) || pieces[0];
    const title=chosen?.text.replace(/\n/g,' ').slice(0,120) || '第'+(i+1)+'页';
    const bodyShapes=pieces.filter(x=>x!==chosen);
    const body=bodyShapes.map(x=>x.text).join('\n\n');
    if (body.length>12000) fail('OFFICE_TOO_LARGE','PowerPoint 第 '+(i+1)+' 页文字超出编辑器限制');
    textCount+=pieces.reduce((n,x)=>n+x.text.length,0);
    slides.push({title,body,layout:i===0&&bodyShapes.length===0?'cover':'bullets',footer:''});
    slideMaps.push({path:order[i],titleIndex:chosen?.index??null, bodyIndices:bodyShapes.map(x=>x.index),
      sourceBodyTexts:bodyShapes.map(x=>x.text)});
  }
  if (!textCount) fail('EMPTY_OFFICE','PPT 全部为非文字对象；请使用 PowerPoint 编辑原文件');
  return {slides,map:{kind:'pptx',slides:slideMaps},warnings:[
    'PPTX 已按原页序导入文字。原件单独保存；文本框内容不改动结构时尽量保留图片、形状及原版式。',
    '当前编辑区按空行分隔不同文本框；复杂布局调整、动画和对象级编辑仍需在 PowerPoint 中完成。',
  ]};
}

function replaceTextNodes(xml, namespace, text) {
  if (namespace==='a' && text.includes('\n')) throw new Error('PPT paragraph count changed');
  const token = new RegExp('<'+namespace+':t\\b[^>]*>[\\s\\S]*?<\\/'+namespace+':t>', 'g');
  let first=true;
  const safe=xmlEscape(text).replace(/\n/g, '</'+namespace+':t><'+namespace+':br/><'+namespace+':t xml:space="preserve">');
  const changed=xml.replace(token, () => {
    if (first) { first=false; return '<'+namespace+':t xml:space="preserve">'+safe+'</'+namespace+':t>'; }
    return '<'+namespace+':t></'+namespace+':t>';
  });
  if (!first) return changed;
  // Do not add free text into an image-only paragraph/shape.
  if (text) throw new Error('target has no existing text runs');
  return changed;
}

function replaceWordParagraph(xml,newText) {
  return replaceTextNodes(xml,'w',newText);
}
function patchWordXML(xml,manifest,original,doc) {
  if (doc.sections.length!==original.sections.length || doc.sections.some((s,i)=>s.id!==original.sections[i].id)) return null;
  if(doc.title!==original.title || doc.organization!==original.organization || doc.author!==original.author) return null;
  const changes=new Map();
  for(let s=0;s<doc.sections.length;s++){
    const a=doc.sections[s],b=original.sections[s],mapping=manifest.sections[s];
    if (!mapping) return null;
    if (a.heading!==b.heading) {
      if (mapping.headingIndex===null) return null;
      changes.set(mapping.headingIndex,a.heading);
    }
    if(a.body!==b.body){
      const lines=a.body.split('\n');
      if(lines.length!==mapping.bodyIndices.length) return null;
      mapping.bodyIndices.forEach((idx,i)=>changes.set(idx,lines[i]));
    }
  }
  if (!changes.size) return xml;
  let idx=0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, p=>{
    const target=changes.get(idx++);
    return target===undefined?p:replaceWordParagraph(p,target);
  });
}
function patchPptShape(xml,idx,text) {
  let current=0, hit=false;
  const out=xml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, shape=>{
    if(current++!==idx) return shape;
    hit=true;
    const lines=text.split('\n');
    const sourceParagraphs=[...shape.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)]
      .filter(m=>paragraphText(m[0],'a'));
    if(lines.length!==sourceParagraphs.length)throw Error('PPT paragraph count changed');
    let line=0;
    return shape.replace(/<a:p\b[\s\S]*?<\/a:p>/g,paragraph=>
      paragraphText(paragraph,'a')?replaceTextNodes(paragraph,'a',lines[line++]):paragraph);
  });
  if (!hit) throw Error('shape missing');
  return out;
}

/**
 * Preserve the imported document's original layout when structurally possible.
 * Returns null when a meaningful edit cannot be mapped to original text runs.
 */
export function patchImportedOffice(kind,bytes,manifest,originalDoc,currentDoc) {
  const zip=openOfficeZip(bytes);
  if (kind==='docx') {
    const source=zip.get('word/document.xml');
    if (!source || manifest?.kind!=='docx' || !Array.isArray(manifest.sections)) return null;
    try {
      const updated=patchWordXML(source,manifest,originalDoc,currentDoc);
      return updated===null?null:replaceOfficeXml(bytes,new Map([['word/document.xml',updated]]));
    } catch { return null; }
  }
  if (kind==='pptx') {
    if(manifest?.kind!=='pptx' || !Array.isArray(manifest.slides) ||
       currentDoc.slides.length!==originalDoc.slides.length ||
       currentDoc.slides.some((s,i)=>s.id!==originalDoc.slides[i].id) ||
       currentDoc.title!==originalDoc.title || currentDoc.organization!==originalDoc.organization ||
       currentDoc.author!==originalDoc.author) return null;
    const patches=new Map();
    try {
      for(let i=0;i<currentDoc.slides.length;i++){
        const original=originalDoc.slides[i], current=currentDoc.slides[i], mapping=manifest.slides[i];
        if(!mapping || current.layout!==original.layout || current.footer!==original.footer) return null;
        let xml=zip.get(mapping.path);
        if(!xml) return null;
        if(current.title!==original.title){
          if(mapping.titleIndex===null)return null;
          xml=patchPptShape(xml,mapping.titleIndex,current.title);
        }
        if(current.body!==original.body){
          const texts=current.body.split('\n\n');
          if(texts.length!==mapping.bodyIndices.length) return null;
          for(let j=0;j<texts.length;j++) xml=patchPptShape(xml,mapping.bodyIndices[j],texts[j]);
        }
        patches.set(mapping.path,xml);
      }
      return replaceOfficeXml(bytes,patches);
    } catch { return null; }
  }
  return null;
}
