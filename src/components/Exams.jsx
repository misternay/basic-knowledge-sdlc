import { useEffect, useRef, useState } from 'react';
import { EXAMS, TRACKS } from '../content.js';
import { useI18n } from '../i18n.jsx';
import { LETTERS, makeItem, shuffle, drawExamQuestions } from '../lib/random.js';
import { Code, Mark } from './ui.jsx';

// Expand content/exams.json into concrete exams for the current topics.
export function examDefs(topics, definitions = EXAMS, trackDefinitions = TRACKS, language = 'th') {
  const withQ = topics.filter((t) => t.questions.length);
  const defs = [];
  for (const e of definitions) {
    const groups = e.perTrack
      ? trackDefinitions.map((tr, ti) => ({ id: e.id + '-' + tr.id, title: e.title + ' ' + tr.name, topics: withQ.filter((t) => t.tr === ti) }))
      : [{ id: e.id, title: e.title, topics: withQ }];
    for (const g of groups) {
      if (!g.topics.length) continue;
      const pool = g.topics.reduce((n, t) => n + t.questions.length, 0);
      const total = e.pick.perTopic
        ? g.topics.reduce((n, t) => n + Math.min(e.pick.perTopic, t.questions.length), 0)
        : Math.min(e.pick.total, pool);
      defs.push({
        id: g.id, label: e.label, title: g.title, placement: !!e.placement,
        desc: e.desc || (language === 'en' ? 'Covers ' : 'ครอบคลุม ') + g.topics.map((t) => t.title.replace('AI Fundamental: ', '')).join(', '),
        topicIds: g.topics.map((t) => t.id), pick: e.pick, total,
        minutes: Math.max(1, Math.ceil(total * e.minutesPerQuestion)), passPct: e.passPct ?? null,
      });
    }
  }
  return defs;
}

let nextAttemptId = 0;
export function newExam(def, topics) {
  const byId = (id) => (topics || []).find((t) => t.id === id);
  return { attemptId: ++nextAttemptId, def, items: [], ans: {}, flag: {}, i: 0, start: Date.now(), limit: def.minutes * 60, confirm: false, needsItems: !topics, byId };
}

function buildItems(def, topics) {
  return shuffle(drawExamQuestions(def, topics)).map(([t, i]) => makeItem(t, i));
}

const clock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

export default function Exams({ topics, exam, setExam, result, setResult }) {
  const { t, tracks, exams, language } = useI18n();
  const preparedAttempts = useRef(new Set());
  // A newly started exam picks its questions from the current topics.
  useEffect(() => {
    if (exam && exam.needsItems && !preparedAttempts.current.has(exam.attemptId)) {
      preparedAttempts.current.add(exam.attemptId);
      setExam({ ...exam, items: buildItems(exam.def, topics), needsItems: false, start: Date.now() });
    }
  }, [exam, topics, setExam]);

  if (exam && !exam.needsItems) return <ExamRunner exam={exam} setExam={setExam} onSubmit={(auto) => { setResult(score(exam, auto)); setExam(null); }} />;
  if (exam) return null;
  if (result) return <ExamResult result={result} topics={topics} onRetry={() => { setResult(null); setExam(newExam(result.def)); }} onBack={() => setResult(null)} />;

  const defs = examDefs(topics, exams, tracks, language);
  return (
    <div className="stack-24">
      <div className="stack-6">
        <h1 className="h1">{t('บททดสอบ', 'Exams')}</h1>
        <p className="lead">{t('เช็กว่าเข้าใจจริงเมื่อไม่มีตัวช่วย จับเวลา ไม่เฉลยระหว่างทำ แล้วดูคำอธิบายของทุกข้อหลังส่ง ผลไม่ถูกเก็บไว้', 'Check what you understand without hints. Exams are timed, with explanations shown after submission. Results are not saved.')}</p>
      </div>
      <div className="grid-cards">
        {defs.map((d) => (
          <article key={d.id} className="card stack-10">
            <span className="badge badge-soft self-start">{d.label}</span>
            <h2 className="card-title">{d.title}</h2>
            <p className="muted small">{d.desc}</p>
            <div className="push-down"><b>{d.total} {t('ข้อ', 'questions')} · {d.minutes} {t('นาที', 'min')}{d.passPct ? ' · ' + t('ผ่านที่', 'pass at') + ' ' + d.passPct + '%' : ''}</b></div>
            <button type="button" className="btn btn-primary" onClick={() => { setResult(null); setExam(newExam(d)); }}>{t('เริ่มสอบ', 'Start exam')}</button>
          </article>
        ))}
      </div>
    </div>
  );
}

