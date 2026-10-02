# คู่มือเขียนเนื้อหา Dev Trail

ผู้อ่านคือนักพัฒนาไทยที่เรียนเอง เป้าหมายคือ **เข้าใจ** ไม่ใช่ท่องจำ แอปไม่เก็บคะแนน

## ไฟล์

- 1 หัวข้อ = 1 ไฟล์ `content/topics/<id>.json` (หรือ `.md` ตามรูปแบบในหน้า “นำเข้า”)
- ชื่อไฟล์ต้องตรงกับ `id`
- ตรวจด้วย `node scripts/check-content.mjs content/topics/<id>.json` ต้องได้ error 0

## โครงสร้าง JSON

```json
{
  "id": "sql", "code": "D1", "track": "data",
  "title": "Database / SQL",
  "blurb": "ประโยคเดียวว่าหัวข้อนี้ช่วยอะไร",
  "mustKnow": [
    { "tier": "must", "title": "JOIN", "body": "…", "code": "SELECT …" }
  ],
  "questions": [
    { "prompt": "…", "code": "…", "options": ["…", "…", "…", "…"], "answer": 1, "explain": "…" }
  ],
  "exercise": {
    "title": "…", "level": "ง่าย", "tags": "JOIN · GROUP BY", "lang": "sql",
    "prompt": "…", "context": "…", "starter": "…", "solution": "…",
    "hints": ["…", "…", "…"],
    "checks": [
      { "label": "JOIN ผ่าน customer_id", "pattern": "join\\s+\\w+.*on[^;]*customer_id" },
      { "label": "ไม่ต่อ string จาก input", "pattern": "\\+\\s*req\\.query", "negate": true },
      { "label": "email อยู่ใน required", "json": { "path": "input_schema.required", "op": "contains", "value": "email" } }
    ]
  }
}
```

- `track`: foundations | data | delivery | ai
- `tier`: must | should | advanced
- `code` (ไม่บังคับ) ใน mustKnow และ questions
- `answer` เริ่มนับจาก 0 (แอปสลับลำดับตัวเลือกเองทุกครั้ง)
- `exercise.lang`: sql | javascript | shell | yaml | dockerfile | markdown | json
- `level`: ง่าย | กลาง | ยาก

## เกณฑ์คุณภาพ

**ภาษา** ภาษาไทยที่เป็นธรรมชาติ ศัพท์เทคนิคใช้ภาษาอังกฤษตามที่นักพัฒนาใช้จริง ไม่ใช้ emoji

**mustKnow 10–12 เรื่อง** must 5–6 · should 3–4 · advanced 2
- ชื่อเรื่องสั้น (ไม่เกิน ~60 ตัวอักษร)
- body 2–4 ประโยค: มันคืออะไร → ทำไมสำคัญหรือใช้เมื่อไร → ตัวอย่างหรือกับดักที่พบบ่อย
- ใส่ `code` เฉพาะเมื่อช่วยให้เข้าใจจริง สั้นไม่เกิน ~12 บรรทัด

**questions 10 ข้อพอดี**
- วัดความเข้าใจด้วยสถานการณ์จริง ไม่ถามนิยามล้วน ๆ
- 4 ตัวเลือก ถูก 1 ข้อเท่านั้น ตัวเลือกผิดต้องฟังดูเป็นไปได้และสะท้อนความเข้าใจผิดที่พบบ่อย
- ห้ามใช้ “ถูกทุกข้อ” “ไม่มีข้อใดถูก” และอย่าให้ข้อถูกยาวกว่าข้ออื่นอย่างเห็นได้ชัด
- `explain` 1–3 ประโยค: ทำไมข้อถูกจึงถูก และทำไมตัวเลือกผิดที่น่าเลือกที่สุดจึงผิด
- หัวข้อที่เกี่ยวกับโค้ด ให้มีคำถามที่มี `code` อย่างน้อย 2 ข้อ

**exercise 1 ข้อ**
- โจทย์จากงานจริง ทำเสร็จได้ใน 10–20 นาที
- `starter` ต้องไม่ผ่านเกณฑ์อย่างน้อย 1 ข้อ และ `solution` ต้องผ่านทุกข้อ (ตัวตรวจเช็กให้)
- checks 4–7 ข้อ · pattern เป็นตัวพิมพ์เล็ก เพราะทดสอบกับคำตอบที่แปลงเป็นตัวพิมพ์เล็กและตัด comment แล้ว ใช้ flag `im`
- อย่าเขียนเกณฑ์ที่ปฏิเสธคำตอบที่ถูกแบบอื่นที่พบบ่อย (เช่น alias แบบมีหรือไม่มี AS)
- lang เป็น json ให้ใช้ `json` checks (op: exists | equals | contains | containsAll | matches)
- hints 3 ข้อ ไล่จากใบ้กว้างไปใบ้แคบ

**ความถูกต้อง**
- ข้อมูลต้องถูกต้อง ณ ปลายปี 2026 เรื่องที่ไม่แน่ใจให้ค้นยืนยันก่อน ถ้ายังไม่แน่ใจให้ตัดออก
- ห้ามแต่งตัวเลขสถิติ ชื่อเวอร์ชัน หรือชื่อ package ที่ไม่มีจริง
