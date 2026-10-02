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

  test(`${f} exercise: solution passes, starter does not`, () => {
    const [t] = parseContent(readFileSync(join(dir, f), 'utf8')).topics;
    const sol = runChecks(t.exercise, t.exercise.solution);
    assert.ok(sol.every((r) => r.ok), 'failing: ' + sol.filter((r) => !r.ok).map((r) => r.label).join(', '));
    assert.ok(!runChecks(t.exercise, t.exercise.starter || '').every((r) => r.ok));
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
