import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codeSkeleton, parityDiff, thaiLeaks } from '../src/lib/parity.js';

const topic = (code, solution) => ({
  id: 'demo', code: 'F9', track: 'foundations',
  mustKnow: [{ tier: 'must', title: 't', body: 'b', code }],
  questions: [{ prompt: 'p', options: ['a', 'b', 'c', 'd'], answer: 2, explain: 'e' }],
  exercises: [{ title: 'x', level: 'ง่าย', lang: 'javascript', prompt: 'p', starter: '', solution, hints: ['h', 'h'], checks: [{ label: 'l', pattern: 'x' }] }],
  refs: [{ title: 'r', url: 'https://example.com' }],
});

test('translated comments and string literals do not break parity', () => {
  const th = topic('const n = 1; // นับ\nconst s = "สวัสดี";', '/* เฉลย */\nreturn total; // รวม');
  const en = topic('const n = 1; // count\nconst s = "hello";', '/* solution */\nreturn total; // sum');
  assert.deepEqual(parityDiff(th, en), []);
});

test('a real code change is detected as a parity break', () => {
  const th = topic('const n = 1;', 'return total;');
  const en = topic('const n = 2;', 'return total;');
  assert.deepEqual(parityDiff(th, en), ['mustKnow[0].code']);
  assert.deepEqual(parityDiff(topic('x', 'return total;'), topic('x', 'return sum;')), ['exercises[0].solution']);
});

test('prose written in a code box (Thai outside comments and strings) may be translated freely', () => {
  const th = topic('fix(cart): ปัดเศษก่อนรวมยอด\n\nCloses #482', 'return total;');
  const en = topic('fix(cart): round before totaling\n\nCloses #482', 'return total;');
  assert.deepEqual(parityDiff(th, en), []);
});

test('skeleton respects comment styles per language and keeps URLs', () => {
  assert.equal(codeSkeleton('SELECT 1; -- หมายเหตุ', 'sql'), codeSkeleton('SELECT 1; -- note', 'sql'));
  assert.equal(codeSkeleton('echo hi # ทดสอบ', 'shell'), codeSkeleton('echo hi # test', 'shell'));
  assert.equal(codeSkeleton('{"description": "ค้นหา"}', 'json'), codeSkeleton('{"description": "search"}', 'json'));
  assert.equal(codeSkeleton('# สรุป\nข้อความ', 'markdown'), codeSkeleton('# Summary\ntext', 'markdown'));
  assert.notEqual(codeSkeleton('fetch("https://a.example/x")'), codeSkeleton('fetch("https://a.example/x"); run()'));
  assert.equal(codeSkeleton('const u = "https://a.example/x" // ลิงก์'), codeSkeleton('const u = "https://b.example/y" // link'));
});

test('thaiLeaks reports every English field that still holds Thai, including code and solutions', () => {
  const en = topic('const n = 1; // นับ', 'return total;');
  en.exercises[0].starter = 'เริ่มต้น';
  assert.deepEqual(thaiLeaks(en), ['mustKnow[0].code', 'exercises[0].starter']);
  assert.deepEqual(thaiLeaks(topic('const n = 1;', 'return total;')), []);
});

test('a Thai string literal kept verbatim from the Thai source code is allowed; an untranslated one is not', () => {
  const th = topic("const s = 'ก็'; // นับ grapheme", 'return total;');
  const en = topic("const s = 'ก็'; // count graphemes", 'return total;');
  assert.deepEqual(thaiLeaks(en, th), []);
  const untranslated = topic("const msg = 'สวัสดี'; // greet", 'return total;');
  assert.deepEqual(thaiLeaks(untranslated, topic("const msg = 'ยินดีต้อนรับ';", 'return total;')), ['mustKnow[0].code']);
});
