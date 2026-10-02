import { useState } from 'react';
import { makeItem, shuffle } from '../lib/random.js';
import { Badge, Code, Progress } from './ui.jsx';
import QuestionRunner from './QuestionRunner.jsx';

const MODES = [
  ['cards', 'การ์ดอธิบาย', 'เห็นชื่อเรื่อง ลองอธิบายด้วยคำพูดตัวเองก่อน แล้วเปิดดูคำอธิบาย ครั้งละ 20 ใบ'],
  ['questions', 'คำถามสุ่ม', 'คำถาม 10 ข้อจากหลายหัวข้อปนกัน เห็นคำอธิบายทันทีหลังตอบ'],
];

export default function Practice({ topics }) {
  const [sel, setSel] = useState(() => new Set());
  const [mode, setMode] = useState('cards');
  const [session, setSession] = useState(0); // 0 = setup, otherwise a run key
  const chosen = topics.filter((t) => sel.has(t.id));
  const pool = chosen.length ? chosen : topics;

  const makeCards = () => shuffle(pool.flatMap((t) => t.mustKnow.map((m) => ({ topic: t, m })))).slice(0, 20);
  const makeQuestions = () => shuffle(pool.flatMap((t) => t.questions.map((_, i) => [t, i]))).slice(0, 10).map(([t, i]) => makeItem(t, i));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (session && mode === 'cards') return <CardsRunner key={session} make={makeCards} onExit={() => setSession(0)} />;
  if (session && mode === 'questions') {
    return (
      <QuestionRunner
        key={session}
        make={makeQuestions}
        showTopic
        onExit={() => setSession(0)}
        doneActions={[{ label: 'เลือกหัวข้อใหม่', onClick: () => setSession(0) }]}
      />
    );
  }

  const nCards = pool.reduce((n, t) => n + t.mustKnow.length, 0);
  const nQs = pool.reduce((n, t) => n + t.questions.length, 0);
  return (
    <div className="stack-24 medium">
      <div className="stack-6">
        <h1 className="h1">ฝึกรวม</h1>
        <p className="lead">สุ่มจากหลายหัวข้อปนกัน ช่วยให้แยกแยะได้ว่าเรื่องไหนใช้เมื่อไร ไม่มีการเก็บคะแนน</p>
      </div>
      <section className="card stack-14">
        <div className="row-between">
          <h2 className="h3">1 · เลือกหัวข้อ</h2>
          <div className="row-8">
            <button type="button" className="link" onClick={() => setSel(new Set(topics.map((t) => t.id)))}>เลือกทั้งหมด</button>
            <button type="button" className="link" onClick={() => setSel(new Set())}>ล้าง</button>
          </div>
        </div>
        <div className="chips" role="group" aria-label="หัวข้อที่จะฝึก">
          {topics.map((t) => (
            <button key={t.id} type="button" className="chip chip-topic" aria-pressed={sel.has(t.id)} onClick={() => toggle(t.id)}>
              <span className="mono small">{t.code}</span> {t.title.replace('AI Fundamental: ', '')}
            </button>
          ))}
        </div>
        <p className="muted small">
          {chosen.length ? 'เลือกไว้ ' + chosen.length + ' หัวข้อ' : 'ยังไม่ได้เลือก จะสุ่มจากทุกหัวข้อ'} · การ์ด {nCards} ใบ · คำถาม {nQs} ข้อ
        </p>
      </section>
      <section className="card stack-14">
        <h2 className="h3">2 · เลือกวิธีฝึก</h2>
        <div className="grid-2" role="radiogroup" aria-label="วิธีฝึก">
          {MODES.map(([id, title, desc]) => (
            <label key={id} className={'mode ' + (mode === id ? 'mode-on' : '')}>
              <input type="radio" name="mode" checked={mode === id} onChange={() => setMode(id)} />
              <span className="stack-4"><b>{title}</b><span className="muted small">{desc}</span></span>
            </label>
          ))}
        </div>
      </section>
      <button type="button" className="btn btn-primary btn-lg self-start" onClick={() => setSession(Date.now())}>
        {mode === 'cards' ? 'เริ่มการ์ดอธิบาย' : 'เริ่มตอบคำถาม'}
      </button>
    </div>
  );
}

function CardsRunner({ make, onExit }) {
  const [cards, setCards] = useState(make);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (i >= cards.length) {
    return (
      <section className="stack-20 narrow">
        <div className="panel-dark stack-6">
          <div className="h2">ทบทวนครบ {cards.length} ใบ</div>
          <p className="on-dark-muted">เรื่องไหนยังอธิบายไม่ได้ กลับไปอ่านในหัวข้อนั้นได้เลย</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => { setCards(make()); setI(0); setRevealed(false); }}>สุ่มชุดใหม่</button>
          <button type="button" className="btn btn-secondary" onClick={onExit}>เลือกหัวข้อใหม่</button>
        </div>
      </section>
    );
  }
  const { topic, m } = cards[i];
  return (
    <section className="stack-18 narrow">
      <div className="row-12">
        <span className="muted">ใบที่ {i + 1} จาก {cards.length}</span>
        <Badge kind="soft">{topic.code} {topic.title}</Badge>
        <button type="button" className="link push" onClick={onExit}>เลิกฝึก</button>
      </div>
      <Progress value={Math.round(((i + 1) / cards.length) * 100)} />
      <div className="card flashcard stack-14">
        <div className="muted">ลองอธิบายเรื่องนี้ด้วยคำพูดของตัวเองก่อน แล้วค่อยเปิดดู</div>
        <h2 className="flash-title">{m.title}</h2>
        <div aria-live="polite">
          {revealed && (
            <div className="answer stack-10">
              <p>{m.body}</p>
              <Code>{m.code}</Code>
              <a className="link small" href={'#/topic/' + topic.id}>อ่านหัวข้อ {topic.title}</a>
            </div>
          )}
        </div>
      </div>
      <div className="row-between">
        <button type="button" className="btn btn-secondary" disabled={i === 0} onClick={() => { setI(i - 1); setRevealed(false); }}>← ก่อนหน้า</button>
        {!revealed
          ? <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>เปิดคำอธิบาย</button>
          : <button type="button" className="btn btn-dark" onClick={() => { setI(i + 1); setRevealed(false); }}>{i + 1 < cards.length ? 'ใบถัดไป' : 'จบชุดนี้'}</button>}
      </div>
    </section>
  );
}
