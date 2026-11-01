/**
 * Dependency-free Office OpenXML writer. Every exported slide is made of native
 * PowerPoint editable text and shapes; documents use native Word paragraphs.
 * No macros, external relationships, shell commands or template execution.
 */
import { deflateRawSync } from 'node:zlib';

const enc = x => Buffer.from(String(x), 'utf8');
const xml = x => String(x ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const crcTable = Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++) c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
export function zipEntries(entries) {
  const local=[],central=[];let cursor=0;
  for(const [name,bytes] of Object.entries(entries)){
    if(!/^[\w/.[\]-]+$/.test(name)||name.includes('..')||name.startsWith('/'))throw Error('unsafe Office path');
    const fname=enc(name),raw=Buffer.isBuffer(bytes)?bytes:enc(bytes),z=deflateRawSync(raw),crc=crc32(raw);
    const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0,6);lh.writeUInt16LE(8,8);lh.writeUInt32LE(crc,14);lh.writeUInt32LE(z.length,18);lh.writeUInt32LE(raw.length,22);lh.writeUInt16LE(fname.length,26);
    local.push(lh,fname,z);
    const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(8,10);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(z.length,20);ch.writeUInt32LE(raw.length,24);ch.writeUInt16LE(fname.length,28);ch.writeUInt32LE(cursor,42);
    central.push(ch,fname);cursor+=lh.length+fname.length+z.length;
  }
  const cbytes=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(entries).length,8);end.writeUInt16LE(Object.keys(entries).length,10);end.writeUInt32LE(cbytes.length,12);end.writeUInt32LE(cursor,16);
  return Buffer.concat([...local,cbytes,end]);
}
const core = title => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title><dc:creator>DSH Research Workbench</dc:creator></cp:coreProperties>`;
const pkgRel = (items) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id,type,target])=>`<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;
const officeRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const packageRel = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/';
const contentTypes = overrides=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides.map(([part,type])=>`<Override PartName="/${part}" ContentType="${type}"/>`).join('')}</Types>`;

function wordPara(content,style='BodyText',opts={}) {
  const chunks=String(content).split('\n');
  return chunks.map(line => {
    const bullet=/^[-*] /.test(line),text=bullet?line.slice(2):line;
    const pr=`<w:pPr><w:pStyle w:val="${style}"/>${bullet?'<w:ind w:left="720" w:hanging="240"/>':''}</w:pPr>`;
    const safe=xml((bullet?'•  ':'')+text);
    return `<w:p>${pr}<w:r><w:rPr><w:rFonts w:eastAsia="微软雅黑" w:ascii="Aptos" w:hAnsi="Aptos"/></w:rPr><w:t xml:space="preserve">${safe || ' '}</w:t></w:r></w:p>`;
  }).join('');
}
const docStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="微软雅黑"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:before="280" w:after="260"/></w:pPr><w:rPr><w:b/><w:sz w:val="38"/><w:color w:val="17365D"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr><w:rPr><w:sz w:val="21"/><w:color w:val="667085"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:outlineLvl w:val="0"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="170"/></w:pPr><w:rPr><w:b/><w:sz w:val="29"/><w:color w:val="24569B"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>`;
/** doc: {title, subtype, organization, author, sections:[{heading,body}]} */
export function makeDocx(doc){
  const title=doc.title||'未命名文档';
  const contents=[wordPara(title,'Title')];
  const subtitle=[doc.organization,doc.author,doc.subtype].filter(Boolean).join(' · ');
  if(subtitle)contents.push(wordPara(subtitle,'Subtitle'));
  for(const [i,s] of (doc.sections||[]).entries()){
    contents.push(wordPara(`${i+1}. ${s.heading}`,'Heading1'));
    contents.push(wordPara(s.body||'','BodyText'));
  }
  const main=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${contents.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1320" w:right="1250" w:bottom="1320" w:left="1250" w:header="708" w:footer="708"/></w:sectPr></w:body></w:document>`;
  return zipEntries({
    '[Content_Types].xml':contentTypes([['word/document.xml','application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'],['word/styles.xml','application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml'],['docProps/core.xml','application/vnd.openxmlformats-package.core-properties+xml'],['docProps/app.xml','application/vnd.openxmlformats-officedocument.extended-properties+xml']]),
    '_rels/.rels':pkgRel([['rId1',officeRel+'officeDocument','word/document.xml'],['rId2',packageRel+'core-properties','docProps/core.xml'],['rId3',officeRel+'extended-properties','docProps/app.xml']]),
    'word/document.xml':main,
    'word/_rels/document.xml.rels':pkgRel([['rId1',officeRel+'styles','styles.xml']]),
    'word/styles.xml':docStyles,
    'docProps/core.xml':core(title),
    'docProps/app.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DSH Research Workbench</Application></Properties>',
  });
}

const EMU=914400;
const px=v=>Math.round(v*EMU);
const color=v=>{const c=String(v||'').replace(/^#/,'').toUpperCase();return /^[0-9A-F]{6}$/.test(c)?c:'192F52'};
const shapeBase = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
function slideShape(id,name,x,y,w,h,text,{fontSize=21,bold=false,fill=null,stroke=null,fg='192F52',align='l',anchor='ctr'}={}){
  const spPr=`<p:spPr><a:xfrm><a:off x="${px(x)}" y="${px(y)}"/><a:ext cx="${px(w)}" cy="${px(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill?`<a:solidFill><a:srgbClr val="${color(fill)}"/></a:solidFill>`:'<a:noFill/>'}${stroke?`<a:ln w="9500"><a:solidFill><a:srgbClr val="${color(stroke)}"/></a:solidFill></a:ln>`:'<a:ln><a:noFill/></a:ln>'}</p:spPr>`;
  const lines=String(text).split('\n'); // never silently discard user-authored text
  const p=lines.map(l=>`<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="zh-CN" sz="${Math.round(fontSize*100)}" b="${bold?'1':'0'}"><a:solidFill><a:srgbClr val="${color(fg)}"/></a:solidFill><a:latin typeface="Aptos"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>${xml(l||' ')}</a:t></a:r></a:p>`).join('');
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>${spPr}<p:txBody><a:bodyPr wrap="square" anchor="${anchor}" lIns="100000" rIns="100000" tIns="30000" bIns="30000"/><a:lstStyle/>${p}</p:txBody></p:sp>`;
}
const slideTheme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Research"><a:themeElements><a:clrScheme name="Research"><a:dk1><a:sysClr val="windowText" lastClr="192F52"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="192F52"/></a:dk2><a:lt2><a:srgbClr val="E8F0FC"/></a:lt2><a:accent1><a:srgbClr val="3671C9"/></a:accent1><a:accent2><a:srgbClr val="3B587C"/></a:accent2><a:accent3><a:srgbClr val="B3C7E5"/></a:accent3><a:accent4><a:srgbClr val="7795BA"/></a:accent4><a:accent5><a:srgbClr val="A5BDD9"/></a:accent5><a:accent6><a:srgbClr val="DDE8F7"/></a:accent6><a:hlink><a:srgbClr val="3671C9"/></a:hlink><a:folHlink><a:srgbClr val="3671C9"/></a:folHlink></a:clrScheme><a:fontScheme name="Research"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Research"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:solidFill><a:schemeClr val="accent3"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln><a:ln w="25400"><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></a:ln><a:ln w="38100"><a:solidFill><a:schemeClr val="accent3"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill><a:solidFill><a:schemeClr val="lt2"/></a:solidFill><a:solidFill><a:schemeClr val="dk2"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
function slideXml(s,index,total,theme){
 const bg=theme==='dark'?'10233D':'FFFFFF',ink=theme==='dark'?'FFFFFF':'1B3559';
 const accent=theme==='ink'?'1C1C1C':'3671C9';
 let shapes=[slideShape(2,'背景',0,0,13.333,7.5,'',{fill:bg}),slideShape(3,'强调线',0,0,0.12,7.5,'',{fill:accent})];
 const title=s.title||'未命名幻灯片', mode=s.layout||'bullets';
 if(mode==='cover'||mode==='closing'){
   shapes.push(slideShape(4,'主标题',1,1.6,11.2,1.25,title,{fontSize:38,bold:true,fg:ink,anchor:'ctr'}));
   shapes.push(slideShape(5,'副标题',1,3.0,11.2,1.2,s.body||'',{fontSize:19,fg:theme==='dark'?'D8E4F4':'576D86',anchor:'t'}));
   shapes.push(slideShape(6,'底部标识',1,6.6,10.8,0.4,s.footer||'DSH Research Workbench',{fontSize:10,fg:theme==='dark'?'CBD5E1':'8C9CAF',anchor:'ctr'}));
 }else{
   shapes.push(slideShape(4,'标题',0.75,0.45,11.8,0.72,title,{fontSize:27,bold:true,fg:ink,anchor:'ctr'}));
   shapes.push(slideShape(5,'标题分隔线',0.75,1.22,11.75,0.045,'',{fill:accent}));
   const body=s.body||'';
   if(mode==='two-column'){
     const cols=body.split(/\n---\n/),a=cols[0]||'',b=cols[1]||'';
     shapes.push(slideShape(6,'左侧面板',0.78,1.58,5.6,4.9,'',{fill:theme==='dark'?'213C61':'F1F5FB',stroke:theme==='dark'?'3D5F8D':'C8D8ED'}));
     shapes.push(slideShape(7,'左侧内容',1.03,1.84,5.05,4.36,a,{fontSize:17,fg:ink,anchor:'t'}));
     shapes.push(slideShape(8,'右侧面板',6.78,1.58,5.6,4.9,'',{fill:theme==='dark'?'213C61':'F1F5FB',stroke:theme==='dark'?'3D5F8D':'C8D8ED'}));
     shapes.push(slideShape(9,'右侧内容',7.03,1.84,5.05,4.36,b,{fontSize:17,fg:ink,anchor:'t'}));
   }else{
     shapes.push(slideShape(6,'正文',0.92,1.7,11.5,4.72,body,{fontSize:19,fg:ink,anchor:'t'}));
   }
   shapes.push(slideShape(10,'页码',11.3,6.82,1.2,0.3,`${index}/${total}`,{fontSize:10,fg:theme==='dark'?'CBD5E1':'8696AB',align:'r'}));
 }
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="${xml(title)}"><p:spTree>${shapeBase}${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
const slideLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${shapeBase}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
const master = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Master"><p:spTree>${shapeBase}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
export function makePptx(doc){
 const slides=doc.slides||[];if(!slides.length)throw Error('PPTX requires at least one slide');
 const n=slides.length;
 const overrides=[['ppt/presentation.xml','application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'],['ppt/slideMasters/slideMaster1.xml','application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml'],['ppt/slideLayouts/slideLayout1.xml','application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'],['ppt/theme/theme1.xml','application/vnd.openxmlformats-officedocument.theme+xml'],['docProps/core.xml','application/vnd.openxmlformats-package.core-properties+xml'],['docProps/app.xml','application/vnd.openxmlformats-officedocument.extended-properties+xml']];
 const files={};
 for(let i=0;i<n;i++){
   const no=i+1;const key=`ppt/slides/slide${no}.xml`;
   overrides.push([key,'application/vnd.openxmlformats-officedocument.presentationml.slide+xml']);
   files[key]=slideXml(slides[i],no,n,doc.theme||'blue');
   files[`ppt/slides/_rels/slide${no}.xml.rels`]=pkgRel([['rId1',officeRel+'slideLayout','../slideLayouts/slideLayout1.xml']]);
 }
 files['[Content_Types].xml']=contentTypes(overrides);
 files['_rels/.rels']=pkgRel([['rId1',officeRel+'officeDocument','ppt/presentation.xml'],['rId2',packageRel+'core-properties','docProps/core.xml'],['rId3',officeRel+'extended-properties','docProps/app.xml']]);
 files['ppt/presentation.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${2+i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`;
 files['ppt/_rels/presentation.xml.rels']=pkgRel([['rId1',officeRel+'slideMaster','slideMasters/slideMaster1.xml'],...slides.map((_,i)=>[`rId${i+2}`,officeRel+'slide',`slides/slide${i+1}.xml`])]);
 files['ppt/slideMasters/slideMaster1.xml']=master;
 files['ppt/slideMasters/_rels/slideMaster1.xml.rels']=pkgRel([['rId1',officeRel+'slideLayout','../slideLayouts/slideLayout1.xml'],['rId2',officeRel+'theme','../theme/theme1.xml']]);
 files['ppt/slideLayouts/slideLayout1.xml']=slideLayout;
 files['ppt/slideLayouts/_rels/slideLayout1.xml.rels']=pkgRel([['rId1',officeRel+'slideMaster','../slideMasters/slideMaster1.xml']]);
 files['ppt/theme/theme1.xml']=slideTheme;
 files['docProps/core.xml']=core(doc.title);
 files['docProps/app.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DSH Research Workbench</Application><Slides>${n}</Slides></Properties>`;
 return zipEntries(files);
}
export function makeMarkdown(doc){
 const intro=[`# ${doc.title}`,doc.organization?`**单位：** ${doc.organization}`:'',doc.author?`**负责人：** ${doc.author}`:''].filter(Boolean).join('\n\n');
 if(Array.isArray(doc.slides))return `${intro}\n\n${doc.slides.map((s,i)=>`## ${i+1}. ${s.title}\n\n${s.body||''}`).join('\n\n---\n\n')}\n`;
 return `${intro}\n\n${(doc.sections||[]).map((s,i)=>`## ${i+1}. ${s.heading}\n\n${s.body||''}`).join('\n\n')}\n`;
}
