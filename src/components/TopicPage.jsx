import { useState } from 'react';
import { useI18n } from '../i18n.jsx';
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
  const { t: translate, tracks } = useI18n();
  const idx = topics.findIndex((t) => t.id === id);
  if (idx < 0) {
    return (
      <div className="card stack-14">
        <h1 className="h2">{translate('ไม่พบหัวข้อนี้', 'Topic not found')}</h1>
        <a className="btn btn-secondary self-start" href="#/">{translate('กลับไปหน้าหัวข้อ', 'Back to topics')}</a>
      </div>
    );
  }
  const t = topics[idx];
  const prev = topics[idx - 1];
  const next = topics[idx + 1];
  const base = '#/topic/' + t.id;

  return (
    <div className="stack-20">
      <div className="crumbs"><a href="#/">{translate('หัวข้อทั้งหมด', 'All topics')}</a><span aria-hidden="true">/</span><span>{tracks[t.tr].name}</span></div>
      <div className="stack-12">
        <div className="row-8"><Badge>{t.code}</Badge>{t.temp && <span className="muted small">{translate('หัวข้อชั่วคราว หายเมื่อรีเฟรช', 'Temporary topic; cleared on refresh')}</span>}</div>
        <h1 className="h1">{t.title}</h1>
        <p className="lead">{t.blurb}</p>
        <div className="row">
          {prev && <a className="link" href={'#/topic/' + prev.id}>← {prev.title}</a>}
          {next && <a className="link" href={'#/topic/' + next.id}>{next.title} →</a>}
        </div>
      </div>
      <nav className="tabs" aria-label={translate('ส่วนของหัวข้อ', 'Topic sections')}>
        {TABS.map(([key, th]) => (
          (() => { const label = translate(th, ({ 'อ่าน': 'Learn', 'ลองตอบ': 'Quiz', 'แบบฝึกหัด': 'Exercises' })[th]); return (
          <a key={key} className="tab" href={key === 'learn' ? base : base + '/' + key} aria-current={tab === key ? 'page' : undefined}>{label}</a>
          ); })()
        ))}
      </nav>
      {tab === 'quiz' ? (
        t.questions.length ? (
          <QuestionRunner
            key={t.id}
            make={() => shuffle(t.questions.map((_, i) => i)).map((i) => makeItem(t, i))}
            exitHref={base}
            doneActions={[
              t.exercises.length > 0 && { label: translate('ไปทำแบบฝึกหัด', 'Go to exercises'), href: base + '/exercise', primary: true },
              next && { label: translate('หัวข้อถัดไป:', 'Next topic:') + ' ' + next.title, href: '#/topic/' + next.id },
            ].filter(Boolean)}
            topics={topics}
          />
        ) : (
              <Empty title={translate('หัวข้อนี้ยังไม่มีคำถาม', 'No questions in this topic yet')} text={translate('เพิ่มได้โดยนำเข้าไฟล์ที่มีส่วน ## Quiz', 'Add questions by importing a file with a ## Quiz section')} />
        )
      ) : tab === 'exercise' ? (
        t.exercises.length ? <Exercises key={t.id} list={t.exercises} /> : (
          <Empty title={translate('หัวข้อนี้ยังไม่มีแบบฝึกหัด', 'No exercises in this topic yet')} text={translate('แบบฝึกหัดที่ตรวจอัตโนมัติต้องเขียนเป็น JSON ที่มี exercise และ checks ดูตัวอย่างได้ที่หน้านำเข้า', 'Auto-checked exercises use JSON with exercise and checks fields. See the import page for an example.')} />
        )
      ) : (
        <Learn t={t} base={base} next={next} />
      )}
    </div>
  );
}

