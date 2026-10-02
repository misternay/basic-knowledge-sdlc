// Topic validation shared by the import page and scripts/check-content.mjs.
// strict = rules for content that lives in the repo (used at build time).
import { parseMarkdown } from './markdown.js';
import { compileCheck, runChecks } from './checks.js';

export const TRACKS = ['foundations', 'data', 'delivery', 'ai'];
export const TIERS = ['must', 'should', 'advanced'];
const LEVELS = ['ง่าย', 'กลาง', 'ยาก'];

export function trackIndex(v) {
  const s = String(v || '').toLowerCase().trim();
  const alias = { f: 0, foundation: 0, d: 1, security: 1, o: 2, ops: 2, a: 3 };
  const i = TRACKS.indexOf(s);
  return i >= 0 ? i : alias[s] ?? -1;
}

export function tierIndex(t) {
  const s = String(t || 'must').toLowerCase();
  if (/should|ควร/.test(s)) return 1;
  if (/adv|ขั้นสูง/.test(s)) return 2;
  return 0;
}

export function validateTopic(t, { strict = false, label = 'หัวข้อ' } = {}) {
  const errors = [];
  const warnings = [];
  const E = (where, msg) => errors.push({ where: label + (where ? ' · ' + where : ''), msg });
  const W = (where, msg) => warnings.push({ where: label + (where ? ' · ' + where : ''), msg });
  if (!t || typeof t !== 'object' || Array.isArray(t)) { E('', 'ต้องเป็น object ของหัวข้อเดียว'); return { errors, warnings }; }

  if (!t.id) E('id', 'ต้องมี id');
  else if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(t.id)) E('id', 'id “' + t.id + '” ใช้ได้เฉพาะ a-z, 0-9 และ - (2–41 ตัว)');
  if (!t.title) E('title', 'ต้องมี title');
  if (trackIndex(t.track) < 0) E('track', 'track “' + (t.track || '') + '” ไม่ถูกต้อง ใช้ ' + TRACKS.join(', '));
  if (strict && !t.blurb) E('blurb', 'ต้องมี blurb หนึ่งประโยค');

  const mk = Array.isArray(t.mustKnow) ? t.mustKnow : [];
  if (!mk.length) E('mustKnow', 'ต้องมีเรื่องที่ต้องรู้อย่างน้อย 1 เรื่อง');
  mk.forEach((m, i) => {
    const at = 'mustKnow[' + i + ']';
    if (!m || !m.title) E(at, 'ไม่มีชื่อเรื่อง');
    else if (!m.body) (strict ? E : W)(at + ' “' + m.title + '”', 'ยังไม่มีคำอธิบาย');
    if (m && m.tier && !TIERS.includes(m.tier) && strict) E(at, 'tier ต้องเป็น ' + TIERS.join(', '));
  });
  if (strict && !mk.some((m) => (m.tier || 'must') === 'must')) E('mustKnow', 'ต้องมีอย่างน้อย 1 เรื่องที่เป็น tier "must"');

  const qs = Array.isArray(t.questions) ? t.questions : [];
  qs.forEach((q, i) => {
    const at = q.line ? 'บรรทัด ' + q.line : 'questions[' + i + ']';
    if (!q.prompt) E(at, 'ไม่มีตัวคำถาม');
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      E(at, 'ต้องมีตัวเลือก 2–6 ข้อ (พบ ' + (Array.isArray(q.options) ? q.options.length : 0) + ')');
    } else {
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
        if (!q.line) E(at, 'answer ต้องเป็นเลขลำดับตัวเลือกที่ถูก เริ่มจาก 0');
      }
      if (new Set(q.options.map((o) => String(o).trim())).size !== q.options.length) E(at, 'มีตัวเลือกซ้ำกัน');
    }
    if (!q.explain) (strict ? E : W)(at, 'ไม่มีคำอธิบายเฉลย ผู้เรียนจะไม่รู้ว่าทำไมถูก');
  });
  if (!qs.length) W('', 'ยังไม่มีคำถาม หัวข้อนี้จะไม่มีส่วนลองตอบ');
  else if (strict && qs.length < 8) E('questions', 'ควรมีอย่างน้อย 8 คำถาม (มี ' + qs.length + ')');

  const e = t.exercise;
  if (e) {
    if (!e.prompt) E('exercise.prompt', 'แบบฝึกหัดต้องมีโจทย์');
    if (strict) {
      if (!e.title) E('exercise.title', 'ต้องมีชื่อแบบฝึกหัด');
      if (!LEVELS.includes(e.level)) E('exercise.level', 'level ต้องเป็น ' + LEVELS.join(', '));
      if (!e.solution) E('exercise.solution', 'ต้องมีเฉลย');
      if (!Array.isArray(e.hints) || e.hints.length < 2) E('exercise.hints', 'ควรมี hint อย่างน้อย 2 ข้อ');
      if (!Array.isArray(e.checks) || e.checks.length < 3) E('exercise.checks', 'ควรมีเกณฑ์ตรวจอย่างน้อย 3 ข้อ');
    }
    (e.checks || []).forEach((c, i) => {
      const at = 'exercise.checks[' + i + ']';
      if (!c.label) E(at, 'ต้องมี label');
      if (c.json) {
        if (!['exists', 'equals', 'contains', 'containsAll', 'matches'].includes(c.json.op)) E(at, 'json.op ไม่รู้จัก');
      } else if (compileCheck(c) === undefined || !c.pattern) E(at, 'pattern ต้องเป็น regex ที่ถูกต้อง');
    });
    if (strict && e.solution && !errors.length) {
      const failed = runChecks(e, e.solution).filter((r) => !r.ok).map((r) => r.label);
      if (failed.length) E('exercise', 'เฉลยไม่ผ่านเกณฑ์ของตัวเอง: ' + failed.join(', '));
      const starterAll = runChecks(e, e.starter || '').every((r) => r.ok);
      if (starterAll) E('exercise', 'โค้ดเริ่มต้นผ่านทุกเกณฑ์อยู่แล้ว เกณฑ์หลวมเกินไป');
    }
  } else if (strict) W('', 'ยังไม่มีแบบฝึกหัด');
  return { errors, warnings };
}

// Parse pasted or file text (Markdown or JSON; one topic, an array, or {topics: []}).
export function parseContent(text, opts = {}) {
  const src = String(text || '');
  if (!src.trim()) return null;
  let r;
  const head = src.trim()[0];
  if (head === '{' || head === '[') {
    let o;
    try { o = JSON.parse(src); } catch (e) { return { topics: [], errors: [{ where: 'JSON', msg: 'อ่าน JSON ไม่ได้: ' + e.message }], warnings: [], format: 'JSON' }; }
    r = { topics: Array.isArray(o) ? o : o && Array.isArray(o.topics) ? o.topics : [o], errors: [], warnings: [], format: 'JSON' };
  } else r = parseMarkdown(src);
  const seen = new Set();
  r.topics.forEach((t, i) => {
    const v = validateTopic(t, { ...opts, label: opts.label || 'หัวข้อที่ ' + (i + 1) });
    r.errors.push(...v.errors);
    r.warnings.push(...v.warnings);
    if (t && t.id) {
      if (seen.has(t.id)) r.errors.push({ where: 'หัวข้อที่ ' + (i + 1), msg: 'id “' + t.id + '” ซ้ำ' });
      seen.add(t.id);
    }
  });
  return r;
}

// Remove parser-only fields before saving as JSON.
export function cleanTopic(t) {
  const o = JSON.parse(JSON.stringify(t));
  (o.questions || []).forEach((q) => delete q.line);
  return o;
}
