// Loads every topic file from content/topics at build time and normalises it
// for the UI. Topics added on the Import page are merged in at runtime.
import { parseContent, trackIndex, tierIndex } from './lib/validate.js';
import TRACKS from '../content/tracks.json';
import EXAMS from '../content/exams.json';
import EN_TRACKS from '../content/en/tracks.json';
import EN_EXAMS from '../content/en/exams.json';

const files = import.meta.glob('../content/topics/*.{json,md}', { query: '?raw', import: 'default', eager: true });

const englishFiles = import.meta.glob('../content/en/topics/*.{json,md}', { query: '?raw', import: 'default', eager: true });

export { TRACKS, EXAMS, EN_TRACKS, EN_EXAMS };

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
    mustKnow: (raw.mustKnow || []).map((m) => ({ tier: tierIndex(m.tier), title: m.title, body: m.body || '', code: m.code || null, exam: m.exam === true, ref: m.ref || null })),
    questions: (raw.questions || []).map((q) => ({ prompt: q.prompt, code: q.code || null, options: q.options, answer: q.answer, explain: q.explain || '' })),
    exercises: Array.isArray(raw.exercises) ? raw.exercises : raw.exercise ? [raw.exercise] : [],
    refs: Array.isArray(raw.refs) ? raw.refs : [],
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

export const EN_BUILTIN = sortTopics(
  Object.values(englishFiles)
    .flatMap((text) => (parseContent(text, { language: 'en' }) || { topics: [] }).topics)
    .map((t) => normalize(t))
    .filter(Boolean),
);

// Temporary topics from the Import page replace built-in ones with the same id.
// User-authored imports keep the language supplied by their author.
export function mergeTopics(custom, language = 'th') {
  const builtin = language === 'en' ? EN_BUILTIN : BUILTIN;
  if (!custom.length) return builtin;
  const byId = new Map(custom.map((c) => [c.id, normalize(c, { temp: true })]).filter(([, t]) => t));
  const out = builtin.map((t) => {
    const c = byId.get(t.id);
    if (!c) return t;
    byId.delete(t.id);
    return { ...t, ...c, code: c.code || t.code, mustKnow: c.mustKnow.length ? c.mustKnow : t.mustKnow, questions: c.questions.length ? c.questions : t.questions, exercises: c.exercises.length ? c.exercises : t.exercises, refs: c.refs.length ? c.refs : t.refs };
  });
  for (const t of byId.values()) {
    if (!t.code) t.code = 'FDOA'[t.tr] + (out.filter((x) => x.tr === t.tr).length + 1);
    out.push(t);
  }
  return sortTopics(out);
}
