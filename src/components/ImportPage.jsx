import { useMemo, useState } from 'react';
import { useI18n } from '../i18n.jsx';
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

const MD_TEMPLATE_EN = `---
id: my-topic
title: Topic title
track: foundations   # or data, delivery, ai
blurb: What this topic helps with, in one sentence
---

## ต้องรู้
### Concept title
Explain the idea in 1–3 sentences

## ควรรู้
- Concept title :: short explanation

## Quiz
### A question?
- [x] Correct answer
- [ ] Incorrect option
- [ ] Incorrect option
- [ ] Incorrect option
> Explain why the answer is correct`;

const AI_PROMPT = `แปลงโน้ตใน <notes> เป็น Markdown สำหรับแอป Dev Trail ตามรูปแบบนี้เท่านั้น
- frontmatter: id (a-z, 0-9, -), title, track (foundations | data | delivery | ai), blurb
- ## ต้องรู้ / ## ควรรู้ / ## ขั้นสูง: แต่ละเรื่องขึ้นต้นด้วย ### ชื่อเรื่อง แล้วอธิบายให้คนเพิ่งเริ่มเข้าใจ 1–3 ประโยค
- ## Quiz: 8–10 ข้อที่วัดความเข้าใจ ไม่ใช่การท่องจำ แต่ละข้อขึ้นต้นด้วย ### คำถาม มีตัวเลือก 4 ข้อ (- [x] ข้อที่ถูก 1 ข้อ, - [ ] ข้อผิด) และ > คำอธิบายว่าทำไม
ใช้เฉพาะข้อมูลที่อยู่ในโน้ต ถ้าไม่แน่ใจให้ข้ามเรื่องนั้น

<notes>
[วางโน้ตของคุณที่นี่]
</notes>`;

const AI_PROMPT_EN = `Convert the notes in <notes> to Markdown for the Dev Trail app. Follow this format exactly:
- Frontmatter: id (a-z, 0-9, -), title, track (foundations | data | delivery | ai), blurb
- ## ต้องรู้ / ## ควรรู้ / ## ขั้นสูง: each concept starts with ### Title and has a 1–3 sentence explanation for a beginner
- ## Quiz: 8–10 questions that test understanding, not memorization. Start each with ### Question, include four options (- [x] for exactly one correct answer, - [ ] for incorrect options), and > an explanation
Use only information in the notes. Skip anything uncertain.

<notes>
[Paste your notes here]
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

const SAMPLE_MD_EN = `---
id: k8s
title: Kubernetes Basics
track: delivery
blurb: Run containers in production with Kubernetes handling recovery and availability
---

## ต้องรู้
### Pod
The smallest unit Kubernetes deploys. A pod can contain one or more containers that share networking and storage.

### Deployment
Declares how many pods to run and which image to use. Kubernetes creates and replaces pods to match, including rolling updates.

### Service
A stable address for a group of pods, whose individual IP addresses can change at any time.

## ควรรู้
- ConfigMap and Secret :: Keep configuration and sensitive values outside the image
- Liveness and readiness probes :: Report whether a container is running and ready for traffic

