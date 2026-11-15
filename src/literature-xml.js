import { XMLParser, XMLValidator } from 'fast-xml-parser';
export function readAtom(xml) {
  if (Buffer.byteLength(xml) > 3 * 1024 * 1024 || /<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)) throw Error('arXiv XML 内容无效');
  if (XMLValidator.validate(xml) !== true) throw Error('arXiv XML 格式错误');
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', removeNSPrefix: true, parseTagValue: false, processEntities: true, isArray: name => ['entry','author','category','link'].includes(name) }).parse(xml);
}
