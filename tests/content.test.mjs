import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseContent, validateTopic } from '../src/lib/validate.js';
import { runChecks } from '../src/lib/checks.js';
import { parseMarkdown } from '../src/lib/markdown.js';

const dir = new URL('../content/topics/', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => /\.(json|md)$/.test(f));

test('there are 14 topic files', () => {
  assert.equal(files.length, 14);
});

for (const f of files) {
  test(`${f} passes strict validation`, () => {
    const parsed = parseContent(readFileSync(join(dir, f), 'utf8'), { strict: true });
    assert.ok(parsed, 'parse returned null');
    assert.deepEqual(parsed.errors, []);
    const [t] = parsed.topics;
    assert.equal(t.id + f.slice(f.lastIndexOf('.')), f);
    assert.deepEqual(validateTopic(t, { strict: true }).errors, []);
  });

  test(`${f} meets the content quotas`, () => {
    const [t] = parseContent(readFileSync(join(dir, f), 'utf8')).topics;
    assert.ok(t.mustKnow.length >= 24, 'mustKnow ' + t.mustKnow.length);
    assert.ok(t.questions.length >= 30, 'questions ' + t.questions.length);
    assert.ok((t.exercises || []).length >= 3, 'exercises');
    assert.deepEqual([...new Set(t.exercises.map((e) => e.level))].sort(), ['กลาง', 'ง่าย', 'ยาก']);
    assert.ok((t.refs || []).length >= 4, 'refs');
    assert.ok(t.mustKnow.filter((m) => m.ref).length >= 12, 'mustKnow with ref');
    assert.ok(t.mustKnow.filter((m) => m.exam === true).length >= 5, 'exam flags');
    for (const q of t.questions) assert.equal(q.options.length, 4, 'question needs 4 options: ' + q.prompt.slice(0, 40));
  });

  test(`${f} exercises: each solution passes, each starter does not`, () => {
    const [t] = parseContent(readFileSync(join(dir, f), 'utf8')).topics;
    const list = t.exercises || [t.exercise];
    assert.ok(list.length >= 1 && list.every(Boolean), 'no exercises');
    for (const ex of list) {
      const sol = runChecks(ex, ex.solution);
      assert.ok(sol.every((r) => r.ok), ex.title + ' failing: ' + sol.filter((r) => !r.ok).map((r) => r.label).join(', '));
      assert.ok(!runChecks(ex, ex.starter || '').every((r) => r.ok), ex.title + ' starter passes everything');
    }
  });
}

test('Markdown import: sections, one-liners, quiz', () => {
  const md = `---
id: k8s
title: Kubernetes
track: delivery
blurb: test
---
## ต้องรู้
### Pod
หน่วยเล็กที่สุด

## ควรรู้
- Service :: ที่อยู่คงที่

## Quiz
### ถามอะไร?
- [ ] ผิด
- [x] ถูก
- [ ] ผิด
> เพราะถูก
`;
  const r = parseMarkdown(md);
  assert.deepEqual(r.errors, []);
  const t = r.topics[0];
  assert.equal(t.mustKnow.length, 2);
  assert.equal(t.mustKnow[1].title, 'Service');
  assert.equal(t.questions[0].answer, 1);
  assert.equal(t.questions[0].explain, 'เพราะถูก');
});

test('Markdown import: question without exactly one [x] is an error', () => {
  const r = parseMarkdown('---\nid: a\ntitle: A\ntrack: ai\n---\n## Quiz\n### Q?\n- [ ] a\n- [ ] b\n');
  assert.ok(r.errors.length > 0);
});

test('bad JSON reports an error instead of throwing', () => {
  const r = parseContent('{ "id": "x", ');
  assert.ok(r.errors.length > 0);
});
