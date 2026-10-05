import { useState } from 'react';
import { makeItem, shuffle } from '../lib/random.js';
import { Badge, Code, Progress } from './ui.jsx';
import QuestionRunner from './QuestionRunner.jsx';
import { useI18n } from '../i18n.jsx';

const MODES = [
  ['cards', 'การ์ดอธิบาย', 'เห็นชื่อเรื่อง ลองอธิบายด้วยคำพูดตัวเองก่อน แล้วเปิดดูคำอธิบาย ครั้งละ 20 ใบ'],
  ['questions', 'คำถามสุ่ม', 'คำถาม 10 ข้อจากหลายหัวข้อปนกัน เห็นคำอธิบายทันทีหลังตอบ'],
];

export default function Practice({ topics }) {
  const { t } = useI18n();
  const [sel, setSel] = useState(() => new Set());
  const [mode, setMode] = useState('cards');
  const [session, setSession] = useState(0); // 0 = setup, otherwise a run key
  const chosen = topics.filter((t) => sel.has(t.id));
  const pool = chosen.length ? chosen : topics;

  const makeCards = () => shuffle(pool.flatMap((topic) => topic.mustKnow.map((_, mi) => ({ topicId: topic.id, mi })))).slice(0, 20);
  const makeQuestions = () => shuffle(pool.flatMap((t) => t.questions.map((_, i) => [t, i]))).slice(0, 10).map(([t, i]) => makeItem(t, i));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (session && mode === 'cards') return <CardsRunner key={session} topics={topics} make={makeCards} onExit={() => setSession(0)} />;
  if (session && mode === 'questions') {
    return (
      <QuestionRunner
        key={session}
        make={makeQuestions}
        topics={topics}
        showTopic
        onExit={() => setSession(0)}
        doneActions={[{ label: t('เลือกหัวข้อใหม่', 'Choose topics'), onClick: () => setSession(0) }]}
      />
    );
  }

  const nCards = pool.reduce((n, t) => n + t.mustKnow.length, 0);
  const nQs = pool.reduce((n, t) => n + t.questions.length, 0);
  return (
    <div className="stack-24 medium">
      <div className="stack-6">
        <h1 className="h1">{t('ฝึกรวม', 'Mixed practice')}</h1>
        <p className="lead">{t('สุ่มจากหลายหัวข้อปนกัน ช่วยให้แยกแยะได้ว่าเรื่องไหนใช้เมื่อไร ไม่มีการเก็บคะแนน', 'Mix topics to practice recognizing when each idea applies. Scores are not saved.')}</p>
      </div>
      <section className="card stack-14">
        <div className="row-between">
          <h2 className="h3">1 · {t('เลือกหัวข้อ', 'Choose topics')}</h2>
          <div className="row-8">
            <button type="button" className="link" onClick={() => setSel(new Set(topics.map((t) => t.id)))}>{t('เลือกทั้งหมด', 'Select all')}</button>
            <button type="button" className="link" onClick={() => setSel(new Set())}>{t('ล้าง', 'Clear')}</button>
          </div>
        </div>
        <div className="chips" role="group" aria-label={t('หัวข้อที่จะฝึก', 'Topics to practice')}>
          {topics.map((t) => (
            <button key={t.id} type="button" className="chip chip-topic" aria-pressed={sel.has(t.id)} onClick={() => toggle(t.id)}>
              <span className="mono small">{t.code}</span> {t.title.replace('AI Fundamental: ', '')}
            </button>
          ))}
        </div>
        <p className="muted small">
          {chosen.length ? t('เลือกไว้ ', 'Selected ') + chosen.length + ' ' + t('หัวข้อ', 'topics') : t('ยังไม่ได้เลือก จะสุ่มจากทุกหัวข้อ', 'No topics selected; all topics will be included')} · {t('การ์ด', 'Cards')} {nCards} · {t('คำถาม', 'Questions')} {nQs}
        </p>
      </section>
      <section className="card stack-14">
        <h2 className="h3">2 · {t('เลือกวิธีฝึก', 'Choose a practice mode')}</h2>
        <div className="grid-2" role="radiogroup" aria-label={t('วิธีฝึก', 'Practice mode')}>
          {MODES.map(([id, title, desc]) => (
            <label key={id} className={'mode ' + (mode === id ? 'mode-on' : '')}>
              <input type="radio" name="mode" checked={mode === id} onChange={() => setMode(id)} />
          <span className="stack-4"><b>{t(title, ({ 'การ์ดอธิบาย': 'Explanation cards', 'คำถามสุ่ม': 'Random questions' })[title])}</b><span className="muted small">{t(desc, ({ 'เห็นชื่อเรื่อง ลองอธิบายด้วยคำพูดตัวเองก่อน แล้วเปิดดูคำอธิบาย ครั้งละ 20 ใบ': 'Read a concept, explain it in your own words, then reveal it. 20 cards per session.', 'คำถาม 10 ข้อจากหลายหัวข้อปนกัน เห็นคำอธิบายทันทีหลังตอบ': 'Ten mixed questions with immediate explanations.' })[desc])}</span></span>
            </label>
          ))}
        </div>
      </section>
      <button type="button" className="btn btn-primary btn-lg self-start" onClick={() => setSession(Date.now())}>
        {mode === 'cards' ? t('เริ่มการ์ดอธิบาย', 'Start cards') : t('เริ่มตอบคำถาม', 'Start questions')}
      </button>
    </div>
  );
}

