// Locale parity rules shared by scripts/check-content.mjs and tests/i18n.test.mjs.
// Thai is the source of truth. Prose fields are translated freely; machine fields must
// match. Code, exercise starters and solutions may differ between locales only in
// comments and string literals (translated), so they are compared by "skeleton".

const COMMENT_LANGS = {
  javascript: ['slash', 'block'], typescript: ['slash', 'block'], json: ['slash', 'block'],
  sql: ['dash'], shell: ['hash'], yaml: ['hash'], dockerfile: ['hash'], python: ['hash'],
};

// Remove comments (by language, or every style when the language is unknown) and blank
// out string literals, then collapse whitespace. Markdown is prose: fully translatable.
export function codeSkeleton(text, lang = '') {
  if (text === null || text === undefined) return null;
  const l = String(lang || '').toLowerCase();
  if (l === 'markdown') return '';
  let s = String(text);
  const styles = COMMENT_LANGS[l] || ['slash', 'block', 'dash', 'hash'];
  if (styles.includes('block')) s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (styles.includes('slash')) s = s.replace(/(^|[^:\\])\/\/.*$/gm, '$1');
  if (styles.includes('dash')) s = s.replace(/--.*$/gm, '');
  if (styles.includes('hash')) s = s.replace(/(^|\s)#.*$/gm, '$1');
  s = s.replace(/"(?:\\.|[^"\\\n])*"/g, '""').replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/`(?:\\.|[^`\\])*`/g, '``');
  return s.replace(/\s+/g, ' ').trim();
}

const exercisesOf = (topic) => topic.exercises || (topic.exercise ? [topic.exercise] : []);

// Fields that must be identical (after skeleton normalisation of code) across locales.
export function machineFields(topic) {
  return {
    id: topic.id,
    code: topic.code ?? null,
    track: topic.track,
    mustKnow: (topic.mustKnow || []).map(({ tier, exam, ref, code }) => ({ tier: tier ?? null, exam: exam ?? null, ref: ref ?? null, code: codeSkeleton(code) })),
    questions: (topic.questions || []).map(({ answer, options, code }) => ({ answer, optionsCount: options?.length ?? 0, code: codeSkeleton(code) })),
    exercises: exercisesOf(topic).map(({ level, lang, starter, solution, hints, checks }) => ({
      level, lang, starter: codeSkeleton(starter, lang), solution: codeSkeleton(solution, lang), hintsCount: hints?.length ?? 0,
      checks: (checks || []).map(({ pattern, negate, json }) => ({ pattern: pattern ?? null, negate: negate ?? null, json: json ?? null })),
    })),
    refs: (topic.refs || []).map(({ url }) => url),
    cheatsheetCount: (topic.cheatsheet || []).length,
  };
}

// Code blocks whose Thai source still has Thai outside comments and string literals are
// prose written in a code box (commit messages, user stories, prompts, route tables): they
// are translated freely, so only blocks that are real code are compared by skeleton.
const PROSE = /[฀-๿]/u;
function relaxProse(thaiFields, otherFields) {
  const pairs = [
    ...thaiFields.mustKnow.map((m, i) => [m, otherFields.mustKnow[i], 'code']),
    ...thaiFields.questions.map((q, i) => [q, otherFields.questions[i], 'code']),
    ...thaiFields.exercises.flatMap((e, i) => [[e, otherFields.exercises[i], 'starter'], [e, otherFields.exercises[i], 'solution']]),
  ];
  for (const [th, other, key] of pairs) {
    if (th && other && typeof th[key] === 'string' && PROSE.test(th[key])) { th[key] = 'prose'; other[key] = 'prose'; }
  }
}

// Paths (e.g. "exercises[1].solution") where the machine fields of the Thai source `a` and
// its translation `b` differ.
export function parityDiff(a, b) {
  const out = [];
  const fa = machineFields(a);
  const fb = machineFields(b);
  relaxProse(fa, fb);
  const walk = (x, y, path) => {
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (Array.isArray(x) && Array.isArray(y) && x.length === y.length) x.forEach((v, i) => walk(v, y[i], `${path}[${i}]`));
    else if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x) && !Array.isArray(y) && JSON.stringify(Object.keys(x)) === JSON.stringify(Object.keys(y))) {
      for (const k of Object.keys(x)) walk(x[k], y[k], path ? `${path}.${k}` : k);
    } else out.push(path || '(root)');
  };
  walk(fa, fb, '');
  return out;
}

const THAI = /[฀-๿]/u;

const LITERALS = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g;

// In code, a Thai string literal that appears verbatim in the Thai source's same field is a
// deliberate example (e.g. counting Thai graphemes), not an untranslated leftover.
function withoutSharedLiterals(value, sourceValue) {
  if (typeof value !== 'string' || typeof sourceValue !== 'string') return value;
  const shared = new Set((sourceValue.match(LITERALS) || []).filter((lit) => THAI.test(lit)));
  return value.replace(LITERALS, (lit) => (shared.has(lit) ? '""' : lit));
}

// Paths of English fields that still contain Thai characters. Pass the Thai source topic to
// allow Thai string literals that are intentionally identical in both locales' code.
export function thaiLeaks(topic, source = null) {
  const out = [];
  const check = (value, path) => { if (typeof value === 'string' && THAI.test(value)) out.push(path); };
  const checkCode = (value, sourceValue, path) => check(withoutSharedLiterals(value, sourceValue), path);
  const srcMk = source?.mustKnow || [];
  const srcQs = source?.questions || [];
  const srcEx = source ? exercisesOf(source) : [];
  check(topic.title, 'title'); check(topic.blurb, 'blurb');
  (topic.mustKnow || []).forEach((m, i) => { check(m.title, `mustKnow[${i}].title`); check(m.body, `mustKnow[${i}].body`); checkCode(m.code, srcMk[i]?.code, `mustKnow[${i}].code`); });
  (topic.questions || []).forEach((q, i) => {
    check(q.prompt, `questions[${i}].prompt`); check(q.explain, `questions[${i}].explain`); checkCode(q.code, srcQs[i]?.code, `questions[${i}].code`);
    (q.options || []).forEach((o, j) => check(o, `questions[${i}].options[${j}]`));
  });
  exercisesOf(topic).forEach((e, i) => {
    for (const f of ['title', 'prompt', 'context', 'tags']) check(e[f], `exercises[${i}].${f}`);
    for (const f of ['starter', 'solution']) checkCode(e[f], srcEx[i]?.[f], `exercises[${i}].${f}`);
    (e.hints || []).forEach((h, j) => check(h, `exercises[${i}].hints[${j}]`));
    (e.checks || []).forEach((c, j) => check(c.label, `exercises[${i}].checks[${j}].label`));
  });
  (topic.refs || []).forEach((r, i) => { check(r.title, `refs[${i}].title`); check(r.note, `refs[${i}].note`); });
  (topic.cheatsheet || []).forEach((line, i) => check(line, `cheatsheet[${i}]`));
  return out;
}
