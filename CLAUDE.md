# Dev Trail

เว็บทบทวนความรู้สำหรับนักพัฒนา 14 หัวข้อ ใช้เรียนเองคนเดียว เน้นทำความเข้าใจ ไม่เน้นความคืบหน้า
React 19 + Vite 8 (JSX ไม่มี TypeScript) เป็น static site บน GitHub Pages

## หลักที่ตั้งใจไว้ (อย่าเพิ่มโดยไม่ถามก่อน)
- ไม่มี login ไม่มี backend ไม่มีฐานข้อมูล
- ไม่เก็บคะแนน ประวัติ หรือความคืบหน้า (รีเฟรชแล้วเริ่มใหม่ ไม่ใช้ localStorage)
- เนื้อหาทั้งหมดเป็นไฟล์ใน `content/topics/` และถูก bundle ตอน build
- ใช้ hash route (`#/topic/sql`) และ `base: './'` เพื่อให้ทำงานบน GitHub Pages โดยไม่ต้องตั้ง rewrite
- UI เป็นภาษาไทย

## คำสั่ง
```bash
npm ci
npm run dev            # http://localhost:5173
npm run check:content  # ตรวจเนื้อหาแบบ strict
npm test               # node --test tests/*.test.mjs
npm run build          # check:content แล้ว vite build -> dist/
```
ต้องใช้ Node 20.19+ หรือ 22.12+ (CI ใช้ 24)

## โครงสร้าง
- `content/topics/<id>.json` เนื้อหาที่เว็บใช้จริง (วาง `.md` ได้ด้วย) ชื่อไฟล์ต้องตรงกับ `id`
- `content/AUTHORING.md` กติกาการเขียนเนื้อหา อ่านก่อนแก้เนื้อหาทุกครั้ง
- `content/tracks.json`, `content/exams.json` เส้นทาง 4 สาย และชนิดบททดสอบ
- `src/lib/validate.js` ตัวตรวจเนื้อหา ใช้ร่วมกันทั้งหน้า "นำเข้า" และ `scripts/check-content.mjs`
- `src/lib/markdown.js` แปลง Markdown เป็น topic, `src/lib/checks.js` ตรวจคำตอบแบบฝึกหัด
- `src/components/` หน้า Home, TopicPage, QuestionRunner, Exercise, Practice, Exams, ImportPage
- `.github/workflows/deploy.yml` ตรวจเนื้อหา, test, build แล้ว deploy Pages เมื่อ push ขึ้น `main` (PR ตรวจแต่ไม่ deploy)

## กติกาเนื้อหา (สรุปจาก AUTHORING.md)
- ภาษาไทย ไม่ใช้ emoji ข้อเท็จจริงต้องถูกต้อง ณ ปัจจุบัน ไม่แต่งเวอร์ชันหรือชื่อ package
- ต่อหัวข้อ: mustKnow 10–12 เรื่อง (must 5–6, should 3–4, advanced 2), คำถามสถานการณ์ 10 ข้อมีคำอธิบายทุกข้อ, แบบฝึกหัด 1 ข้อ
- regex ของแบบฝึกหัดเทียบกับคำตอบตัวพิมพ์เล็กที่ตัดคอมเมนต์แล้ว (flag `im`) เฉลยต้องผ่านทุกเกณฑ์ starter ต้องไม่ผ่านทั้งหมด
- แก้เนื้อหาแล้วต้องรัน `npm run check:content` และ `npm test` ให้ผ่านก่อน commit

## ในโฟลเดอร์นี้แต่ไม่ใช่ส่วนของโปรเจกต์
`exam-prep-30-days/` เป็นงานอีกชิ้น ถูกกันไว้ใน `.git/info/exclude` ห้ามแก้และห้าม commit
