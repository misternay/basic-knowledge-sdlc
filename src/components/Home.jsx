import { useState } from 'react';
import { useI18n } from '../i18n.jsx';
import { Badge, Check } from './ui.jsx';

export default function Home({ topics, onPlacement }) {
  const { t, tracks } = useI18n();
  const [filter, setFilter] = useState('all');
  const first = topics[0];
  return (
    <div className="stack-32">
      <section className="hero">
        <h1>{t('อ่านให้เข้าใจ แล้วลองตอบ', 'Understand it, then try it')}</h1>
        <p>
          {topics.length} {t('หัวข้อสำหรับนักพัฒนา ตั้งแต่พื้นฐานการเขียนโปรแกรมจนถึง AI Agent ไม่ต้อง login และไม่เก็บคะแนน เปิดหัวข้อไหนก็ได้ตามที่อยากเข้าใจ', 'topics for developers, from programming fundamentals to AI agents. No login or score tracking. Start with any topic you want to understand.')}
        </p>
        <ol className="steps">
          <li><span>1</span>{t('อ่านสิ่งที่ต้องรู้ พร้อมคำอธิบายและตัวอย่าง', 'Learn the essentials with explanations and examples')}</li>
          <li><span>2</span>{t('ลองตอบคำถาม เห็นคำอธิบายทันทีทุกข้อ', 'Answer questions and see an explanation for each one')}</li>
          <li><span>3</span>{t('ลงมือทำแบบฝึกหัด มี hint และเฉลย', 'Practice with exercises, hints, and solutions')}</li>
        </ol>
        <div className="row">
          {first && <a className="btn btn-accent" href={'#/topic/' + first.id}>{t('เริ่มที่', 'Start with')} {first.title}</a>}
          <a className="btn btn-ghost-dark" href="#/practice">{t('ฝึกรวมแบบสุ่ม', 'Mixed practice')}</a>
          <button type="button" className="btn btn-ghost-dark" onClick={onPlacement}>{t('ทดสอบวัดระดับ', 'Take a placement test')}</button>
        </div>
      </section>

      <section className="stack-20">
        <div className="section-head">
          <div>
            <h2 className="h2">{t('หัวข้อทั้งหมด', 'All topics')}</h2>
            <p className="muted">{t('การ์ดแสดงเรื่องที่ “ต้องรู้” ของแต่ละหัวข้อ เปิดหัวข้อเพื่ออ่านคำอธิบายเต็ม', 'Each card highlights the essentials. Open a topic to read the full explanations.')}</p>
          </div>
          <div className="chips" role="group" aria-label={t('กรองตามเส้นทาง', 'Filter by track')}>
            {[{ id: 'all', name: t('ทั้งหมด', 'All') }, ...tracks].map((track) => (
              <button key={track.id} type="button" className="chip" aria-pressed={filter === track.id} onClick={() => setFilter(track.id)}>{track.name}</button>
            ))}
          </div>
        </div>
        {tracks.map((tr, ti) => (filter === 'all' || filter === tr.id) && (
          <section key={tr.id} className="stack-14">
            <div className="track-head">
              <span className="mono accent">{tr.num}</span>
              <h3>{tr.name}</h3>
              <span className="muted">{tr.th}</span>
            </div>
            <div className="grid-cards">
              {topics.filter((t) => t.tr === ti).map((t) => <TopicCard key={t.id} t={t} />)}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}

function TopicCard({ t }) {
  const { t: translate } = useI18n();
  const must = t.mustKnow.filter((m) => m.tier === 0);
  return (
    <article className="card stack-14">
      <div className="row-8">
        <Badge>{t.code}</Badge>
        {t.temp && <Badge kind="temp">{translate('ชั่วคราว', 'Temporary')}</Badge>}
      </div>
      <div>
        <h4 className="card-title">{t.title}</h4>
        <p className="muted small">{t.blurb}</p>
      </div>
      <div>
        <div className="label accent">{translate('ต้องรู้', 'Essentials')}</div>
        <ul className="checklist">
          {must.map((m) => <li key={m.title}><Check />{m.title}</li>)}
        </ul>
      </div>
      <div className="muted small">
        {t.mustKnow.length} {translate('เรื่องให้อ่าน', 'concepts')} · {t.questions.length} {translate('คำถาม', 'questions')} · {t.exercises.length ? t.exercises.length + ' ' + translate('แบบฝึกหัด', 'exercises') : translate('ไม่มีแบบฝึกหัด', 'no exercises')}
      </div>
      <div className="row-8">
        <a className="btn btn-dark grow" href={'#/topic/' + t.id}>{translate('อ่าน', 'Learn')}</a>
        {t.questions.length > 0 && <a className="btn btn-secondary grow" href={'#/topic/' + t.id + '/quiz'}>{translate('ลองตอบ', 'Quiz')}</a>}
      </div>
    </article>
  );
}
