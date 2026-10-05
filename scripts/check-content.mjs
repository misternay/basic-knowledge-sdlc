#!/usr/bin/env node
// Validate Thai and English content independently, then compare locale parity.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseContent } from '../src/lib/validate.js';

const root = new URL('..', import.meta.url).pathname;
const thaiDir = join(root, 'content', 'topics');
const englishDir = join(root, 'content', 'en', 'topics');
const explicitFiles = process.argv.slice(2);
const errorList = [];
let warnCount = 0;

function topicFiles(dir) {
  return readdirSync(dir).filter((f) => /\.(json|md)$/.test(f)).sort();
}

function loadLocale(dir, files) {
  const entries = new Map();
  const ids = new Map();
  const codes = new Map();
  for (const file of files) {
    const full = join(dir, file);
    const name = basename(file);
    const parsed = parseContent(readFileSync(full, 'utf8'), { strict: true, label: name });
    for (const e of parsed.errors) errorList.push(`✗ ${e.where}: ${e.msg}`);
    for (const w of parsed.warnings) { console.warn(`! ${w.where}: ${w.msg}`); warnCount++; }
    for (const topic of parsed.topics) {
      if (!topic?.id) continue;
      if (name.replace(/\.(json|md)$/, '') !== topic.id) errorList.push(`✗ ${name}: filename must match id “${topic.id}”`);
      if (ids.has(topic.id)) errorList.push(`✗ ${name}: id “${topic.id}” duplicates ${ids.get(topic.id)}`);
      ids.set(topic.id, name);
      if (topic.code) {
        if (codes.has(topic.code)) errorList.push(`✗ ${name}: code “${topic.code}” duplicates ${codes.get(topic.code)}`);
        codes.set(topic.code, name);
      }
      entries.set(topic.id, topic);
    }
  }
  return entries;
}

function machineFields(topic) {
  return {
    id: topic.id,
    code: topic.code ?? null,
    track: topic.track,
    mustKnow: (topic.mustKnow || []).map(({ tier, exam, ref, code }) => ({ tier: tier ?? null, exam: exam ?? null, ref: ref ?? null, code: code ?? null })),
    questions: (topic.questions || []).map(({ answer, options, code }) => ({ answer, optionsCount: options?.length ?? 0, code: code ?? null })),
    exercises: (topic.exercises || (topic.exercise ? [topic.exercise] : [])).map(({ level, lang, starter, solution, hints, checks }) => ({ level, lang, starter: starter ?? null, solution: solution ?? null, hintsCount: hints?.length ?? 0, checks: (checks || []).map(({ pattern, negate, json }) => ({ pattern: pattern ?? null, negate: negate ?? null, json: json ?? null })) })),
    refs: (topic.refs || []).map(({ url }) => url),
  };
}

const containsThai = (value) => typeof value === 'string' && /[\u0E00-\u0E7F]/u.test(value);
function checkEnglishTopic(topic, label) {
  const check = (value, path) => { if (containsThai(value)) errorList.push(`✗ ${label} · ${path}: Thai characters remain in English text`); };
  check(topic.title, 'title'); check(topic.blurb, 'blurb');
  (topic.mustKnow || []).forEach((item, i) => { check(item.title, `mustKnow[${i}].title`); check(item.body, `mustKnow[${i}].body`); });
  (topic.questions || []).forEach((item, i) => {
    check(item.prompt, `questions[${i}].prompt`); check(item.explain, `questions[${i}].explain`);
    (item.options || []).forEach((option, j) => check(option, `questions[${i}].options[${j}]`));
  });
  (topic.exercises || (topic.exercise ? [topic.exercise] : [])).forEach((item, i) => {
    for (const field of ['title', 'prompt']) check(item[field], `exercises[${i}].${field}`);
    (item.hints || []).forEach((hint, j) => check(hint, `exercises[${i}].hints[${j}]`));
    (item.checks || []).forEach((entry, j) => check(entry.label, `exercises[${i}].checks[${j}].label`));
  });
  (topic.refs || []).forEach((ref, i) => { check(ref.title, `refs[${i}].title`); check(ref.note, `refs[${i}].note`); });
}

