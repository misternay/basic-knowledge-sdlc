import { useRef, useState, useEffect } from 'react';
import { LETTERS } from '../lib/random.js';
import { Code, Mark, Progress, Badge } from './ui.jsx';

// Answer questions one at a time with immediate feedback, then a summary.
// make(): returns a fresh list of items { topic, q, order }.
export default function QuestionRunner({ make, showTopic = false, exitHref, onExit, doneActions = [] }) {
  const [items, setItems] = useState(make);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);
  const headingRef = useRef(null);

  useEffect(() => { headingRef.current?.focus(); }, [i]);

  const restart = () => { setItems(make()); setI(0); setPicked(null); setChecked(false); setResults([]); };

  if (i >= items.length) return <Summary items={items} results={results} onRestart={restart} actions={doneActions} showTopic={showTopic} />;

  const { topic, q, order } = items[i];
  const correctDisplay = order.indexOf(q.answer);
  const last = checked ? results[results.length - 1] : null;
  const check = () => {
    if (picked === null || checked) return;
    setChecked(true);
    setResults((r) => [...r, { ok: order[picked] === q.answer }]);
  };
  const next = () => { setI(i + 1); setPicked(null); setChecked(false); };

  return (
    <section className="stack-18 narrow">
      <div className="row-12">
        <span className="muted">ข้อ {i + 1} จาก {items.length}</span>
        {showTopic && <Badge kind="soft">{topic.code} {topic.title}</Badge>}
        {exitHref ? <a className="link push" href={exitHref}>เลิกตอบ</a> : onExit ? <button type="button" className="link push" onClick={onExit}>เลิกตอบ</button> : null}
      </div>
      <Progress value={Math.round(((i + (checked ? 1 : 0)) / items.length) * 100)} />
      <h2 className="question" tabIndex={-1} ref={headingRef}>{q.prompt}</h2>
      <Code>{q.code}</Code>
      <fieldset className="options">
        <legend className="sr-only">เลือกคำตอบ</legend>
        {order.map((orig, di) => {
          let state = picked === di ? 'selected' : '';
          let verdict = '';
          if (checked && orig === q.answer) { state = 'correct'; verdict = 'คำตอบที่ถูก'; }
          else if (checked && picked === di) { state = 'wrong'; verdict = 'ที่คุณเลือก'; }
          return (
            <label key={di} className={'option ' + state}>
              <input type="radio" name={'q-' + i} checked={picked === di} disabled={checked} onChange={() => setPicked(di)} />
              <span className="mono muted">{LETTERS[di]}</span>
              <span className="grow">{q.options[orig]}</span>
              {verdict && <span className="verdict">{verdict}</span>}
            </label>
          );
        })}
      </fieldset>
      <div aria-live="polite">
        {last && (
          <div className={'feedback ' + (last.ok ? 'feedback-ok' : 'feedback-bad')}>
            <div className="feedback-title">{last.ok ? 'ถูกต้อง' : 'ยังไม่ถูก · คำตอบคือ ' + LETTERS[correctDisplay]}</div>
            <p>{q.explain}</p>
          </div>
        )}
      </div>
      <div className="row end">
        {!checked
          ? <button type="button" className="btn btn-primary" disabled={picked === null} onClick={check}>ตรวจคำตอบ</button>
          : <button type="button" className="btn btn-dark" onClick={next}>{i + 1 < items.length ? 'ข้อถัดไป' : 'ดูสรุป'}</button>}
      </div>
    </section>
  );
}

function Summary({ items, results, onRestart, actions, showTopic }) {
  const score = results.filter((r) => r.ok).length;
  return (
    <section className="stack-20 narrow">
      <div className="panel-dark row-24">
        <div className="score">{score}<span> / {items.length}</span></div>
        <p className="on-dark-muted grow">
          {score === items.length ? 'ตอบถูกทุกข้อ' : 'ด้านล่างคือคำตอบทุกข้อ ข้อที่ผิดมีคำอธิบายให้อ่านอีกครั้ง'}
        </p>
      </div>
      <div className="card list">
        {items.map(({ topic, q }, k) => (
          <article key={k} className="list-row stack-6">
            <div className="row-10 start"><Mark ok={results[k]?.ok} /><b>{q.prompt}</b></div>
            {showTopic && <div className="muted small">{topic.code} {topic.title}</div>}
            <div><span className="muted">คำตอบ: </span><b>{q.options[q.answer]}</b></div>
            {!results[k]?.ok && <p className="explain">{q.explain}</p>}
          </article>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn-secondary" onClick={onRestart}>ตอบอีกรอบ</button>
        {actions.map((a) => a.href
          ? <a key={a.label} className={'btn ' + (a.primary ? 'btn-primary' : 'btn-secondary')} href={a.href}>{a.label}</a>
          : <button key={a.label} type="button" className={'btn ' + (a.primary ? 'btn-primary' : 'btn-secondary')} onClick={a.onClick}>{a.label}</button>)}
      </div>
    </section>
  );
}
