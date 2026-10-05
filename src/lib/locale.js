export const LANGUAGES = ['th', 'en'];
export const LANGUAGE_KEY = 'dev-trail-language';

export function initialLanguage(storage) {
  try {
    const saved = (storage === undefined ? globalThis.localStorage : storage)?.getItem(LANGUAGE_KEY);
    return LANGUAGES.includes(saved) ? saved : 'th';
  } catch {
    return 'th';
  }
}

// Match by stable topic/question indices so switching language keeps answers
// and the shuffled option order intact.
export function localizeItem(item, topics) {
  const topic = topics.find((t) => t.id === item.topic.id);
  // Imports are snapshots in their author's language. A later import with
  // the same id must not replace questions in an already running attempt.
  if (item.topic.temp || topic?.temp) return item;
  const qi = item.qi ?? item.topic.questions.indexOf(item.q);
  if (!topic || !topic.questions[qi]) return item;
  return { ...item, qi, topic, q: topic.questions[qi] };
}

export function localizeAttempt(attempt, topics, definitions) {
  if (!attempt) return null;
  const def = definitions.find((d) => d.id === attempt.def.id) || attempt.def;
  return {
    ...attempt,
    def,
    ...(attempt.items && { items: attempt.items.map((item) => localizeItem(item, topics)) }),
    ...(attempt.rows && { rows: attempt.rows.map((row) => ({ ...row, item: localizeItem(row.item, topics) })) }),
  };
}
