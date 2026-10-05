import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseContent } from '../src/lib/validate.js';
import { initialLanguage, LANGUAGE_KEY, localizeAttempt, localizeItem } from '../src/lib/locale.js';

const root = new URL('../content/', import.meta.url).pathname;
const thDir = join(root, 'topics');
const enDir = join(root, 'en', 'topics');
const files = (dir) => readdirSync(dir).filter((f) => /\.json$/.test(f)).sort();
const readTopics = (dir) => new Map(files(dir).map((file) => {
  const text = readFileSync(join(dir, file), 'utf8');
  const parsed = parseContent(text, { strict: true, label: file });
  assert.deepEqual(parsed.errors, [], `${file} must pass strict validation`);
  return [parsed.topics[0].id, parsed.topics[0]];
}));

test('English topics are complete and have a strict-valid translation for every Thai topic', () => {
  assert.ok(existsSync(enDir), 'content/en/topics is required for the bilingual feature');
  const th = readTopics(thDir);
  const en = readTopics(enDir);
  assert.deepEqual([...en.keys()].sort(), [...th.keys()].sort(), 'locale topic IDs must match exactly');
});

function contentShape(value) {
  if (Array.isArray(value)) return value.map(contentShape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, contentShape(value[key])]));
  return value === null ? 'null' : typeof value;
}

test('translated topics preserve machine fields, answer keys, counts, and references', () => {
  const th = readTopics(thDir);
  const en = readTopics(enDir);
  const fields = (topic) => ({
    id: topic.id,
    code: topic.code ?? null,
    track: topic.track,
    mustKnow: (topic.mustKnow || []).map(({ tier, exam, ref, code }) => ({ tier: tier ?? null, exam: exam ?? null, ref: ref ?? null, code: code ?? null })),
    questions: (topic.questions || []).map(({ answer, options, code }) => ({ answer, optionsCount: options?.length ?? 0, code: code ?? null })),
    exercises: (topic.exercises || (topic.exercise ? [topic.exercise] : [])).map(({ level, lang, starter, solution, hints, checks }) => ({ level, lang, starter: starter ?? null, solution: solution ?? null, hintsCount: hints?.length ?? 0, checks: (checks || []).map(({ pattern, negate, json }) => ({ pattern: pattern ?? null, negate: negate ?? null, json: json ?? null })) })),
    refs: (topic.refs || []).map(({ url }) => url),
  });
  for (const [id, topic] of th) {
    assert.deepEqual(contentShape(en.get(id)), contentShape(topic), `${id} translation must preserve every field and array entry`);
    assert.deepEqual(fields(en.get(id)), fields(topic), `${id} machine fields differ`);
  }
});

test('English learning text and track/exam labels contain no Thai characters', () => {
  assert.ok(existsSync(enDir), 'content/en/topics is required for the bilingual feature');
  const noThai = (value, where) => assert.ok(typeof value !== 'string' || !/[\u0E00-\u0E7F]/u.test(value), `${where} still contains Thai text`);
  for (const [id, topic] of readTopics(enDir)) {
    noThai(topic.title, `${id}.title`); noThai(topic.blurb, `${id}.blurb`);
    (topic.mustKnow || []).forEach((item, i) => { noThai(item.title, `${id}.mustKnow[${i}].title`); noThai(item.body, `${id}.mustKnow[${i}].body`); });
    (topic.questions || []).forEach((item, i) => {
      noThai(item.prompt, `${id}.questions[${i}].prompt`); noThai(item.explain, `${id}.questions[${i}].explain`);
      (item.options || []).forEach((option, j) => noThai(option, `${id}.questions[${i}].options[${j}]`));
    });
    (topic.exercises || (topic.exercise ? [topic.exercise] : [])).forEach((item, i) => {
      noThai(item.title, `${id}.exercises[${i}].title`); noThai(item.prompt, `${id}.exercises[${i}].prompt`);
      (item.hints || []).forEach((hint, j) => noThai(hint, `${id}.exercises[${i}].hints[${j}]`));
      (item.checks || []).forEach((check, j) => noThai(check.label, `${id}.exercises[${i}].checks[${j}].label`));
    });
    (topic.refs || []).forEach((ref, i) => { noThai(ref.title, `${id}.refs[${i}].title`); noThai(ref.note, `${id}.refs[${i}].note`); });
  }
  for (const [file, fields] of [['tracks.json', ['name', 'th']], ['exams.json', ['title', 'label', 'desc']]]) {
    const path = join(root, 'en', file);
    assert.ok(existsSync(path), `content/en/${file} is required`);
    JSON.parse(readFileSync(path, 'utf8')).forEach((entry, i) => fields.forEach((field) => noThai(entry[field], `${file}[${i}].${field}`)));
  }
});

