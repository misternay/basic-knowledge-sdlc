#!/usr/bin/env node
// Validates every file in content/topics (or the paths given) with the same
// rules the import page uses, in strict mode. Exits 1 on any error.
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseContent } from '../src/lib/validate.js';

const root = new URL('..', import.meta.url).pathname;
const dir = join(root, 'content', 'topics');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dir).filter((f) => /\.(json|md)$/.test(f)).map((f) => join(dir, f));

let errorCount = 0;
let warnCount = 0;
const ids = new Map();
const codes = new Map();

for (const file of files) {
  const name = basename(file);
  const r = parseContent(readFileSync(file, 'utf8'), { strict: true, label: name });
  for (const e of r.errors) { console.error('✗ ' + e.where + ': ' + e.msg); errorCount++; }
  for (const w of r.warnings) { console.warn('! ' + w.where + ': ' + w.msg); warnCount++; }
  for (const t of r.topics) {
    if (!t || !t.id) continue;
    if (name.replace(/\.(json|md)$/, '') !== t.id) { console.error('✗ ' + name + ': ชื่อไฟล์ต้องตรงกับ id “' + t.id + '”'); errorCount++; }
    if (ids.has(t.id)) { console.error('✗ ' + name + ': id “' + t.id + '” ซ้ำกับ ' + ids.get(t.id)); errorCount++; }
    ids.set(t.id, name);
    if (t.code) {
      if (codes.has(t.code)) { console.error('✗ ' + name + ': code “' + t.code + '” ซ้ำกับ ' + codes.get(t.code)); errorCount++; }
      codes.set(t.code, name);
    }
  }
}

console.log(`\nตรวจ ${files.length} ไฟล์ · error ${errorCount} · warning ${warnCount}`);
process.exit(errorCount ? 1 : 0);