function Learn({ t: topic, base, next }) {
  const { t } = useI18n();
  return (
    <div className="stack-32 narrow">
      {TIERS.map(([titleTh, descTh], ti) => {
        const title = t(titleTh, ['Essentials', 'Recommended', 'Advanced'][ti]);
        const desc = t(descTh, ['Foundations for everyday work', 'Build stronger judgment', 'For larger systems and teams'][ti]);
        const items = topic.mustKnow.map((m, i) => ({ m, i })).filter(({ m }) => m.tier === ti);
        if (!items.length) return null;
        return (
          <section key={title} className="stack-12">
            <div className="tier-head"><h2 className="h2">{title}</h2><span className="muted">{desc}</span></div>
            {items.map(({ m, i }) => (
              <article key={i} className="card item">
                <div className="item-head">
                  <span className="mono muted">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{m.title}</h3>
                {m.exam && <Badge kind="soft">{t('มักถูกถาม', 'Commonly asked')}</Badge>}
                </div>
                <p>{m.body}</p>
                <Code>{m.code}</Code>
                {m.ref && <a className="link" href={m.ref} target="_blank" rel="noopener noreferrer">{t('อ่านต่อ', 'Read more')} ↗</a>}
              </article>
            ))}
          </section>
        );
      })}
      {topic.refs.length > 0 && (
        <section className="stack-12">
          <div className="tier-head"><h2 className="h2">{t('อ่านต่อ', 'Further reading')}</h2><span className="muted">{t('แหล่งอ้างอิงหลักของหัวข้อนี้', 'Primary references for this topic')}</span></div>
          <ul className="stack-12">
            {topic.refs.map((r) => (
              <li key={r.url}>
                <a className="link" href={r.url} target="_blank" rel="noopener noreferrer">{r.title} ↗</a>
                {r.note && <span className="muted small"> · {r.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="panel-dark stack-12">
        <h2 className="h3">{t('เข้าใจแล้วหรือยัง?', 'Ready to check your understanding?')}</h2>
        <p className="on-dark-muted">
          {topic.questions.length
            ? t('ลองตอบคำถาม', 'Try') + ' ' + topic.questions.length + ' ' + t('ข้อ ถ้าตอบผิดจะเห็นคำอธิบายทันทีว่าเข้าใจคลาดตรงไหน', 'questions. If you miss one, you’ll see where your understanding diverged.')
            : t('หัวข้อนี้ยังไม่มีคำถาม ไปต่อหัวข้อถัดไปได้เลย', 'No questions here yet. Continue to the next topic.')}
        </p>
        <div className="row">
          {topic.questions.length > 0 && <a className="btn btn-accent" href={base + '/quiz'}>{t('ลองตอบ', 'Try')} {topic.questions.length} {t('ข้อ', 'questions')}</a>}
          {next && <a className="btn btn-ghost-dark" href={'#/topic/' + next.id}>{t('หัวข้อถัดไป:', 'Next topic:')} {next.title}</a>}
        </div>
      </section>
    </div>
  );
}

function Exercises({ list }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  return (
    <div className="stack-20">
      {list.length > 1 && (
        <div className="chips" role="group" aria-label={t('เลือกแบบฝึกหัด', 'Choose an exercise')}>
          {list.map((x, n) => (
            <button key={n} type="button" className="chip" aria-pressed={n === i} onClick={() => setI(n)}>
              {t('ข้อ', 'Exercise')} {n + 1} · {t(x.level, ({ 'ง่าย': 'Easy', 'กลาง': 'Intermediate', 'ยาก': 'Advanced' })[x.level] || x.level)}
            </button>
          ))}
        </div>
      )}
      <Exercise key={i} exercise={list[i]} />
    </div>
  );
}

function Empty({ title, text }) {
  const { t } = useI18n();
  return (
    <section className="card card-dashed stack-12 narrow">
      <h2 className="h3">{title}</h2>
      <p>{text}</p>
      <a className="btn btn-secondary self-start" href="#/import">{t('ไปหน้านำเข้า', 'Go to import')}</a>
    </section>
  );
}