test('English topic file names match their IDs', () => {
  assert.ok(existsSync(enDir), 'content/en/topics is required for the bilingual feature');
  for (const file of files(enDir)) {
    const topic = JSON.parse(readFileSync(join(enDir, file), 'utf8'));
    assert.equal(file, `${topic.id}.json`);
  }
});

test('initial language uses a valid saved preference and falls back to Thai', () => {
  assert.equal(initialLanguage({ getItem: (key) => key === LANGUAGE_KEY ? 'en' : null }), 'en');
  assert.equal(initialLanguage({ getItem: () => 'fr' }), 'th');
  assert.equal(initialLanguage({ getItem: () => { throw new Error('storage blocked'); } }), 'th');
  assert.equal(initialLanguage(null), 'th');
});

test('initial language falls back safely when browser storage access itself throws', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable'); } });
    assert.equal(initialLanguage(), 'th');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('switching a localized question in either direction preserves answer and option order', () => {
  const paired = [
    { id: 'demo', title: 'ไทย', questions: [{ prompt: 'ถาม', options: ['ก', 'ข'], answer: 1 }] },
    { id: 'demo', title: 'English', questions: [{ prompt: 'Question', options: ['A', 'B'], answer: 1 }] },
  ];
  const original = { topic: paired[0], q: paired[0].questions[0], order: [1, 0], qi: 0, selected: 0 };
  const english = localizeItem(original, [paired[1]]);
  assert.equal(english.topic.title, 'English');
  assert.deepEqual(english.order, [1, 0]);
  assert.equal(english.selected, 0);
  assert.equal(english.q.answer, 1);
  const thai = localizeItem(english, [paired[0]]);
  assert.equal(thai.topic.title, 'ไทย');
  assert.deepEqual(thai.order, [1, 0]);
  assert.equal(thai.selected, 0);
});

test('switching an active or completed attempt preserves user answer data', () => {
  const thTopic = { id: 'demo', title: 'ไทย', questions: [{ prompt: 'ถาม', options: ['ก', 'ข'], answer: 1 }] };
  const enTopic = { id: 'demo', title: 'English', questions: [{ prompt: 'Question', options: ['A', 'B'], answer: 1 }] };
  const defs = [{ id: 'final', title: 'Final exam' }];
  const attempt = {
    def: { id: 'final' }, i: 0, ans: { 0: 0 }, flag: { 0: true },
    items: [{ topic: thTopic, q: thTopic.questions[0], qi: 0, order: [1, 0] }],
    rows: [{ item: { topic: thTopic, q: thTopic.questions[0], qi: 0, order: [1, 0] }, chosen: 0, ok: false, flagged: true }],
  };
  const en = localizeAttempt(attempt, [enTopic], defs);
  assert.equal(en.items[0].topic.title, 'English');
  assert.deepEqual(en.items[0].order, [1, 0]);
  assert.deepEqual(en.ans, { 0: 0 });
  assert.deepEqual(en.flag, { 0: true });
  assert.equal(en.rows[0].chosen, 0);
  const th = localizeAttempt(en, [thTopic], [{ id: 'final', title: 'สอบรวม' }]);
  assert.equal(th.items[0].topic.title, 'ไทย');
  assert.equal(th.def.title, 'สอบรวม');
  assert.deepEqual(th.ans, { 0: 0 });
  assert.equal(localizeAttempt(null, [thTopic], defs), null);
});

test('imports cannot replace a captured exam question during localization', () => {
  const original = { id: 'demo', questions: [{ prompt: 'Original', answer: 0, options: ['a', 'b'] }] };
  const replacement = { id: 'demo', temp: true, questions: [{ prompt: 'Replacement', answer: 1, options: ['c', 'd'] }] };
  const item = { topic: original, q: original.questions[0], qi: 0, order: [1, 0] };
  assert.equal(localizeItem(item, [replacement]), item);
  const importedItem = { topic: replacement, q: replacement.questions[0], qi: 0, order: [0, 1] };
  assert.equal(localizeItem(importedItem, [original]), importedItem);
});