function CardsRunner({ make, topics, onExit }) {
  const { t } = useI18n();
  const [cards, setCards] = useState(make);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (i >= cards.length) {
    return (
      <section className="stack-20 narrow">
        <div className="panel-dark stack-6">
          <div className="h2">{t('ทบทวนครบ', 'Review complete')} {cards.length} {t('ใบ', 'cards')}</div>
          <p className="on-dark-muted">{t('เรื่องไหนยังอธิบายไม่ได้ กลับไปอ่านในหัวข้อนั้นได้เลย', 'If you could not explain a concept, revisit its topic.')}</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => { setCards(make()); setI(0); setRevealed(false); }}>{t('สุ่มชุดใหม่', 'Shuffle a new set')}</button>
          <button type="button" className="btn btn-secondary" onClick={onExit}>{t('เลือกหัวข้อใหม่', 'Choose new topics')}</button>
        </div>
      </section>
    );
  }
  const card = cards[i];
  const topic = topics.find((topic) => topic.id === card.topicId);
  const m = topic?.mustKnow[card.mi];
  return (
    <section className="stack-18 narrow">
      <div className="row-12">
        <span className="muted">{t('ใบที่', 'Card')} {i + 1} {t('จาก', 'of')} {cards.length}</span>
        <Badge kind="soft">{topic.code} {topic.title}</Badge>
        <button type="button" className="link push" onClick={onExit}>{t('เลิกฝึก', 'Exit practice')}</button>
      </div>
      <Progress value={Math.round(((i + 1) / cards.length) * 100)} />
      <div className="card flashcard stack-14">
        <div className="muted">{t('ลองอธิบายเรื่องนี้ด้วยคำพูดของตัวเองก่อน แล้วค่อยเปิดดู', 'Try to explain this in your own words before revealing the answer.')}</div>
        <h2 className="flash-title">{m.title}</h2>
        <div aria-live="polite">
          {revealed && (
            <div className="answer stack-10">
              <p>{m.body}</p>
              <Code>{m.code}</Code>
              <a className="link small" href={'#/topic/' + topic.id}>{t('อ่านหัวข้อ', 'Read topic')} {topic.title}</a>
            </div>
          )}
        </div>
      </div>
      <div className="row-between">
        <button type="button" className="btn btn-secondary" disabled={i === 0} onClick={() => { setI(i - 1); setRevealed(false); }}>← {t('ก่อนหน้า', 'Previous')}</button>
        {!revealed
          ? <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>{t('เปิดคำอธิบาย', 'Reveal answer')}</button>
          : <button type="button" className="btn btn-dark" onClick={() => { setI(i + 1); setRevealed(false); }}>{i + 1 < cards.length ? t('ใบถัดไป', 'Next card') : t('จบชุดนี้', 'Finish set')}</button>}
      </div>
    </section>
  );
}