function score(exam, auto) {
  const rows = exam.items.map((it, qi) => {
    const disp = exam.ans[qi];
    const chosen = disp === undefined ? null : it.order[disp];
    return { item: it, chosen, ok: chosen === it.q.answer, flagged: !!exam.flag[qi] };
  });
  const s = rows.filter((r) => r.ok).length;
  return {
    def: exam.def, rows, score: s, total: rows.length, auto,
    secs: Math.min(exam.limit, Math.round((Date.now() - exam.start) / 1000)),
    passed: exam.def.passPct ? (s / rows.length) * 100 >= exam.def.passPct : null,
  };
}

function ExamRunner({ exam, setExam, onSubmit }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const remain = exam.limit - (now - exam.start) / 1000;
  useEffect(() => { if (remain <= 0) onSubmit(true); }, [remain <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p) => setExam({ ...exam, ...p });
  const n = exam.items.length;
  const { q, order } = exam.items[exam.i];
  const answered = exam.items.filter((_, qi) => exam.ans[qi] !== undefined).length;
  const flagged = exam.items.filter((_, qi) => exam.flag[qi]).length;
  const isFlagged = !!exam.flag[exam.i];

  return (
    <div className="stack-16">
      <div className="exam-bar">
        <div className="grow"><div className="on-dark-muted small">{exam.def.label}</div><div className="exam-title">{exam.def.title}</div></div>
        <div className="on-dark-muted">{t('ตอบแล้ว', 'Answered')} {answered} / {n}</div>
        <div role="timer" aria-label={t('เวลาที่เหลือ', 'Time remaining')} className="row-8 baseline">
          <span className="on-dark-muted small">{t('เหลือ', 'Left')}</span><span className={'timer ' + (remain < 60 ? 'timer-low' : '')}>{clock(remain)}</span>
        </div>
        <button type="button" className="btn btn-accent btn-sm" onClick={() => patch({ confirm: true })}>{t('ส่งคำตอบ', 'Submit exam')}</button>
      </div>
      {exam.confirm && (
        <section role="alert" className="card card-strong stack-12">
          <h2 className="h3">{t('ส่งคำตอบตอนนี้?', 'Submit now?')}</h2>
          <p>
            {n - answered ? t('ยังไม่ตอบ ', 'Unanswered ') + (n - answered) + ' ' + t('ข้อ (นับเป็นผิด)', 'questions (counted incorrect)') : t('ตอบครบทุกข้อแล้ว', 'All questions answered')}
            {flagged ? ' · ' + t('ปักธงไว้', 'flagged') + ' ' + flagged : ''} · {t('เหลือเวลา', 'time left')} {clock(remain)}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => onSubmit(false)}>{t('ส่งเลย', 'Submit')}</button>
            <button type="button" className="btn btn-secondary" onClick={() => patch({ confirm: false })}>{t('กลับไปตรวจ', 'Review answers')}</button>
          </div>
        </section>
      )}
      <div className="exam-layout">
        <section className="card stack-16 grow">
          <div className="muted">{t('ข้อ', 'Question')} {exam.i + 1} {t('จาก', 'of')} {n}{isFlagged && <b className="flag-text"> · {t('ปักธงไว้', 'flagged')}</b>}</div>
          <h2 className="question">{q.prompt}</h2>
          <Code>{q.code}</Code>
          <fieldset className="options">
            <legend className="sr-only">{t('เลือกคำตอบ', 'Choose an answer')}</legend>
            {order.map((orig, di) => (
              <label key={di} className={'option ' + (exam.ans[exam.i] === di ? 'selected' : '')}>
                <input type="radio" name={'exam-' + exam.i} checked={exam.ans[exam.i] === di} onChange={() => patch({ ans: { ...exam.ans, [exam.i]: di } })} />
                <span className="mono muted">{LETTERS[di]}</span>
                <span className="grow">{q.options[orig]}</span>
              </label>
            ))}
          </fieldset>
          <div className="row-between">
            <button type="button" className="btn btn-secondary" disabled={exam.i === 0} onClick={() => patch({ i: exam.i - 1, confirm: false })}>← {t('ก่อนหน้า', 'Previous')}</button>
            <button type="button" className={'btn ' + (isFlagged ? 'btn-flag' : 'btn-secondary')} aria-pressed={isFlagged} onClick={() => patch({ flag: { ...exam.flag, [exam.i]: !isFlagged } })}>
              {isFlagged ? t('เอาธงออก', 'Unflag') : t('ปักธงไว้ตรวจ', 'Flag for review')}
            </button>
            <button type="button" className="btn btn-secondary" disabled={exam.i === n - 1} onClick={() => patch({ i: exam.i + 1, confirm: false })}>{t('ถัดไป', 'Next')} →</button>
          </div>
        </section>
        <aside className="card stack-14 exam-side">
          <h2 className="h3">{t('ข้อทั้งหมด', 'All questions')}</h2>
          <nav aria-label={t('ไปยังข้อ', 'Go to question')} className="qgrid">
            {exam.items.map((_, qi) => {
              const a = exam.ans[qi] !== undefined;
              const f = !!exam.flag[qi];
              return (
                <button
                  key={qi}
                  type="button"
                  className={'qbtn ' + (a ? 'qbtn-done ' : '') + (f ? 'qbtn-flag ' : '') + (qi === exam.i ? 'qbtn-current' : '')}
                  aria-current={qi === exam.i ? 'step' : undefined}
                  aria-label={t('ข้อ', 'Question') + ' ' + (qi + 1) + (a ? ' ' + t('ตอบแล้ว', 'answered') : ' ' + t('ยังไม่ตอบ', 'unanswered')) + (f ? ' ' + t('ปักธงไว้', 'flagged') : '')}
                  onClick={() => patch({ i: qi, confirm: false })}
                >
                  {qi + 1}
                </button>
              );
            })}
          </nav>
          <ul className="legend">
            <li><span className="sw sw-done" />{t('ตอบแล้ว', 'Answered')}</li>
            <li><span className="sw" />{t('ยังไม่ตอบ', 'Unanswered')}</li>
            <li><span className="sw sw-flag" />{t('ปักธงไว้ตรวจ', 'Flagged for review')}</li>
          </ul>
          <p className="muted small">{t('ไปหน้าอื่นได้ เวลายังเดินต่อ กลับมาที่ “บททดสอบ” เพื่อทำต่อ', 'You can leave this page; the timer keeps running. Return to Exams to continue.')}</p>
        </aside>
      </div>
    </div>
  );
}

