import { useEffect, useState } from 'react';
import { EXAMS, TRACKS } from '../content.js';
import { LETTERS, makeItem, shuffle } from '../lib/random.js';
import { Code, Mark } from './ui.jsx';

// Expand content/exams.json into concrete exams for the current topics.
export function examDefs(topics) {
  const withQ = topics.filter((t) => t.questions.length);
  const defs = [];
  for (const e of EXAMS) {
    const groups = e.perTrack
      ? TRACKS.map((tr, ti) => ({ id: e.id + '-' + tr.id, title: e.title + ' ' + tr.name, topics: withQ.filter((t) => t.tr === ti) }))
      : [{ id: e.id, title: e.title, topics: withQ }];
    for (const g of groups) {
      if (!g.topics.length) continue;
      const pool = g.topics.reduce((n, t) => n + t.questions.length, 0);
      const total = e.pick.perTopic
        ? g.topics.reduce((n, t) => n + Math.min(e.pick.perTopic, t.questions.length), 0)
        : Math.min(e.pick.total, pool);
      defs.push({
        id: g.id, label: e.label, title: g.title, placement: !!e.placement,
        desc: e.desc || 'ครอบคลุม ' + g.topics.map((t) => t.title.replace('AI Fundamental: ', '')).join(', '),
        topicIds: g.topics.map((t) => t.id), pick: e.pick, total,
        minutes: Math.max(1, Math.ceil(total * e.minutesPerQuestion)), passPct: e.passPct ?? null,
      });
    }
  }
  return defs;
}

export function newExam(def, topics) {
  const byId = (id) => (topics || []).find((t) => t.id === id);
  return { def, items: [], ans: {}, flag: {}, i: 0, start: Date.now(), limit: def.minutes * 60, confirm: false, needsItems: !topics, byId };
}

function buildItems(def, topics) {
  const ts = def.topicIds.map((id) => topics.find((t) => t.id === id)).filter(Boolean);
  let picks = [];
  if (def.pick.perTopic) {
    for (const t of ts) shuffle(t.questions.map((_, i) => i)).slice(0, def.pick.perTopic).forEach((i) => picks.push([t, i]));
  } else {
    const pools = ts.map((t) => shuffle(t.questions.map((_, i) => [t, i])));
    for (let k = 0; picks.length < def.total && k < 5000; k++) {
      const pool = pools[k % pools.length];
      if (pool.length) picks.push(pool.shift());
    }
  }
  return shuffle(picks).map(([t, i]) => makeItem(t, i));
}

const clock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

