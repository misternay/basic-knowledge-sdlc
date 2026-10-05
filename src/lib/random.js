export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A question ready to show: the topic, the question and a shuffled option order.
export function makeItem(topic, qi) {
  const q = topic.questions[qi];
  return { topic, q, qi, order: shuffle(q.options.map((_, j) => j)) };
}

export const LETTERS = 'ABCDEF';
