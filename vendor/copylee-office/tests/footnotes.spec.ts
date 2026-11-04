import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatWord } from '../src/format.js'

it('distinguishes the collection index from the displayed footnote number', () => {
  const text = formatWord({ paragraphs: 4, tables: 0, items: [{ i: 4, text: 'Body[footnote:7]' }], footnotes: [{ i: 7, label: '1', numberStyle: 0, para: 4, offset: 4, page: 2, section: 1, text: 'Author. Full citation.' }] })
  expect(text).toContain('Body[footnote:7]')
  expect(text).toContain('footnote 7 [display 1; para 4, offset 4, page 2, section 1] Author. Full citation.')
})

it('includes requested footnotes when reading a table and does not invent unsupported labels', () => {
  const text = formatWord({ paragraphs: 2, tables: 1, table: 1, cells: [['text']], footnotes: [{ i: 1, label: null, numberStyle: 52, para: 1, offset: 1, page: 1, section: 1, text: 'Full note.' }] })
  expect(text).toContain('Table 1 (1 rows):\n1: text')
  expect(text).toContain('footnote 1 [display unavailable, number style 52;')
})

describe.skipIf(process.platform !== 'win32')('native helper footnote parser', () => {
  it('parses real helper syntax, escaped delimiters and rejects invalid input before COM', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-note-parser-'))
    try {
      const source = join(dir, 'ParserTests.cs'), exe = join(dir, 'tests.exe')
      writeFileSync(source, String.raw`
using System;
using System.Collections;
using System.Reflection;
class ParserTests {
 static object Parse(string value) { return typeof(Program).GetMethod("ParseNotes",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,new object[]{value}); }
 static void Count(string value, int expected) { if (((IList)Parse(value)).Count!=expected) throw new Exception(value); }
 static void Bad(string value) { try { Parse(value); } catch(TargetInvocationException e) { if(e.InnerException is Fail) return; throw; } throw new Exception("accepted invalid: "+value); }
 public static void Main() {
  Count(@"甲[fn:完整引注]乙\footnote{Source $\frac{a}{b}$}",2);
  Count(@"[fn:Source [2026] p.1]",1);
  Count(@"\[fn:literal] \\footnote{literal}",0);
  Count(@"\footnote{escaped \} brace}",1);
  Count(@"[fn:escaped \] bracket]",1);
  Bad(@"[fn:unclosed"); Bad(@"\footnote{unclosed"); Bad(@"[fn:]"); Bad(@"[fn:outer[fn:inner]]"); Bad(@"\footnote{outer\footnote{inner}}");
  var note=((IList)Parse(@"abc\footnote{body}"))[0];
  if((int)note.GetType().GetField("Start").GetValue(note)!=3 || (string)note.GetType().GetField("Text").GetValue(note)!="body") throw new Exception("positions");
  Console.WriteLine("PASS native parser");
 }
}`)
      const csc = join(process.env.SystemRoot ?? 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
      execFileSync(csc, ['-nologo', '-main:ParserTests', '-target:exe', `-out:${exe}`, ...['System', 'System.Core', 'Microsoft.CSharp', 'System.Drawing', 'System.Windows.Forms', 'System.Web.Extensions'].map(r => `-r:${r}.dll`), resolve('helper/OfficeHelper.cs'), source])
      expect(execFileSync(exe, { encoding: 'utf8' })).toContain('PASS native parser')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }, 30000)
})