export default function Exams({ topics, exam, setExam, result, setResult }) {
  // A newly started exam picks its questions from the current topics.
  useEffect(() => {
    if (exam && exam.needsItems) setExam({ ...exam, items: buildItems(exam.def, topics), needsItems: false, start: Date.now() });
  }, [exam, topics, setExam]);

  if (exam && !exam.needsItems) return <ExamRunner exam={exam} setExam={setExam} onSubmit={(auto) => { setResult(score(exam, auto)); setExam(null); }} />;
  if (exam) return null;
  if (result) return <ExamResult result={result} topics={topics} onRetry={() => { setResult(null); setExam(newExam(result.def)); }} onBack={() => setResult(null)} />;

  const defs = examDefs(topics);
  return (
    <div className="stack-24">
      <div className="stack-6">
        <h1 className="h1">บททดสอบ</h1>
        <p className="lead">เช็กว่าเข้าใจจริงเมื่อไม่มีตัวช่วย จับเวลา ไม่เฉลยระหว่างทำ แล้วดูคำอธิบายของทุกข้อหลังส่ง ผลไม่ถูกเก็บไว้</p>
      </div>
      <div className="grid-cards">
        {defs.map((d) => (
          <article key={d.id} className="card stack-10">
            <span className="badge badge-soft self-start">{d.label}</span>
            <h2 className="card-title">{d.title}</h2>
            <p className="muted small">{d.desc}</p>
            <div className="push-down"><b>{d.total} ข้อ · {d.minutes} นาที{d.passPct ? ' · ผ่านที่ ' + d.passPct + '%' : ''}</b></div>
            <button type="button" className="btn btn-primary" onClick={() => { setResult(null); setExam(newExam(d)); }}>เริ่มสอบ</button>
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
        <div className="on-dark-muted">ตอบแล้ว {answered} / {n}</div>
        <div role="timer" aria-label="เวลาที่เหลือ" className="row-8 baseline">
          <span className="on-dark-muted small">เหลือ</span><span className={'timer ' + (remain < 60 ? 'timer-low' : '')}>{clock(remain)}</span>
        </div>
        <button type="button" className="btn btn-accent btn-sm" onClick={() => patch({ confirm: true })}>ส่งคำตอบ</button>
      </div>
      {exam.confirm && (
        <section role="alert" className="card card-strong stack-12">
          <h2 className="h3">ส่งคำตอบตอนนี้?</h2>
          <p>
            {n - answered ? 'ยังไม่ตอบ ' + (n - answered) + ' ข้อ (นับเป็นผิด)' : 'ตอบครบทุกข้อแล้ว'}
            {flagged ? ' · ปักธงไว้ ' + flagged + ' ข้อ' : ''} · เหลือเวลา {clock(remain)}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => onSubmit(false)}>ส่งเลย</button>
            <button type="button" className="btn btn-secondary" onClick={() => patch({ confirm: false })}>กลับไปตรวจ</button>
          </div>
        </section>
      )}
      <div className="exam-layout">
        <section className="card stack-16 grow">
          <div className="muted">ข้อ {exam.i + 1} จาก {n}{isFlagged && <b className="flag-text"> · ปักธงไว้</b>}</div>
          <h2 className="question">{q.prompt}</h2>
          <Code>{q.code}</Code>
          <fieldset className="options">
            <legend className="sr-only">เลือกคำตอบ</legend>
            {order.map((orig, di) => (
              <label key={di} className={'option ' + (exam.ans[exam.i] === di ? 'selected' : '')}>
                <input type="radio" name={'exam-' + exam.i} checked={exam.ans[exam.i] === di} onChange={() => patch({ ans: { ...exam.ans, [exam.i]: di } })} />
                <span className="mono muted">{LETTERS[di]}</span>
                <span className="grow">{q.options[orig]}</span>
              </label>
            ))}
          </fieldset>
          <div className="row-between">
            <button type="button" className="btn btn-secondary" disabled={exam.i === 0} onClick={() => patch({ i: exam.i - 1, confirm: false })}>← ก่อนหน้า</button>
            <button type="button" className={'btn ' + (isFlagged ? 'btn-flag' : 'btn-secondary')} aria-pressed={isFlagged} onClick={() => patch({ flag: { ...exam.flag, [exam.i]: !isFlagged } })}>
              {isFlagged ? 'เอาธงออก' : 'ปักธงไว้ตรวจ'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={exam.i === n - 1} onClick={() => patch({ i: exam.i + 1, confirm: false })}>ถัดไป →</button>
          </div>
        </section>
        <aside className="card stack-14 exam-side">
          <h2 className="h3">ข้อทั้งหมด</h2>
          <nav aria-label="ไปยังข้อ" className="qgrid">
            {exam.items.map((_, qi) => {
              const a = exam.ans[qi] !== undefined;
              const f = !!exam.flag[qi];
              return (
                <button
                  key={qi}
                  type="button"
                  className={'qbtn ' + (a ? 'qbtn-done ' : '') + (f ? 'qbtn-flag ' : '') + (qi === exam.i ? 'qbtn-current' : '')}
                  aria-current={qi === exam.i ? 'step' : undefined}
                  aria-label={'ข้อ ' + (qi + 1) + (a ? ' ตอบแล้ว' : ' ยังไม่ตอบ') + (f ? ' ปักธงไว้' : '')}
                  onClick={() => patch({ i: qi, confirm: false })}
                >
                  {qi + 1}
                </button>
              );
            })}
          </nav>
          <ul className="legend">
            <li><span className="sw sw-done" />ตอบแล้ว</li>
            <li><span className="sw" />ยังไม่ตอบ</li>
            <li><span className="sw sw-flag" />ปักธงไว้ตรวจ</li>
          </ul>
          <p className="muted small">ไปหน้าอื่นได้ เวลายังเดินต่อ กลับมาที่ “บททดสอบ” เพื่อทำต่อ</p>
        </aside>
      </div>
    </div>
  );
}

function ExamResult({ result: r, topics, onRetry, onBack }) {
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
          <div className="h2">{r.def.placement ? 'ผลวัดระดับ' : r.passed ? 'ผ่านเกณฑ์' : 'ยังไม่ถึงเกณฑ์'}</div>
          <div className="on-dark-muted">
            ได้ {pct}%{r.def.passPct ? ' · เกณฑ์ ' + r.def.passPct + '%' : ''} · ใช้เวลา {clock(r.secs)}{r.auto ? ' · หมดเวลา ระบบส่งให้อัตโนมัติ' : ''}
          </div>
        </div>
      </div>

      {r.def.placement && (
        <section className="card list">
          <h2 className="h3 list-head">แนะนำจุดเริ่มต้นของแต่ละเส้นทาง</h2>
          {TRACKS.map((tr, ti) => {
            const gs = groups.filter((g) => g.topic.tr === ti);
            if (!gs.length) return null;
            const weak = gs.find((g) => g.ok < g.n);
            return (
              <div key={tr.id} className="list-row row-12">
                <b className="w-160">{tr.name}</b>
                <span className="grow">{weak ? 'เริ่มที่ ' + weak.topic.title : 'ตอบถูกทุกข้อ ลองตอบคำถามของเส้นทางนี้เพิ่มได้'}</span>
                <a className="btn btn-secondary btn-sm" href={weak ? '#/topic/' + weak.topic.id : '#/'}>{weak ? 'เปิด ' + weak.topic.code : 'ดูหัวข้อ'}</a>
              </div>
            );
          })}
        </section>
      )}

      <section className="card list">
        <h2 className="h3 list-head">ผลรายหัวข้อ</h2>
        {groups.map((g) => {
          const p = Math.round((g.ok / g.n) * 100);
          return (
            <div key={g.topic.id} className="list-row row-12">
              <span className="mono muted w-40">{g.topic.code}</span>
              <a className="grow topic-link" href={'#/topic/' + g.topic.id}>{g.topic.title}</a>
              <div className="bar"><div className={p >= 70 ? 'bar-ok' : 'bar-bad'} style={{ width: Math.max(p, 3) + '%' }} /></div>
              <span className="mono w-40 right">{g.ok}/{g.n}</span>
              {p < 70 && <span className="badge badge-bad">กลับไปอ่าน</span>}
            </div>
          );
        })}
      </section>

      <section className="card list">
        <div className="row-between list-head">
          <h2 className="h3">{showAll ? 'คำตอบทุกข้อ' : 'ข้อที่ผิดหรือไม่ได้ตอบ (' + wrong.length + ')'}</h2>
          <button type="button" className="link" onClick={() => setShowAll(!showAll)}>{showAll ? 'แสดงเฉพาะข้อที่ผิด' : 'แสดงทุกข้อ'}</button>
        </div>
        {!shown.length && <p className="muted list-row">ไม่มีข้อที่ผิด</p>}
        {shown.map((row) => {
          const qi = r.rows.indexOf(row);
          const { q, topic } = row.item;
          return (
            <article key={qi} className="list-row stack-8">
              <div className="row-10">
                <Mark ok={row.ok}>{row.ok ? 'ถูก' : row.chosen === null ? 'ไม่ได้ตอบ' : 'ผิด'}</Mark>
                <span className="muted small">ข้อ {qi + 1} · {topic.code} {topic.title}{row.flagged ? ' · ปักธงไว้' : ''}</span>
              </div>
              <b>{q.prompt}</b>
              <Code>{q.code}</Code>
              <div><span className="muted">คำตอบของคุณ: </span>{row.chosen === null ? '—' : q.options[row.chosen]}</div>
              <div><span className="muted">คำตอบที่ถูก: </span><b>{q.options[q.answer]}</b></div>
              <p className="explain">{q.explain}</p>
            </article>
          );
        })}
      </section>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onRetry}>สอบอีกครั้ง (สุ่มชุดใหม่)</button>
        <button type="button" className="btn btn-secondary" onClick={onBack}>กลับหน้าบททดสอบ</button>
      </div>
    </div>
  );
}
