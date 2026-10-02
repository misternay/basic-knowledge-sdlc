import { useMemo, useState } from 'react';
import { mergeTopics } from './content.js';
import { useRoute, go } from './lib/router.js';
import Home from './components/Home.jsx';
import TopicPage from './components/TopicPage.jsx';
import Practice from './components/Practice.jsx';
import Exams, { examDefs, newExam } from './components/Exams.jsx';
import ImportPage from './components/ImportPage.jsx';

const NAV = [
  ['', 'หัวข้อ'],
  ['practice', 'ฝึกรวม'],
  ['exams', 'บททดสอบ'],
  ['import', 'นำเข้า'],
];

export default function App() {
  const route = useRoute();
  const [custom, setCustom] = useState([]);
  const topics = useMemo(() => mergeTopics(custom), [custom]);
  // Exam state lives here so a running exam survives moving between pages.
  const [exam, setExam] = useState(null);
  const [examResult, setExamResult] = useState(null);

  const page = route[0] || '';
  const startPlacement = () => {
    const def = examDefs(topics).find((d) => d.id === 'placement');
    setExamResult(null);
    setExam(newExam(def));
    go('exams');
  };

  let body;
  if (page === 'topic') body = <TopicPage topics={topics} id={route[1]} tab={route[2] || 'learn'} />;
  else if (page === 'practice') body = <Practice topics={topics} />;
  else if (page === 'exams') body = <Exams topics={topics} exam={exam} setExam={setExam} result={examResult} setResult={setExamResult} />;
  else if (page === 'import') body = <ImportPage custom={custom} setCustom={setCustom} topics={topics} />;
  else body = <Home topics={topics} onPlacement={startPlacement} />;

  const current = page === 'topic' ? '' : page;
  return (
    <div className="app">
      <a className="skip" href="#main">ข้ามไปเนื้อหา</a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="brand" href="#/" aria-label="Dev Trail หน้าแรก">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#101814" />
              <path d="M8 23c4 0 4-6 8-6s4-6 8-6" stroke="#7FC8A0" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="8" cy="23" r="2.5" fill="#fff" />
              <circle cx="24" cy="11" r="2.5" fill="#fff" />
            </svg>
            <span>Dev Trail</span>
          </a>
          <nav aria-label="เมนูหลัก" className="nav">
            {NAV.map(([path, label]) => (
              <a key={label} href={'#/' + path} className="nav-link" aria-current={current === path ? 'page' : undefined}>
                {label}
                {path === 'exams' && exam ? <span className="dot" aria-label="กำลังสอบอยู่" /> : null}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="wrap main">{body}</main>
      <footer className="footer">
        <div className="wrap">ไม่เก็บคะแนนหรือความคืบหน้า · เนื้อหาทั้งหมดอยู่ใน GitHub repo เป็นไฟล์ JSON</div>
      </footer>
    </div>
  );
}
