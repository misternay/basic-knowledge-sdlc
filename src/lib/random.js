export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class QuestionDeck {
  constructor(random = Math.random) {
    this.random = random;
    this.pools = new Map();
  }

  draw(poolId, items, count, key = (item) => item) {
    const currentItems = new Map(items.map((item) => [key(item), item]));
    const keys = [...currentItems.keys()];
    const signature = JSON.stringify(keys);
    let deck = this.pools.get(poolId);
    if (!deck || deck.signature !== signature) {
      deck = { signature, items: currentItems, order: [], cursor: 0 };
      this.pools.set(poolId, deck);
    }
    deck.items = currentItems;
    const take = Math.min(Math.max(0, Math.floor(count)), keys.length);
    const selected = [];
    const seen = new Set();
    const deferred = [];
    while (selected.length < take) {
      if (deck.cursor >= deck.order.length) {
        deck.order = shuffleWith(keys, this.random);
        deck.cursor = 0;
      }
      const nextKey = deck.order[deck.cursor++];
      if (!seen.has(nextKey)) {
        selected.push(deck.items.get(nextKey));
        seen.add(nextKey);
      } else {
        deferred.push(nextKey);
      }
    }
    if (deferred.length) deck.order.splice(deck.cursor, 0, ...deferred);
    return selected;
  }
}

function shuffleWith(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const questionDeck = new QuestionDeck();

export function drawExamQuestions(def, topics, deck = questionDeck) {
  const scoped = topics.filter((topic) => def.topicIds.includes(topic.id));
  const candidates = (topic) => topic.questions.map((_, qi) => [topic, qi]);
  const key = ([topic, qi]) => topic.id + ':' + qi;
  if (def.pick.perTopic) {
    return scoped.flatMap((topic) => deck.draw(`exam:${def.id}:${topic.id}`, candidates(topic), def.pick.perTopic, key));
  }
  const quotas = scoped.map(() => 0);
  let remaining = def.total;
  while (remaining > 0) {
    let added = false;
    for (let i = 0; i < scoped.length && remaining > 0; i++) {
      if (quotas[i] < scoped[i].questions.length) {
        quotas[i]++;
        remaining--;
        added = true;
      }
    }
    if (!added) break;
  }
  const queues = scoped.map((topic, i) => deck.draw(`exam:${def.id}:${topic.id}`, candidates(topic), quotas[i], key));
  const picks = [];
  for (let round = 0; round < Math.max(...queues.map((queue) => queue.length), 0); round++) {
    for (const queue of queues) if (queue[round]) picks.push(queue[round]);
  }
  return picks;
}

// A question ready to show: the topic, the question and a shuffled option order.
export function makeItem(topic, qi) {
  const q = topic.questions[qi];
  return { topic, q, qi, order: shuffle(q.options.map((_, j) => j)) };
}

export const LETTERS = 'ABCDEF';
