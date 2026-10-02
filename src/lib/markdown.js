// Markdown → topic JSON. Format:
// ---
// id: k8s
// title: Kubernetes เบื้องต้น
// track: delivery
// blurb: …
// ---
// ## ต้องรู้ / ## ควรรู้ / ## ขั้นสูง   → ### ชื่อเรื่อง + ย่อหน้า, หรือ "- ชื่อ :: คำอธิบาย"
// ## Quiz → ### คำถาม, "- [x] ถูก", "- [ ] ผิด", "> คำอธิบาย"
// ```fenced code``` attaches to the current item or question.

export function parseMarkdown(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const errors = [];
  const warnings = [];
  const fm = {};
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (lines[i] && lines[i].trim() === '---') {
    const start = i + 1;
    i++;
    while (i < lines.length && lines[i].trim() !== '---') {
      const m = lines[i].match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
      if (m) fm[m[1].toLowerCase()] = m[2].replace(/\s+#.*$/, '').trim();
      i++;
    }
    if (i >= lines.length) errors.push({ where: 'บรรทัด ' + start, msg: 'frontmatter ไม่มี --- ปิดท้าย' });
    i++;
  }
  const topic = { id: fm.id, code: fm.code, track: fm.track, title: fm.title, blurb: fm.blurb, mustKnow: [], questions: [] };
  Object.keys(topic).forEach((k) => topic[k] === undefined && delete topic[k]);
  let sec = null;
  let item = null;
  let q = null;
  let inCode = false;
  let codeBuf = [];
  let codeTarget = null;
  const flushQ = () => { if (q) { topic.questions.push(q); q = null; } };

  for (; i < lines.length; i++) {
    const raw = lines[i];
    const ln = i + 1;
    const t = raw.trim();
    if (inCode) {
      if (t.startsWith('```')) { inCode = false; if (codeTarget) codeTarget.code = codeBuf.join('\n'); codeBuf = []; }
      else codeBuf.push(raw);
      continue;
    }
    if (t.startsWith('```')) {
      inCode = true;
      codeTarget = sec === 'quiz' ? q : item;
      if (!codeTarget) warnings.push({ where: 'บรรทัด ' + ln, msg: 'บล็อกโค้ดนี้ไม่อยู่ใต้หัวข้อย่อย ### จะถูกข้าม' });
      continue;
    }
    if (/^#\s+/.test(t)) { if (!topic.title) topic.title = t.replace(/^#\s+/, ''); continue; }
    if (/^##\s+/.test(t)) {
      flushQ();
      item = null;
      const name = t.replace(/^##\s+/, '').toLowerCase();
      if (/quiz|คำถาม|แบบทดสอบ/.test(name)) sec = 'quiz';
      else if (/ควรรู้|should/.test(name)) sec = 'should';
      else if (/ขั้นสูง|advanced/.test(name)) sec = 'advanced';
      else if (/ต้องรู้|must/.test(name)) sec = 'must';
      else { sec = null; warnings.push({ where: 'บรรทัด ' + ln, msg: 'ไม่รู้จักหัวข้อ “' + t + '” เนื้อหาใต้หัวข้อนี้จะถูกข้าม' }); }
      continue;
    }
    if (/^###\s+/.test(t)) {
      const title = t.replace(/^###\s+/, '');
      if (sec === 'quiz') { flushQ(); q = { prompt: title, options: [], answer: -1, explain: '', _line: ln, _x: 0 }; }
      else if (sec) { item = { tier: sec, title, body: '' }; topic.mustKnow.push(item); }
      else warnings.push({ where: 'บรรทัด ' + ln, msg: 'หัวข้อย่อยนี้ไม่อยู่ใต้ ## ต้องรู้ / ## ควรรู้ / ## ขั้นสูง / ## Quiz' });
      continue;
    }
    if (!t) continue;
    if (sec === 'quiz') {
      if (!q) { warnings.push({ where: 'บรรทัด ' + ln, msg: 'ข้อความนี้ไม่อยู่ใต้คำถาม ### จะถูกข้าม' }); continue; }
      const om = t.match(/^[-*]\s*\[( |x|X)\]\s*(.+)$/);
      if (om) { if (om[1].toLowerCase() === 'x') { q.answer = q.options.length; q._x++; } q.options.push(om[2]); continue; }
      if (t.startsWith('>')) { q.explain = (q.explain ? q.explain + ' ' : '') + t.replace(/^>\s?/, ''); continue; }
      q.prompt += ' ' + t;
      continue;
    }
    if (sec) {
      const bm = t.match(/^[-*]\s+(.+?)\s*::\s*(.+)$/);
      if (bm) { item = { tier: sec, title: bm[1], body: bm[2] }; topic.mustKnow.push(item); continue; }
      if (item) { item.body = (item.body ? item.body + ' ' : '') + t; continue; }
      warnings.push({ where: 'บรรทัด ' + ln, msg: 'ข้อความนี้ไม่อยู่ใต้หัวข้อย่อย ### จะถูกข้าม' });
    }
  }
  if (inCode) errors.push({ where: 'บรรทัด ' + lines.length, msg: 'บล็อกโค้ด ``` ไม่ได้ปิด' });
  flushQ();
  for (const qq of topic.questions) {
    if (qq._x !== 1) errors.push({ where: 'บรรทัด ' + qq._line, msg: 'คำถาม “' + qq.prompt.slice(0, 40) + '” ต้องมีคำตอบที่ถูก [x] 1 ข้อ (พบ ' + qq._x + ')' });
    qq.line = qq._line;
    delete qq._line;
    delete qq._x;
  }
  return { topics: [topic], errors, warnings, format: 'Markdown' };
}
