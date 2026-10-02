import { useMemo, useState } from 'react';
import { TRACKS } from '../content.js';
import { cleanTopic, parseContent, tierIndex, trackIndex } from '../lib/validate.js';
import { go } from '../lib/router.js';
import { Badge } from './ui.jsx';

const MD_TEMPLATE = `---
id: my-topic
title: ชื่อหัวข้อ
track: foundations   # หรือ data, delivery, ai
blurb: หัวข้อนี้ช่วยอะไร ประโยคเดียว
---

## ต้องรู้
### ชื่อเรื่อง
คำอธิบาย 1–3 ประโยค

## ควรรู้
- ชื่อเรื่อง :: คำอธิบายสั้น

## Quiz
### คำถาม?
- [x] คำตอบที่ถูก
- [ ] ตัวเลือกผิด
- [ ] ตัวเลือกผิด
- [ ] ตัวเลือกผิด
> ทำไมข้อนี้ถูก`;

const AI_PROMPT = `แปลงโน้ตใน <notes> เป็น Markdown สำหรับแอป Dev Trail ตามรูปแบบนี้เท่านั้น
- frontmatter: id (a-z, 0-9, -), title, track (foundations | data | delivery | ai), blurb
- ## ต้องรู้ / ## ควรรู้ / ## ขั้นสูง: แต่ละเรื่องขึ้นต้นด้วย ### ชื่อเรื่อง แล้วอธิบายให้คนเพิ่งเริ่มเข้าใจ 1–3 ประโยค
- ## Quiz: 8–10 ข้อที่วัดความเข้าใจ ไม่ใช่การท่องจำ แต่ละข้อขึ้นต้นด้วย ### คำถาม มีตัวเลือก 4 ข้อ (- [x] ข้อที่ถูก 1 ข้อ, - [ ] ข้อผิด) และ > คำอธิบายว่าทำไม
ใช้เฉพาะข้อมูลที่อยู่ในโน้ต ถ้าไม่แน่ใจให้ข้ามเรื่องนั้น

<notes>
[วางโน้ตของคุณที่นี่]
</notes>`;

const SAMPLE_MD = `---
id: k8s
title: Kubernetes เบื้องต้น
track: delivery
blurb: รัน container หลายตัวใน production ให้ดูแลตัวเองได้
---

## ต้องรู้
### Pod
หน่วยเล็กที่สุดที่ Kubernetes deploy ได้ มี container ตั้งแต่ 1 ตัวที่แชร์ network และ storage กัน

### Deployment
ประกาศว่าต้องการ pod กี่ตัวจาก image ไหน แล้ว Kubernetes จะสร้างและแทนที่ pod ให้ตรงตามนั้น รวมถึงทำ rolling update

### Service
ที่อยู่คงที่สำหรับเข้าถึงกลุ่ม pod เพราะ IP ของ pod เปลี่ยนได้ตลอด

## ควรรู้
- ConfigMap และ Secret :: แยกค่าตั้งค่าและความลับออกจาก image
- Liveness และ readiness probe :: บอกว่า container ยังทำงานอยู่ และพร้อมรับ traffic หรือไม่

## Quiz
### ทำไมไม่ควรเรียก pod ด้วย IP โดยตรง?
- [ ] IP ของ pod ยาวเกินไป
- [x] pod ถูกสร้างใหม่ได้ตลอดและได้ IP ใหม่ จึงควรเรียกผ่าน Service
- [ ] Kubernetes ไม่ให้ pod มี IP
- [ ] เพราะต้องใช้ HTTPS เสมอ
> Service ให้ชื่อและที่อยู่คงที่ และกระจาย traffic ไปยัง pod ที่พร้อมใช้งาน
`;

