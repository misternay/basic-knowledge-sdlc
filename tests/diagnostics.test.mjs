import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContent } from '../src/lib/validate.js';

const hasThai = (value) => /[\u0E00-\u0E7F]/.test(value);

test('invalid JSON diagnostics are localized while Thai remains the default', () => {
  const english = parseContent('{bad', { language: 'en' });
  const thai = parseContent('{bad');

  assert.deepEqual(english.errors, [{
    where: 'JSON',
    msg: "Could not parse JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
  }]);
  assert.deepEqual(english.warnings, []);
  assert.deepEqual(thai.errors, [{
    where: 'JSON',
    msg: "อ่าน JSON ไม่ได้: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
  }]);
  assert.ok(english.errors.every(({ where, msg }) => !hasThai(where + msg)));
});

test('invalid Markdown diagnostics localize messages and line labels', () => {
  const source = '## Mystery\n### orphan\ntext\n';
  const english = parseContent(source, { language: 'en' });
  const thai = parseContent(source);

  assert.deepEqual(english.errors, [
    { where: 'Topic 1 · id', msg: 'Missing id' },
    { where: 'Topic 1 · title', msg: 'Missing title' },
    { where: 'Topic 1 · track', msg: 'Invalid track “”; use foundations, data, delivery, ai' },
    { where: 'Topic 1 · mustKnow', msg: 'Add at least one must-know item' },
  ]);
  assert.deepEqual(english.warnings, [
    { where: 'Line 1', msg: 'Unknown heading “## Mystery”; content under it will be skipped' },
    { where: 'Line 2', msg: 'This subsection is not under ## must / ## should / ## advanced / ## Quiz' },
    { where: 'Topic 1', msg: 'No questions; this topic will not have a quiz section' },
  ]);
  assert.equal(thai.errors[0].where, 'หัวข้อที่ 1 · id');
  assert.equal(thai.errors[0].msg, 'ต้องมี id');
  assert.equal(thai.warnings[0].where, 'บรรทัด 1');
  assert.equal(thai.warnings[0].msg, 'ไม่รู้จักหัวข้อ “## Mystery” เนื้อหาใต้หัวข้อนี้จะถูกข้าม');
  assert.ok([...english.errors, ...english.warnings].every(({ where, msg }) => !hasThai(where + msg)));
});

test('duplicate IDs report in English and Thai', () => {
  const source = JSON.stringify([
    { id: 'same', title: 'First', track: 'ai', mustKnow: [] },
    { id: 'same', title: 'Second', track: 'ai', mustKnow: [] },
  ]);
  const english = parseContent(source, { language: 'en' });
  const thai = parseContent(source);

  assert.deepEqual(english.errors, [
    { where: 'Topic 1 · mustKnow', msg: 'Add at least one must-know item' },
    { where: 'Topic 2 · mustKnow', msg: 'Add at least one must-know item' },
    { where: 'Topic 2', msg: 'Duplicate id “same”' },
  ]);
  assert.deepEqual(english.warnings, [
    { where: 'Topic 1', msg: 'No questions; this topic will not have a quiz section' },
    { where: 'Topic 2', msg: 'No questions; this topic will not have a quiz section' },
  ]);
  assert.equal(thai.errors.at(-1).where, 'หัวข้อที่ 2');
  assert.equal(thai.errors.at(-1).msg, 'id “same” ซ้ำ');
  assert.ok([...english.errors, ...english.warnings].every(({ where, msg }) => !hasThai(where + msg)));
});

test('English Markdown headers populate all tiers and quiz without diagnostics', () => {
  const source = `---
id: sample
title: Example
track: ai
---
## must
### Required
A detail.
## should
### Recommended
A detail.
## advanced
### Advanced topic
A detail.
## Quiz
### Question?
- [x] Correct
- [ ] Wrong
> Explanation
`;
  const result = parseContent(source, { language: 'en' });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.topics[0].mustKnow.map(({ tier }) => tier), ['must', 'should', 'advanced']);
  assert.equal(result.topics[0].questions[0].answer, 0);
  assert.equal(result.topics[0].questions[0].explain, 'Explanation');
});
