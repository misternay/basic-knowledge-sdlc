import { useState } from 'react';
import { runChecks } from '../lib/checks.js';
import { Code } from './ui.jsx';

const FILES = { sql: 'solution.sql', javascript: 'solution.js', shell: 'commands.sh', markdown: 'answer.md', dockerfile: 'Dockerfile', yaml: 'ci.yml', json: 'tool.json' };

export default function Exercise({ exercise: x }) {
  const [code, setCode] = useState(x.starter || '');
  const [results, setResults] = useState(null);
  const [showSol, setShowSol] = useState(false);
  const [hints, setHints] = useState(0);
  const allHints = x.hints || [];
  const pass = results ? results.filter((r) => r.ok).length : 0;

  const onKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.target;
      const a = el.selectionStart;
      const b = el.selectionEnd;
      setCode(el.value.slice(0, a) + '  ' + el.value.slice(b));
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2; });
    } else if (e.key === 'Escape') e.target.blur();
  };

  return (
    <div className="stack-20">
      <div className="split">
        <div className="stack-12">
          <div className="row-8"><span className="badge badge-soft">{x.level}</span><span className="muted small">{x.tags}</span></div>
          <h2 className="h2">{x.title}</h2>
          <p>{x.prompt}</p>
        </div>
        <div className="stack-12">
          {x.context && <div><div className="label">ข้อมูลประกอบ</div><pre className="code code-light"><code>{x.context}</code></pre></div>}
          <div className="row-between">
            <div className="label">Hint {hints}/{allHints.length}</div>
            <button type="button" className="btn btn-secondary btn-sm" disabled={hints >= allHints.length} onClick={() => setHints(hints + 1)}>
              {hints === 0 ? 'ขอ hint ข้อแรก' : hints >= allHints.length ? 'แสดงครบแล้ว' : 'ขอ hint ถัดไป'}
            </button>
          </div>
          {allHints.slice(0, hints).map((h, i) => <div key={i} className="hint"><b className="mono">{i + 1}.</b> {h}</div>)}
        </div>
      </div>

      <div className="split">
        <div className="editor">
          <div className="editor-bar">
            <label htmlFor="editor" className="mono">{FILES[x.lang] || 'answer.txt'}</label>
            <span className="push">Tab = ย่อหน้า · Esc = ออกจากช่อง</span>
          </div>
          <textarea id="editor" spellCheck={false} value={code} onKeyDown={onKeyDown} onChange={(e) => { setCode(e.target.value); setResults(null); }} />
        </div>
        {showSol && (
          <div className="solution">
            <div className="solution-bar">เฉลยตัวอย่าง · เทียบกับของคุณ (ไม่เขียนทับ)</div>
            <Code>{x.solution}</Code>
          </div>
        )}
      </div>

      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => setResults(runChecks(x, code))}>ตรวจโครงสร้าง</button>
        <button type="button" className="btn btn-secondary" onClick={() => setShowSol(!showSol)}>{showSol ? 'ซ่อนเฉลย' : 'เปิดเฉลยข้าง ๆ'}</button>
        <button type="button" className="btn btn-secondary" onClick={() => { setCode(x.starter || ''); setResults(null); }}>เริ่มใหม่</button>
      </div>

      <div aria-live="polite">
        {results && (
          <section className="card stack-14">
            <div className="row-12 baseline">
              <h3 className="h3">{pass === results.length ? 'โครงสร้างครบทุกเกณฑ์' : 'ยังขาดบางส่วน'}</h3>
              <span className="muted">ผ่าน {pass} / {results.length} เกณฑ์</span>
            </div>
            <p className="muted small">
              {x.lang === 'json'
                ? 'ระบบ parse JSON จริงแล้วตรวจโครงสร้าง ส่วนความเหมาะสมของคำอธิบายให้เทียบกับเฉลย'
                : 'ตรวจจากรูปแบบของคำตอบ ไม่ได้รันโค้ดจริง คำตอบที่ถูกแต่เขียนต่างออกไปอาจไม่ผ่านบางข้อ ให้เทียบกับเฉลยประกอบ'}
            </p>
            <ul className="results">
              {results.map((r) => (
                <li key={r.label}><span className={'mark ' + (r.ok ? 'mark-ok' : 'mark-bad')}>{r.ok ? 'ผ่าน' : 'ยังขาด'}</span>{r.label}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