export default function ImportPage({ custom, setCustom, topics }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const parsed = useMemo(() => parseContent(text), [text]);
  const nErr = parsed ? parsed.errors.length : 0;
  const ok = !!parsed && !nErr && parsed.topics.length > 0;
  const cleaned = ok ? parsed.topics.map(cleanTopic) : [];
  const builtinIds = new Set(topics.filter((t) => !t.temp).map((t) => t.id));
  const json = cleaned.length ? JSON.stringify(cleaned.length === 1 ? cleaned[0] : cleaned, null, 2) + '\n' : '';

  const copy = async (value, done) => {
    try { await navigator.clipboard.writeText(value); setMsg(done); } catch { setMsg('คัดลอกอัตโนมัติไม่ได้ ให้เลือกข้อความแล้วคัดลอกเอง'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (cleaned.length === 1 ? cleaned[0].id : 'topics') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('ดาวน์โหลดแล้ว วางไฟล์ไว้ใน content/topics/ แล้ว push');
  };
  const tryNow = () => {
    setCustom([...custom.filter((c) => !cleaned.some((n) => n.id === c.id)), ...cleaned]);
    go('topic/' + cleaned[0].id);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => { setText(t); setMsg('อ่านไฟล์ ' + f.name + ' แล้ว'); });
    e.target.value = '';
  };

  return (
    <div className="stack-24">
      <div className="stack-6">
        <h1 className="h1">นำเข้าความรู้</h1>
        <p className="lead">วางโน้ตแบบ Markdown หรือ JSON ระบบจะตรวจและแสดงตัวอย่างให้ จากนั้นลองเรียนได้ทันที (ชั่วคราว) หรือนำไฟล์ไปใส่ใน repo ให้เป็นเนื้อหาถาวร</p>
      </div>

      <div className="split align-start">
        <section className="card stack-12">
          <div className="row-between">
            <label htmlFor="imp" className="label-lg">เนื้อหาที่จะนำเข้า</label>
            <Badge kind="soft">{parsed ? 'ตรวจพบ ' + parsed.format : 'Markdown หรือ JSON'}</Badge>
          </div>
          <textarea id="imp" className="import-box" spellCheck={false} placeholder="วาง Markdown หรือ JSON ที่นี่" value={text} onChange={(e) => { setText(e.target.value); setMsg(''); }} />
          <div className="row-8">
            <label className="btn btn-dark btn-sm file-btn">เลือกไฟล์ .md หรือ .json<input type="file" accept=".md,.markdown,.json,.txt" onChange={onFile} /></label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setText(SAMPLE_MD)}>ใส่ตัวอย่าง Markdown</button>
            <button type="button" className="link" onClick={() => setText('')}>ล้าง</button>
          </div>
        </section>

        <section className="stack-14" aria-live="polite">
          {!parsed && (
            <div className="card card-dashed stack-8">
              <div className="h3">ตัวอย่างจะขึ้นที่นี่</div>
              <p className="muted">วางข้อความทางซ้าย เลือกไฟล์ หรือกด “ใส่ตัวอย่าง Markdown” เพื่อดูรูปแบบ ระบบตรวจทันทีโดยยังไม่เพิ่มอะไร</p>
            </div>
          )}
          {parsed && (
            <>
              <div className={'status ' + (nErr ? 'status-bad' : 'status-ok')}>{nErr ? 'พบปัญหา ' + nErr + ' จุด ต้องแก้ก่อน' : 'ใช้ได้ ' + parsed.topics.length + ' หัวข้อ'}</div>
              {nErr > 0 && (
                <ul className="issues">
                  {parsed.errors.slice(0, 12).map((e, i) => <li key={i}><span className="mono">{e.where}</span><span>{e.msg}</span></li>)}
                </ul>
              )}
              {parsed.topics.filter((t) => t && typeof t === 'object').map((t, i) => <Preview key={i} t={t} isUpdate={builtinIds.has(t.id)} />)}
              {parsed.warnings.length > 0 && (
                <details className="card warn">
                  <summary>ข้อควรรู้ {parsed.warnings.length} ข้อ (ใช้ได้)</summary>
                  <ul className="issues issues-plain">
                    {parsed.warnings.slice(0, 10).map((w, i) => <li key={i}><span className="mono">{w.where}</span><span>{w.msg}</span></li>)}
                  </ul>
                </details>
              )}
              <div className="row-8">
                <button type="button" className="btn btn-primary" disabled={!ok} onClick={tryNow}>ลองเรียนเลย (ชั่วคราว)</button>
                <button type="button" className="btn btn-secondary" disabled={!ok} onClick={download}>ดาวน์โหลด .json</button>
                <button type="button" className="btn btn-secondary" disabled={!ok} onClick={() => copy(json, 'คัดลอก JSON แล้ว บันทึกเป็น content/topics/' + cleaned[0].id + '.json')}>คัดลอก JSON</button>
              </div>
            </>
          )}
          {msg && <p className="ok-text">{msg}</p>}
        </section>
      </div>

      <section className="card stack-14">
        <h2 className="h3">เพิ่มเป็นเนื้อหาถาวรใน GitHub</h2>
        <ol className="howto">
          <li><b>1</b>ดาวน์โหลดหรือคัดลอก JSON จากด้านบน</li>
          <li><b>2</b>บันทึกเป็น content/topics/&lt;id&gt;.json (หรือวางไฟล์ .md ใน content/topics/ ได้เลย)</li>
          <li><b>3</b>commit แล้ว push ขึ้น GitHub</li>
          <li><b>4</b>GitHub Actions ตรวจไฟล์ด้วยตัวตรวจเดียวกัน ถ้าผ่านก็ขึ้นเว็บใน 1–2 นาที</li>
        </ol>
      </section>

      <div className="split">
        <section className="card stack-10">
          <div className="row-between"><h3 className="h3">แม่แบบ Markdown</h3><button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(MD_TEMPLATE, 'คัดลอกแม่แบบแล้ว')}>คัดลอก</button></div>
          <p className="muted small">ใช้ ### ต่อเรื่อง หรือบรรทัดเดียวแบบ “- ชื่อเรื่อง :: คำอธิบาย” ส่วน Quiz ใส่ [x] กับข้อที่ถูก</p>
          <pre className="code"><code>{MD_TEMPLATE}</code></pre>
        </section>
        <section className="card stack-10">
          <div className="row-between"><h3 className="h3">ให้ AI แปลงโน้ตให้</h3><button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(AI_PROMPT, 'คัดลอก prompt แล้ว')}>คัดลอก prompt</button></div>
          <p className="muted small">มีโน้ตหรือบทความอยู่แล้ว ใช้ prompt นี้กับ AI แล้วนำผลมาวางด้านบน อ่านตรวจเนื้อหาก่อนทุกครั้ง</p>
          <pre className="code code-light wrap-pre"><code>{AI_PROMPT}</code></pre>
        </section>
      </div>

      {custom.length > 0 && (
        <section className="card list">
          <h2 className="h3 list-head">หัวข้อชั่วคราว (หายเมื่อรีเฟรช)</h2>
          {custom.map((c) => (
            <div key={c.id} className="list-row row-12">
              <b className="grow">{c.title || c.id}</b>
              <a className="btn btn-secondary btn-sm" href={'#/topic/' + c.id}>เปิด</a>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setCustom(custom.filter((x) => x.id !== c.id))}>เอาออก</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Preview({ t, isUpdate }) {
  const mk = Array.isArray(t.mustKnow) ? t.mustKnow : [];
  const qs = Array.isArray(t.questions) ? t.questions : [];
  const tr = trackIndex(t.track);
  const count = (n) => mk.filter((m) => tierIndex(m?.tier) === n).length;
  const q0 = qs[0];
  return (
    <article className="card stack-12">
      <div className="row-8">
        <Badge>{t.id || '(ไม่มี id)'}</Badge>
        <Badge kind="dark">{isUpdate ? 'อัปเดตหัวข้อเดิม' : 'หัวข้อใหม่'}</Badge>
        <span className="muted small">{tr >= 0 ? TRACKS[tr].name : 'track ไม่ถูกต้อง'}</span>
      </div>
      <h3 className="card-title">{t.title || '(ไม่มีชื่อ)'}</h3>
      <div>ต้องรู้ {count(0)} · ควรรู้ {count(1)} · ขั้นสูง {count(2)} · คำถาม {qs.length} · แบบฝึกหัด {t.exercise ? '1' : 'ไม่มี'}</div>
      <ul className="tierlist">
        {mk.slice(0, 6).map((m, i) => <li key={i}><span>{['ต้องรู้', 'ควรรู้', 'ขั้นสูง'][tierIndex(m?.tier)]}</span>{m?.title || '—'}</li>)}
      </ul>
      {q0 && (
        <div className="answer stack-4">
          <div className="label">ตัวอย่างคำถามข้อแรก</div>
          <b>{q0.prompt}</b>
          {Array.isArray(q0.options) && q0.options[q0.answer] !== undefined && <span className="ok-text small">เฉลย: {q0.options[q0.answer]}</span>}
        </div>
      )}
    </article>
  );
}
