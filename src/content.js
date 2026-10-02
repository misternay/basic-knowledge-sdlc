// Loads every topic file from content/topics at build time and normalises it
// for the UI. Topics added on the Import page are merged in at runtime.
import { parseContent, trackIndex, tierIndex } from './lib/validate.js';
import TRACKS from '../content/tracks.json';
import EXAMS from '../content/exams.json';

const files = import.meta.glob('../content/topics/*.{json,md}', { query: '?raw', import: 'default', eager: true });

export { TRACKS, EXAMS };

const codeNum = (code) => parseInt(String(code || '').replace(/\D/g, ''), 10) || 999;

export function normalize(raw, extra = {}) {
  const tr = trackIndex(raw.track);
  if (tr < 0 || !raw.id) return null;
  return {
    id: raw.id,
    code: raw.code || null,
    tr,
    title: raw.title || raw.id,
    blurb: raw.blurb || '',
    mustKnow: (raw.mustKnow || []).map((m) => ({ tier: tierIndex(m.tier), title: m.title, body: m.body || '', code: m.code || null })),
    questions: (raw.questions || []).map((q) => ({ prompt: q.prompt, code: q.code || null, options: q.options, answer: q.answer, explain: q.explain || '' })),
    exercise: raw.exercise || null,
    ...extra,
  };
}

const sortTopics = (list) => list.slice().sort((a, b) => a.tr - b.tr || codeNum(a.code) - codeNum(b.code));

export const BUILTIN = sortTopics(
  Object.values(files)
    .flatMap((text) => (parseContent(text) || { topics: [] }).topics)
    .map((t) => normalize(t))
    .filter(Boolean),
);

// Temporary topics from the Import page replace built-in ones with the same id.
export function mergeTopics(custom) {
  if (!custom.length) return BUILTIN;
  const byId = new Map(custom.map((c) => [c.id, normalize(c, { temp: true })]).filter(([, t]) => t));
  const out = BUILTIN.map((t) => {
    const c = byId.get(t.id);
    if (!c) return t;
    byId.delete(t.id);
    return { ...t, ...c, code: c.code || t.code, mustKnow: c.mustKnow.length ? c.mustKnow : t.mustKnow, questions: c.questions.length ? c.questions : t.questions, exercise: c.exercise || t.exercise };
  });
  for (const t of byId.values()) {
    if (!t.code) t.code = 'FDOA'[t.tr] + (out.filter((x) => x.tr === t.tr).length + 1);
    out.push(t);
  }
  return sortTopics(out);
}