## Quiz
### Why should you avoid calling a pod directly by IP?
- [ ] Pod IP addresses are too long
- [x] Pods can be recreated with new IPs, so use a Service instead
- [ ] Kubernetes does not assign IP addresses to pods
- [ ] HTTPS is always required
> A Service provides a stable name and address and routes traffic to ready pods
`;

export default function ImportPage({ custom, setCustom, topics }) {
  const { t, tracks, language } = useI18n();
  const contentDir = language === 'en' ? 'content/en/topics/' : 'content/topics/';
  const mdTemplate = language === 'en' ? MD_TEMPLATE_EN : MD_TEMPLATE;
  const aiPrompt = language === 'en' ? AI_PROMPT_EN : AI_PROMPT;
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const parsed = useMemo(() => parseContent(text, { language }), [text, language]);
  const nErr = parsed ? parsed.errors.length : 0;
  const ok = !!parsed && !nErr && parsed.topics.length > 0;
  const cleaned = ok ? parsed.topics.map(cleanTopic) : [];
  const builtinIds = new Set(topics.filter((t) => !t.temp).map((t) => t.id));
  const json = cleaned.length ? JSON.stringify(cleaned.length === 1 ? cleaned[0] : cleaned, null, 2) + '\n' : '';

  const copy = async (value, done) => {
    try { await navigator.clipboard.writeText(value); setMsg(done); } catch { setMsg(['คัดลอกอัตโนมัติไม่ได้ ให้เลือกข้อความแล้วคัดลอกเอง', 'Could not copy automatically. Select the text and copy it manually.']); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (cleaned.length === 1 ? cleaned[0].id : 'topics') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg(['ดาวน์โหลดแล้ว บันทึกไฟล์ใน ' + contentDir, 'Downloaded. Save the file in ' + contentDir]);
  };
  const tryNow = () => {
    setCustom([...custom.filter((c) => !cleaned.some((n) => n.id === c.id)), ...cleaned]);
    go('topic/' + cleaned[0].id);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((contents) => { setText(contents); setMsg(['อ่านไฟล์ ' + f.name + ' แล้ว', 'Read file ' + f.name]); });
    e.target.value = '';
  };

  return (
    <div className="stack-24">
      <div className="stack-6">
        <h1 className="h1">{t('นำเข้าความรู้', 'Import knowledge')}</h1>
        <p className="lead">{t('วางโน้ตแบบ Markdown หรือ JSON ระบบจะตรวจและแสดงตัวอย่างให้ จากนั้นลองเรียนได้ทันที (ชั่วคราว) หรือนำไฟล์ไปใส่ใน repo ให้เป็นเนื้อหาถาวร', 'Paste Markdown or JSON to validate and preview it. Try it temporarily or add the file to the repo as permanent content.')}</p>
      </div>

      <div className="split align-start">
        <section className="card stack-12">
          <div className="row-between">
            <label htmlFor="imp" className="label-lg">{t('เนื้อหาที่จะนำเข้า', 'Content to import')}</label>
            <Badge kind="soft">{parsed ? t('ตรวจพบ', 'Detected') + ' ' + parsed.format : 'Markdown or JSON'}</Badge>
          </div>
          <textarea id="imp" className="import-box" spellCheck={false} placeholder={t('วาง Markdown หรือ JSON ที่นี่', 'Paste Markdown or JSON here')} value={text} onChange={(e) => { setText(e.target.value); setMsg(null); }} />
          <div className="row-8">
            <label className="btn btn-dark btn-sm file-btn">{t('เลือกไฟล์ .md หรือ .json', 'Choose .md or .json file')}<input type="file" accept=".md,.markdown,.json,.txt" onChange={onFile} /></label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setText(language === 'en' ? SAMPLE_MD_EN : SAMPLE_MD)}>{t('ใส่ตัวอย่าง Markdown', 'Load Markdown example')}</button>
            <button type="button" className="link" onClick={() => setText('')}>{t('ล้าง', 'Clear')}</button>
          </div>
        </section>

        <section className="stack-14" aria-live="polite">
          {!parsed && (
            <div className="card card-dashed stack-8">
              <div className="h3">{t('ตัวอย่างจะขึ้นที่นี่', 'Preview appears here')}</div>
              <p className="muted">{t('วางข้อความทางซ้าย เลือกไฟล์ หรือกด “ใส่ตัวอย่าง Markdown” เพื่อดูรูปแบบ ระบบตรวจทันทีโดยยังไม่เพิ่มอะไร', 'Paste text, choose a file, or load the Markdown example. Content is checked immediately and is not added yet.')}</p>
            </div>
          )}
          {parsed && (
            <>
              <div className={'status ' + (nErr ? 'status-bad' : 'status-ok')}>{nErr ? t('พบปัญหา', 'Found issues') + ' ' + nErr : t('ใช้ได้', 'Valid') + ' ' + parsed.topics.length + ' ' + t('หัวข้อ', 'topics')}</div>
              {nErr > 0 && (
                <ul className="issues">
                  {parsed.errors.slice(0, 12).map((e, i) => <li key={i}><span className="mono">{e.where}</span><span>{e.msg}</span></li>)}
                </ul>
              )}
              {parsed.topics.filter((t) => t && typeof t === 'object').map((t, i) => <Preview key={i} t={t} isUpdate={builtinIds.has(t.id)} />)}
              {parsed.warnings.length > 0 && (
                <details className="card warn">
                  <summary>{t('ข้อควรรู้', 'Warnings')} {parsed.warnings.length} ({t('ใช้ได้', 'content is still valid')})</summary>
                  <ul className="issues issues-plain">
                    {parsed.warnings.slice(0, 10).map((w, i) => <li key={i}><span className="mono">{w.where}</span><span>{w.msg}</span></li>)}
                  </ul>
                </details>
              )}
              <div className="row-8">
                <button type="button" className="btn btn-primary" disabled={!ok} onClick={tryNow}>{t('ลองเรียนเลย (ชั่วคราว)', 'Try it now (temporary)')}</button>
                <button type="button" className="btn btn-secondary" disabled={!ok} onClick={download}>{t('ดาวน์โหลด .json', 'Download .json')}</button>
                <button type="button" className="btn btn-secondary" disabled={!ok} onClick={() => copy(json, ['คัดลอก JSON แล้ว บันทึกเป็น ', 'JSON copied. Save as '].map((label) => label + contentDir + cleaned[0].id + '.json'))}>{t('คัดลอก JSON', 'Copy JSON')}</button>
              </div>
            </>
          )}
          {msg && <p className="ok-text">{t(...msg)}</p>}
        </section>
      </div>

      <section className="card stack-14">
        <h2 className="h3">{t('เพิ่มเป็นเนื้อหาถาวรใน GitHub', 'Add permanent content to GitHub')}</h2>
        <ol className="howto">
          <li><b>1</b>{t('ดาวน์โหลดหรือคัดลอก JSON จากด้านบน', 'Download or copy the JSON above')}</li>
          <li><b>2</b>{t('บันทึกเป็น ', 'Save as ')}<code>{contentDir}&lt;id&gt;.json</code>{t(' หรือไฟล์ .md ในโฟลเดอร์เดียวกัน', ' or a .md file in the same folder')}</li>
          <li><b>3</b>{t('เพิ่มคำแปลอีกภาษาโดยใช้ id และโค้ดเดียวกัน แล้ว commit และ push ขึ้น GitHub', 'Add the other language using the same id and code, then commit and push to GitHub')}</li>
          <li><b>4</b>{t('GitHub Actions ตรวจไฟล์ด้วยตัวตรวจเดียวกัน ถ้าผ่านก็ขึ้นเว็บใน 1–2 นาที', 'GitHub Actions validates the file. If it passes, the site updates in 1–2 minutes.')}</li>
        </ol>
      </section>

      <div className="split">
        <section className="card stack-10">
          <div className="row-between"><h3 className="h3">{t('แม่แบบ Markdown', 'Markdown template')}</h3><button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(mdTemplate, ['คัดลอกแม่แบบแล้ว', 'Template copied'])}>{t('คัดลอก', 'Copy')}</button></div>
          <p className="muted small">{t('ใช้ ### ต่อเรื่อง หรือบรรทัดเดียวแบบ “- ชื่อเรื่อง :: คำอธิบาย” ส่วน Quiz ใส่ [x] กับข้อที่ถูก', 'Use ### for each concept, or a single line like “- Title :: short explanation”. Mark the correct quiz option with [x].')}</p>
          <pre className="code"><code>{mdTemplate}</code></pre>
        </section>
        <section className="card stack-10">
          <div className="row-between"><h3 className="h3">{t('ให้ AI แปลงโน้ตให้', 'Ask AI to format your notes')}</h3><button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(aiPrompt, ['คัดลอก prompt แล้ว', 'Prompt copied'])}>{t('คัดลอก prompt', 'Copy prompt')}</button></div>
          <p className="muted small">{t('มีโน้ตหรือบทความอยู่แล้ว ใช้ prompt นี้กับ AI แล้วนำผลมาวางด้านบน อ่านตรวจเนื้อหาก่อนทุกครั้ง', 'Use this prompt with your notes or article, then paste the result above. Review the content before importing.')}</p>
          <pre className="code code-light wrap-pre"><code>{aiPrompt}</code></pre>
        </section>
      </div>

      {custom.length > 0 && (
        <section className="card list">
          <h2 className="h3 list-head">{t('หัวข้อชั่วคราว (หายเมื่อรีเฟรช)', 'Temporary topics (cleared on refresh)')}</h2>
          {custom.map((c) => (
            <div key={c.id} className="list-row row-12">
              <b className="grow">{c.title || c.id}</b>
              <a className="btn btn-secondary btn-sm" href={'#/topic/' + c.id}>{t('เปิด', 'Open')}</a>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setCustom(custom.filter((x) => x.id !== c.id))}>{t('เอาออก', 'Remove')}</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Preview({ t: topic, isUpdate }) {
  const { t, tracks } = useI18n();
  const mk = Array.isArray(topic.mustKnow) ? topic.mustKnow : [];
  const qs = Array.isArray(topic.questions) ? topic.questions : [];
  const tr = trackIndex(topic.track);
  const count = (n) => mk.filter((m) => tierIndex(m?.tier) === n).length;
  const q0 = qs[0];
  return (
    <article className="card stack-12">
      <div className="row-8">
        <Badge>{topic.id || t('(ไม่มี id)', '(no id)')}</Badge>
        <Badge kind="dark">{isUpdate ? t('อัปเดตหัวข้อเดิม', 'Updating existing topic') : t('หัวข้อใหม่', 'New topic')}</Badge>
        <span className="muted small">{tr >= 0 ? tracks[tr].name : t('track ไม่ถูกต้อง', 'Invalid track')}</span>
      </div>
      <h3 className="card-title">{topic.title || t('(ไม่มีชื่อ)', '(no title)')}</h3>
      <div>{t('ต้องรู้', 'Essentials')} {count(0)} · {t('ควรรู้', 'Recommended')} {count(1)} · {t('ขั้นสูง', 'Advanced')} {count(2)} · {t('คำถาม', 'Questions')} {qs.length} · {t('แบบฝึกหัด', 'Exercises')} {(Array.isArray(topic.exercises) ? topic.exercises.length : topic.exercise ? 1 : 0) || t('ไม่มี', 'None')}</div>
      <ul className="tierlist">
        {mk.slice(0, 6).map((m, i) => <li key={i}><span>{t(['ต้องรู้', 'ควรรู้', 'ขั้นสูง'][tierIndex(m?.tier)], ['Essentials', 'Recommended', 'Advanced'][tierIndex(m?.tier)])}</span>{m?.title || '—'}</li>)}
      </ul>
      {q0 && (
        <div className="answer stack-4">
          <div className="label">{t('ตัวอย่างคำถามข้อแรก', 'Sample question')}</div>
          <b>{q0.prompt}</b>
          {Array.isArray(q0.options) && q0.options[q0.answer] !== undefined && <span className="ok-text small">{t('เฉลย:', 'Answer:')} {q0.options[q0.answer]}</span>}
        </div>
      )}
    </article>
  );
}
