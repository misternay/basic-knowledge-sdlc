import { useRef, useState, useEffect } from 'react';
import { LETTERS } from '../lib/random.js';
import { localizeItem } from '../lib/locale.js';
import { useI18n } from '../i18n.jsx';
import { Code, Mark, Progress, Badge } from './ui.jsx';

// Answer questions one at a time with immediate feedback, then a summary.
// make(): returns a fresh list of items { topic, q, order }.
export default function QuestionRunner({ make, topics, showTopic = false, exitHref, onExit, doneActions = [], intro }) {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const initialized = useRef(false);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);
  const headingRef = useRef(null);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setItems(make());
    }
  }, [make]);
  useEffect(() => { headingRef.current?.focus(); }, [i, items]);

  const restart = () => { setItems(make()); setI(0); setPicked(null); setChecked(false); setResults([]); };

  if (!items) return <section className="stack-18 narrow" aria-live="polite" />;
  if (i >= items.length) return <Summary items={items} results={results} onRestart={restart} actions={doneActions} showTopic={showTopic} topics={topics} />;

  const { topic, q, order } = localizeItem(items[i], topics || []);
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
      {intro && <p className="lead">{intro}</p>}
      <div className="row-12">
        <span className="muted">{t('ข้อ', 'Question')} {i + 1} {t('จาก', 'of')} {items.length}</span>
        {showTopic && <Badge kind="soft">{topic.code} {topic.title}</Badge>}
        {exitHref ? <a className="link push" href={exitHref}>{t('เลิกตอบ', 'Exit quiz')}</a> : onExit ? <button type="button" className="link push" onClick={onExit}>{t('เลิกตอบ', 'Exit quiz')}</button> : null}
      </div>
      <Progress value={Math.round(((i + (checked ? 1 : 0)) / items.length) * 100)} />
      <h2 className="question" tabIndex={-1} ref={headingRef}>{q.prompt}</h2>
      <Code>{q.code}</Code>
      <fieldset className="options">
        <legend className="sr-only">{t('เลือกคำตอบ', 'Choose an answer')}</legend>
        {order.map((orig, di) => {
          let state = picked === di ? 'selected' : '';
          let verdict = '';
          if (checked && orig === q.answer) { state = 'correct'; verdict = t('คำตอบที่ถูก', 'Correct answer'); }
          else if (checked && picked === di) { state = 'wrong'; verdict = t('ที่คุณเลือก', 'Your choice'); }
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
            <div className="feedback-title">{last.ok ? t('ถูกต้อง', 'Correct') : t('ยังไม่ถูก · คำตอบคือ ', 'Not quite · The answer is ') + LETTERS[correctDisplay]}</div>
            <p>{q.explain}</p>
          </div>
        )}
      </div>
      <div className="row end">
        {!checked
          ? <button type="button" className="btn btn-primary" disabled={picked === null} onClick={check}>{t('ตรวจคำตอบ', 'Check answer')}</button>
          : <button type="button" className="btn btn-dark" onClick={next}>{i + 1 < items.length ? t('ข้อถัดไป', 'Next question') : t('ดูสรุป', 'View summary')}</button>}
      </div>
    </section>
  );
}

function Summary({ items, results, onRestart, actions, showTopic, topics }) {
  const { t } = useI18n();
  const score = results.filter((r) => r.ok).length;
  return (
    <section className="stack-20 narrow">
      <div className="panel-dark row-24">
        <div className="score">{score}<span> / {items.length}</span></div>
        <p className="on-dark-muted grow">
          {score === items.length ? t('ตอบถูกทุกข้อ', 'You got every question right') : t('ด้านล่างคือคำตอบทุกข้อ ข้อที่ผิดมีคำอธิบายให้อ่านอีกครั้ง', 'Review every answer below, with explanations for the ones you missed.')}
        </p>
      </div>
      <div className="card list">
        {items.map((item, k) => {
          const { topic, q } = localizeItem(item, topics || []);
          return (
          <article key={k} className="list-row stack-6">
            <div className="row-10 start"><Mark ok={results[k]?.ok} /><b>{q.prompt}</b></div>
            {showTopic && <div className="muted small">{topic.code} {topic.title}</div>}
            <div><span className="muted">{t('คำตอบ: ', 'Answer: ')}</span><b>{q.options[q.answer]}</b></div>
            {!results[k]?.ok && <p className="explain">{q.explain}</p>}
          </article>
          );
        })}
      </div>
      <div className="row">
        <button type="button" className="btn btn-secondary" onClick={onRestart}>{t('ตอบอีกรอบ', 'Try again')}</button>
        {actions.map((a) => a.href
          ? <a key={a.label} className={'btn ' + (a.primary ? 'btn-primary' : 'btn-secondary')} href={a.href}>{a.label}</a>
          : <button key={a.label} type="button" className={'btn ' + (a.primary ? 'btn-primary' : 'btn-secondary')} onClick={a.onClick}>{a.label}</button>)}
      </div>
    </section>
  );
}