function ExamResult({ result: r, topics, onRetry, onBack }) {
  const { t, tracks } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const pct = Math.round((r.score / r.total) * 100);
  const byTopic = new Map();
  for (const row of r.rows) {
    const g = byTopic.get(row.item.topic.id) || { topic: row.item.topic, ok: 0, n: 0 };
    g.n++;
    if (row.ok) g.ok++;
    byTopic.set(row.item.topic.id, g);
  }
  const groups = topics.filter((t) => byTopic.has(t.id)).map((t) => byTopic.get(t.id));
  const wrong = r.rows.filter((row) => !row.ok);
  const shown = showAll ? r.rows : wrong;

  return (
    <div className="stack-20 medium">
      <div className="panel-dark row-24">
        <div className="score">{r.score}<span> / {r.total}</span></div>
        <div className="grow">
          <div className="on-dark-muted small">{r.def.title}</div>
          <div className="h2">{r.def.placement ? t('ผลวัดระดับ', 'Placement result') : r.passed ? t('ผ่านเกณฑ์', 'Passed') : t('ยังไม่ถึงเกณฑ์', 'Not passed')}</div>
          <div className="on-dark-muted">
            {t('ได้', 'Scored')} {pct}%{r.def.passPct ? ' · ' + t('เกณฑ์', 'pass mark') + ' ' + r.def.passPct + '%' : ''} · {t('ใช้เวลา', 'Time')} {clock(r.secs)}{r.auto ? ' · ' + t('หมดเวลา ระบบส่งให้อัตโนมัติ', 'Time expired; submitted automatically') : ''}
          </div>
        </div>
      </div>

      {r.def.placement && (
        <section className="card list">
          <h2 className="h3 list-head">{t('แนะนำจุดเริ่มต้นของแต่ละเส้นทาง', 'Suggested starting point for each track')}</h2>
          {tracks.map((tr, ti) => {
            const gs = groups.filter((g) => g.topic.tr === ti);
            if (!gs.length) return null;
            const weak = gs.find((g) => g.ok < g.n);
            return (
              <div key={tr.id} className="list-row row-12">
                <b className="w-160">{tr.name}</b>
                <span className="grow">{weak ? t('เริ่มที่', 'Start with') + ' ' + weak.topic.title : t('ตอบถูกทุกข้อ ลองตอบคำถามของเส้นทางนี้เพิ่มได้', 'All correct. Try more questions in this track.')}</span>
                <a className="btn btn-secondary btn-sm" href={weak ? '#/topic/' + weak.topic.id : '#/'}>{weak ? t('เปิด', 'Open') + ' ' + weak.topic.code : t('ดูหัวข้อ', 'View topics')}</a>
              </div>
            );
          })}
        </section>
      )}

      <section className="card list">
        <h2 className="h3 list-head">{t('ผลรายหัวข้อ', 'Results by topic')}</h2>
        {groups.map((g) => {
          const p = Math.round((g.ok / g.n) * 100);
          return (
            <div key={g.topic.id} className="list-row row-12">
              <span className="mono muted w-40">{g.topic.code}</span>
              <a className="grow topic-link" href={'#/topic/' + g.topic.id}>{g.topic.title}</a>
              <div className="bar"><div className={p >= 70 ? 'bar-ok' : 'bar-bad'} style={{ width: Math.max(p, 3) + '%' }} /></div>
              <span className="mono w-40 right">{g.ok}/{g.n}</span>
              {p < 70 && <span className="badge badge-bad">{t('กลับไปอ่าน', 'Review')}</span>}
            </div>
          );
        })}
      </section>

      <section className="card list">
        <div className="row-between list-head">
          <h2 className="h3">{showAll ? t('คำตอบทุกข้อ', 'All answers') : t('ข้อที่ผิดหรือไม่ได้ตอบ', 'Incorrect or unanswered') + ' (' + wrong.length + ')'}</h2>
          <button type="button" className="link" onClick={() => setShowAll(!showAll)}>{showAll ? t('แสดงเฉพาะข้อที่ผิด', 'Show incorrect only') : t('แสดงทุกข้อ', 'Show all')}</button>
        </div>
        {!shown.length && <p className="muted list-row">{t('ไม่มีข้อที่ผิด', 'No incorrect answers')}</p>}
        {shown.map((row) => {
          const qi = r.rows.indexOf(row);
          const { q, topic } = row.item;
          return (
            <article key={qi} className="list-row stack-8">
              <div className="row-10">
                <Mark ok={row.ok}>{row.ok ? t('ถูก', 'Correct') : row.chosen === null ? t('ไม่ได้ตอบ', 'Unanswered') : t('ผิด', 'Incorrect')}</Mark>
                <span className="muted small">{t('ข้อ', 'Question')} {qi + 1} · {topic.code} {topic.title}{row.flagged ? ' · ' + t('ปักธงไว้', 'flagged') : ''}</span>
              </div>
              <b>{q.prompt}</b>
              <Code>{q.code}</Code>
              <div><span className="muted">{t('คำตอบของคุณ: ', 'Your answer: ')}</span>{row.chosen === null ? '—' : q.options[row.chosen]}</div>
              <div><span className="muted">{t('คำตอบที่ถูก: ', 'Correct answer: ')}</span><b>{q.options[q.answer]}</b></div>
              <p className="explain">{q.explain}</p>
            </article>
          );
        })}
      </section>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onRetry}>{t('สอบอีกครั้ง (สุ่มชุดใหม่)', 'Try again (new questions)')}</button>
        <button type="button" className="btn btn-secondary" onClick={onBack}>{t('กลับหน้าบททดสอบ', 'Back to exams')}</button>
      </div>
    </div>
  );
}
