import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { guide, routeTopics, topicGuide } from '../src/lib/learning-guide.js';

const topicDir = new URL('../content/topics/', import.meta.url);
const topics = readdirSync(topicDir).filter((file) => file.endsWith('.json')).map((file) => JSON.parse(readFileSync(new URL(file, topicDir), 'utf8')));
const byId = new Map(topics.map((topic) => [topic.id, topic]));

function bilingual(value, where) {
  assert.deepEqual(Object.keys(value).sort(), ['en', 'th'], where + ' has both locales');
  for (const language of ['th', 'en']) {
    for (const text of Array.isArray(value[language]) ? value[language] : [value[language]]) {
      assert.equal(typeof text, 'string', where);
      assert.ok(text.trim(), where + ' is not empty');
      if (language === 'en') assert.ok(!/[\u0E00-\u0E7F]/u.test(text), where + ' English has no untranslated Thai');
    }
  }
  if (Array.isArray(value.th)) assert.equal(value.th.length, value.en.length, where + ' locale counts match');
}

test('learning guidance covers every published topic with bilingual readiness and outcomes', () => {
  assert.deepEqual(Object.keys(guide.topics).sort(), [...byId.keys()].sort());
  for (const [id, entry] of Object.entries(guide.topics)) {
    bilingual(entry.readiness, id + '.readiness');
    bilingual(entry.outcomes, id + '.outcomes');
    assert.ok(entry.outcomes.en.length >= 2, id + ' has concrete outcomes');
  }
});

test('recommended order includes each topic once and puts all prerequisites first', () => {
  assert.deepEqual([...guide.route].sort(), [...byId.keys()].sort());
  assert.equal(new Set(guide.route).size, guide.route.length);
  for (const [id, entry] of Object.entries(guide.topics)) {
    assert.equal(new Set(entry.prerequisites).size, entry.prerequisites.length, id + ' has no duplicate prerequisites');
    for (const prerequisite of entry.prerequisites) {
      assert.ok(byId.has(prerequisite), id + ' prerequisite exists');
      assert.ok(guide.route.indexOf(prerequisite) < guide.route.indexOf(id), id + ' prerequisite comes first');
    }
  }
});

test('first-reading shortcuts point to three distinct concepts with matching tiers in both locales', () => {
  for (const [id, entry] of Object.entries(guide.topics)) {
    assert.equal(entry.firstRead.length, 3, id);
    assert.equal(new Set(entry.firstRead).size, 3, id);
    const english = JSON.parse(readFileSync(new URL('../content/en/topics/' + id + '.json', import.meta.url), 'utf8'));
    for (const i of entry.firstRead) {
      assert.ok(Number.isInteger(i) && i >= 0 && i < byId.get(id).mustKnow.length, id + ' reading index is valid');
      assert.equal(english.mustKnow[i].tier, byId.get(id).mustKnow[i].tier, id + ' English reading target matches');
    }
  }
});

test('imports, including replacements with built-in IDs, never inherit published guidance', () => {
  assert.equal(topicGuide({ id: 'sql', temp: true }), null);
  assert.equal(topicGuide({ id: 'my-notes', temp: true }), null);
  assert.equal(topicGuide({ id: 'my-notes' }), null);
  assert.equal(topicGuide(null), null);
  assert.equal(topicGuide({ id: 'sql' }), guide.topics.sql);
  assert.deepEqual(routeTopics([{ id: 'sql', temp: true }, { id: 'git' }, { id: 'my-notes', temp: true }, { id: 'prog' }]).map((topic) => topic.id), ['prog', 'git']);
  assert.deepEqual(routeTopics([]), []);
});

test('capstone supplies a bilingual manual evidence criterion for each contributing skill', () => {
  const capstone = guide.capstone;
  bilingual(capstone.title, 'capstone.title');
  bilingual(capstone.brief, 'capstone.brief');
  bilingual(capstone.deliverables, 'capstone.deliverables');
  assert.deepEqual(capstone.rubric.map((row) => row.topic).sort(), [...capstone.topics].sort());
  for (const row of capstone.rubric) {
    assert.ok(byId.has(row.topic));
    bilingual(row.criterion, row.topic + '.criterion');
    bilingual(row.evidence, row.topic + '.evidence');
  }
});
