import { TRACKS } from '../content.js';
import { makeItem, shuffle } from '../lib/random.js';
import { Badge, Code } from './ui.jsx';
import QuestionRunner from './QuestionRunner.jsx';
import Exercise from './Exercise.jsx';

const TIERS = [
  ['ต้องรู้', 'พื้นฐานที่ใช้ทุกวัน'],
  ['ควรรู้', 'แยกคนที่ทำได้ กับคนที่ทำได้ดี'],
  ['ขั้นสูง', 'เมื่อระบบหรือทีมใหญ่ขึ้น'],
];
const TABS = [['learn', 'อ่าน'], ['quiz', 'ลองตอบ'], ['exercise', 'แบบฝึกหัด']];

export default function TopicPage({ topics, id, tab }) {
  const idx = topics.findIndex((t) => t.id === id);
  if (idx < 0) {
    return (
      <div className="card stack-14">
        <h1 className="h2">ไม่พบหัวข้อนี้</h1>
        <a className="btn btn-secondary self-start" href="#/">กลับไปหน้าหัวข้อ</a>
      </div>
    );
  }
  const t = topics[idx];
  const prev = topics[idx - 1];
  const next = topics[idx + 1];
  const base = '#/topic/' + t.id;

  return (
    <div className="stack-20">
      <div className="crumbs"><a href="#/">หัวข้อทั้งหมด</a><span aria-hidden="true">/</span><span>{TRACKS[t.tr].name}</span></div>
      <div className="stack-12">
        <div className="row-8"><Badge>{t.code}</Badge>{t.temp && <span className="muted small">หัวข้อชั่วคราว หายเมื่อรีเฟรช</span>}</div>
        <h1 className="h1">{t.title}</h1>
        <p className="lead">{t.blurb}</p>
        <div className="row">
          {prev && <a className="link" href={'#/topic/' + prev.id}>← {prev.title}</a>}
          {next && <a className="link" href={'#/topic/' + next.id}>{next.title} →</a>}
        </div>
      </div>
      <nav className="tabs" aria-label="ส่วนของหัวข้อ">
        {TABS.map(([key, label]) => (
          <a key={key} className="tab" href={key === 'learn' ? base : base + '/' + key} aria-current={tab === key ? 'page' : undefined}>{label}</a>
        ))}
      </nav>
      {tab === 'quiz' ? (
        t.questions.length ? (
          <QuestionRunner
            key={t.id}
            make={() => shuffle(t.questions.map((_, i) => i)).map((i) => makeItem(t, i))}
            exitHref={base}
            doneActions={[
              t.exercise && { label: 'ไปทำแบบฝึกหัด', href: base + '/exercise', primary: true },
              next && { label: 'หัวข้อถัดไป: ' + next.title, href: '#/topic/' + next.id },
            ].filter(Boolean)}
          />
        ) : (
          <Empty title="หัวข้อนี้ยังไม่มีคำถาม" text="เพิ่มได้โดยนำเข้าไฟล์ที่มีส่วน ## Quiz" />
        )
      ) : tab === 'exercise' ? (
        t.exercise ? <Exercise key={t.id} exercise={t.exercise} /> : (
          <Empty title="หัวข้อนี้ยังไม่มีแบบฝึกหัด" text="แบบฝึกหัดที่ตรวจอัตโนมัติต้องเขียนเป็น JSON ที่มี exercise และ checks ดูตัวอย่างได้ที่หน้านำเข้า" />
        )
      ) : (
        <Learn t={t} base={base} next={next} />
      )}
    </div>
  );
}

function Learn({ t, base, next }) {
  return (
    <div className="stack-32 narrow">
      {TIERS.map(([title, desc], ti) => {
        const items = t.mustKnow.map((m, i) => ({ m, i })).filter(({ m }) => m.tier === ti);
        if (!items.length) return null;
        return (
          <section key={title} className="stack-12">
            <div className="tier-head"><h2 className="h2">{title}</h2><span className="muted">{desc}</span></div>
            {items.map(({ m, i }) => (
              <article key={i} className="card item">
                <div className="item-head"><span className="mono muted">{String(i + 1).padStart(2, '0')}</span><h3>{m.title}</h3></div>
                <p>{m.body}</p>
                <Code>{m.code}</Code>
              </article>
            ))}
          </section>
        );
      })}
      <section className="panel-dark stack-12">
        <h2 className="h3">เข้าใจแล้วหรือยัง?</h2>
        <p className="on-dark-muted">
          {t.questions.length
            ? 'ลองตอบคำถาม ' + t.questions.length + ' ข้อ ถ้าตอบผิดจะเห็นคำอธิบายทันทีว่าเข้าใจคลาดตรงไหน'
            : 'หัวข้อนี้ยังไม่มีคำถาม ไปต่อหัวข้อถัดไปได้เลย'}
        </p>
        <div className="row">
          {t.questions.length > 0 && <a className="btn btn-accent" href={base + '/quiz'}>ลองตอบ {t.questions.length} ข้อ</a>}
          {next && <a className="btn btn-ghost-dark" href={'#/topic/' + next.id}>หัวข้อถัดไป: {next.title}</a>}
        </div>
      </section>
    </div>
  );
}

function Empty({ title, text }) {
  return (
    <section className="card card-dashed stack-12 narrow">
      <h2 className="h3">{title}</h2>
      <p>{text}</p>
      <a className="btn btn-secondary self-start" href="#/import">ไปหน้านำเข้า</a>
    </section>
  );
}