function compareLocalizedList(thPath, enPath, label, machineProjection) {
  if (!existsSync(enPath)) { errorList.push(`✗ English ${label}: missing ${enPath.replace(root, '')}`); return; }
  const thItems = JSON.parse(readFileSync(thPath, 'utf8'));
  const enItems = JSON.parse(readFileSync(enPath, 'utf8'));
  if (!Array.isArray(thItems) || !Array.isArray(enItems)) { errorList.push(`✗ ${label}: both locale files must contain arrays`); return; }
  const thById = new Map(thItems.map((item) => [item.id, item]));
  const enById = new Map(enItems.map((item) => [item.id, item]));
  if (JSON.stringify([...thById.keys()]) !== JSON.stringify([...enById.keys()])) errorList.push(`✗ English ${label}: IDs and ordering must match Thai`);
  for (const [id, item] of thById) {
    const translated = enById.get(id);
    if (translated) {
      if (JSON.stringify(machineProjection(item)) !== JSON.stringify(machineProjection(translated))) errorList.push(`✗ English ${label} “${id}”: machine fields must match Thai`);
      if (label === 'tracks') { if (containsThai(translated.name)) errorList.push(`✗ English tracks “${id}” · name: Thai characters remain in English text`); if (containsThai(translated.th)) errorList.push(`✗ English tracks “${id}” · th: Thai characters remain in English text`); }
      if (label === 'exams') for (const field of ['title', 'label', 'desc']) if (containsThai(translated[field])) errorList.push(`✗ English exams “${id}” · ${field}: Thai characters remain in English text`);
    }
  }
}

let totalFiles;
if (explicitFiles.length) {
  totalFiles = explicitFiles.length;
  loadLocale('', explicitFiles);
} else {
  const thaiFiles = topicFiles(thaiDir);
  totalFiles = thaiFiles.length;
  const thai = loadLocale(thaiDir, thaiFiles);
  if (!existsSync(englishDir)) {
    errorList.push('✗ English topics: required directory content/en/topics is missing');
  } else {
    const englishFiles = topicFiles(englishDir);
    totalFiles += englishFiles.length;
    const english = loadLocale(englishDir, englishFiles);
    for (const id of thai.keys()) if (!english.has(id)) errorList.push(`✗ English topics: missing id “${id}”`);
    for (const id of english.keys()) if (!thai.has(id)) errorList.push(`✗ English topics: unexpected id “${id}”`);
    for (const [id, thTopic] of thai) {
      const enTopic = english.get(id);
      if (enTopic && JSON.stringify(machineFields(thTopic)) !== JSON.stringify(machineFields(enTopic))) {
        errorList.push(`✗ English topic “${id}”: IDs, machine fields, item counts (including options and hints), answers, code, exercise checks, and reference URLs must match Thai`);
      }
      if (enTopic) checkEnglishTopic(enTopic, `English topic “${id}”`);
    }
  }
  compareLocalizedList(join(root, 'content', 'tracks.json'), join(root, 'content', 'en', 'tracks.json'), 'tracks', ({ id, num }) => ({ id, num }));
  compareLocalizedList(join(root, 'content', 'exams.json'), join(root, 'content', 'en', 'exams.json'), 'exams', ({ id, pick, minutesPerQuestion, placement, perTrack, perTopic, total, passPct }) => ({ id, pick: pick ?? null, minutesPerQuestion: minutesPerQuestion ?? null, placement: placement ?? null, perTrack: perTrack ?? null, perTopic: perTopic ?? null, total: total ?? null, passPct: passPct ?? null }));
}

for (const error of errorList) console.error(error);
console.log(`\nChecked ${totalFiles} topic files · errors ${errorList.length} · warnings ${warnCount}`);
process.exit(errorList.length ? 1 : 0);
