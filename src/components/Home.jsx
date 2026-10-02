import { useState } from 'react';
import { TRACKS } from '../content.js';
import { Badge, Check } from './ui.jsx';

export default function Home({ topics, onPlacement }) {
  const [filter, setFilter] = useState('all');
  const first = topics[0];
  return (
    <div className="stack-32">
      <section className="hero">
        <h1>อ่านให้เข้าใจ แล้วลองตอบ</h1>
        <p>
          {topics.length} หัวข้อสำหรับนักพัฒนา ตั้งแต่พื้นฐานการเขียนโปรแกรมจนถึง AI Agent ไม่ต้อง login และไม่เก็บคะแนน
          เปิดหัวข้อไหนก็ได้ตามที่อยากเข้าใจ
        </p>
        <ol className="steps">
          <li><span>1</span>อ่านสิ่งที่ต้องรู้ พร้อมคำอธิบายและตัวอย่าง</li>
          <li><span>2</span>ลองตอบคำถาม เห็นคำอธิบายทันทีทุกข้อ</li>
          <li><span>3</span>ลงมือทำแบบฝึกหัด มี hint และเฉลย</li>
        </ol>
        <div className="row">
          {first && <a className="btn btn-accent" href={'#/topic/' + first.id}>เริ่มที่ {first.title}</a>}
          <a className="btn btn-ghost-dark" href="#/practice">ฝึกรวมแบบสุ่ม</a>
          <button type="button" className="btn btn-ghost-dark" onClick={onPlacement}>ทดสอบวัดระดับ</button>
        </div>
      </section>

      <section className="stack-20">
        <div className="section-head">
          <div>
            <h2 className="h2">หัวข้อทั้งหมด</h2>
            <p className="muted">การ์ดแสดงเรื่องที่ “ต้องรู้” ของแต่ละหัวข้อ เปิดหัวข้อเพื่ออ่านคำอธิบายเต็ม</p>
          </div>
          <div className="chips" role="group" aria-label="กรองตามเส้นทาง">
            {[{ id: 'all', name: 'ทั้งหมด' }, ...TRACKS].map((t) => (
              <button key={t.id} type="button" className="chip" aria-pressed={filter === t.id} onClick={() => setFilter(t.id)}>{t.name}</button>
            ))}
          </div>
        </div>
        {TRACKS.map((tr, ti) => (filter === 'all' || filter === tr.id) && (
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
  const must = t.mustKnow.filter((m) => m.tier === 0);
  return (
    <article className="card stack-14">
      <div className="row-8">
        <Badge>{t.code}</Badge>
        {t.temp && <Badge kind="temp">ชั่วคราว</Badge>}
      </div>
      <div>
        <h4 className="card-title">{t.title}</h4>
        <p className="muted small">{t.blurb}</p>
      </div>
      <div>
        <div className="label accent">ต้องรู้</div>
        <ul className="checklist">
          {must.map((m) => <li key={m.title}><Check />{m.title}</li>)}
        </ul>
      </div>
      <div className="muted small">
        {t.mustKnow.length} เรื่องให้อ่าน · {t.questions.length} คำถาม · {t.exercises.length ? t.exercises.length + ' แบบฝึกหัด' : 'ไม่มีแบบฝึกหัด'}
      </div>
      <div className="row-8">
        <a className="btn btn-dark grow" href={'#/topic/' + t.id}>อ่าน</a>
        {t.questions.length > 0 && <a className="btn btn-secondary grow" href={'#/topic/' + t.id + '/quiz'}>ลองตอบ</a>}
      </div>
    </article>
  );
}
