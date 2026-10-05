import test from 'node:test';
import assert from 'node:assert/strict';
import { drawExamQuestions, makeItem, QuestionDeck } from '../src/lib/random.js';

const stableRandom = () => 0;
const keys = (items) => items.map(([topic, qi]) => topic.id + ':' + qi);
const topic = (id, count) => ({ id, questions: Array.from({ length: count }, (_, i) => ({ options: ['wrong', 'right', 'other'], answer: 1, prompt: id + i })) });

test('three consecutive draws cover a 30-question pool without repeats', () => {
  const deck = new QuestionDeck(stableRandom);
  const pool = Array.from({ length: 30 }, (_, i) => i);
  const draws = Array.from({ length: 3 }, () => deck.draw('all', pool, 10));
  for (const draw of draws) assert.equal(new Set(draw).size, 10);
  assert.equal(new Set(draws.flat()).size, 30);
});

test('a draw uses each available question once before reusing the pool', () => {
  const deck = new QuestionDeck(stableRandom);
  assert.deepEqual(deck.draw('small', ['a', 'b', 'c'], 10).sort(), ['a', 'b', 'c']);
  const next = deck.draw('small', ['a', 'b', 'c'], 10);
  assert.equal(next.length, 3);
  assert.equal(new Set(next).size, 3);
});

test('partial draws across a cycle defer skipped keys and keep unused keys available', () => {
  let calls = 0;
  const deck = new QuestionDeck(() => calls++ < 11 ? 0 : 0.999);
  const pool = Array.from({ length: 12 }, (_, i) => i);
  const first = deck.draw('boundary', pool, 10);
  const second = deck.draw('boundary', pool, 10);
  const third = deck.draw('boundary', pool, 10);
  assert.equal(new Set(first).size, 10);
  assert.equal(new Set(second).size, 10);
  assert.ok(third.includes(0), 'a key skipped because it was selected earlier remains pending');
  assert.ok(third.includes(9) && third.includes(10) && third.includes(11), 'unconsumed keys from the cycle remain available');
});

test('same stable keys refresh to current localized or replacement question objects', () => {
  const deck = new QuestionDeck(stableRandom);
  deck.draw('localized', [{ id: 'a', text: 'old a' }, { id: 'b', text: 'old b' }], 1, (item) => item.id);
  const updated = deck.draw('localized', [{ id: 'a', text: 'new a' }, { id: 'b', text: 'new b' }], 2, (item) => item.id);
  assert.ok(updated.every((item) => item.text.startsWith('new ')));
});

test('duplicate stable keys are bounded to unique candidates', () => {
  const deck = new QuestionDeck(stableRandom);
  const picked = deck.draw('duplicates', [{ id: 'a', n: 1 }, { id: 'a', n: 2 }, { id: 'b', n: 3 }], 5, (item) => item.id);
  assert.equal(picked.length, 2);
  assert.equal(new Set(picked.map((item) => item.id)).size, 2);
});

test('filtered pools keep independent decks', () => {
  const deck = new QuestionDeck(stableRandom);
  const all = ['a', 'b', 'c', 'd'];
  const filtered = ['a', 'b'];
  assert.deepEqual(deck.draw('practice:all', all, 2), ['b', 'c']);
  assert.deepEqual(deck.draw('practice:selected', filtered, 2), ['b', 'a']);
  assert.deepEqual(deck.draw('practice:selected', filtered, 2), ['b', 'a']);
});

test('per-topic exams respect quotas and global exams preserve round-robin balance', () => {
  const a = topic('a', 8);
  const b = topic('b', 8);
  const c = topic('c', 8);
  const perTopic = { id: 'each', topicIds: ['a', 'b', 'c'], pick: { perTopic: 2 }, total: 6 };
  const balanced = { id: 'global', topicIds: ['a', 'b', 'c'], pick: {}, total: 8 };
  const deck = new QuestionDeck(stableRandom);
  const first = drawExamQuestions(perTopic, [a, b, c], deck);
  assert.deepEqual(first.reduce((counts, [t]) => ({ ...counts, [t.id]: (counts[t.id] || 0) + 1 }), {}), { a: 2, b: 2, c: 2 });
  assert.equal(new Set(keys(first)).size, 6);
  const second = drawExamQuestions(balanced, [a, b, c], deck);
  const counts = second.reduce((result, [t]) => ({ ...result, [t.id]: (result[t.id] || 0) + 1 }), {});
  assert.deepEqual(counts, { a: 3, b: 3, c: 2 });
  assert.equal(new Set(keys(second)).size, 8);
});

test('question option order still maps displayed correct answer to its source index', () => {
  const t = topic('sample', 1);
  const item = makeItem(t, 0);
  assert.deepEqual([...item.order].sort(), [0, 1, 2]);
  const displayed = item.order.map((index) => item.q.options[index]);
  assert.equal(item.order[displayed.indexOf('right')], item.q.answer);
});
