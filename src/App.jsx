import { useMemo, useState } from 'react';
import { mergeTopics } from './content.js';
import { useI18n } from './i18n.jsx';
import { localizeAttempt } from './lib/locale.js';
import { useRoute, go } from './lib/router.js';
import Home from './components/Home.jsx';
import TopicPage from './components/TopicPage.jsx';
import Practice from './components/Practice.jsx';
import Exams, { examDefs, newExam } from './components/Exams.jsx';
import ImportPage from './components/ImportPage.jsx';

const NAV = [
  ['', 'หัวข้อ', 'Topics'],
  ['practice', 'ฝึกรวม', 'Practice'],
  ['exams', 'บททดสอบ', 'Exams'],
  ['import', 'นำเข้า', 'Import'],
];

export default function App() {
  const route = useRoute();
  const { language, setLanguage, t, tracks, exams } = useI18n();
  const [custom, setCustom] = useState([]);
  const topics = useMemo(() => mergeTopics(custom, language), [custom, language]);
  // Exam state lives here so a running exam survives moving between pages.
  const [exam, setExam] = useState(null);
  const [examResult, setExamResult] = useState(null);

  const definitions = useMemo(() => examDefs(topics, exams, tracks, language), [topics, exams, tracks, language]);
  const displayedExam = useMemo(() => localizeAttempt(exam, topics, definitions), [exam, topics, definitions]);
  const displayedResult = useMemo(() => localizeAttempt(examResult, topics, definitions), [examResult, topics, definitions]);

  const page = route[0] || '';
  const startPlacement = () => {
    const def = definitions.find((d) => d.id === 'placement');
    setExamResult(null);
    setExam(newExam(def));
    go('exams');
  };

  let body;
  if (page === 'topic') body = <TopicPage topics={topics} id={route[1]} tab={route[2] || 'learn'} />;
  else if (page === 'practice') body = <Practice topics={topics} />;
  else if (page === 'exams') body = <Exams topics={topics} exam={displayedExam} setExam={setExam} result={displayedResult} setResult={setExamResult} />;
  else if (page === 'import') body = <ImportPage custom={custom} setCustom={setCustom} topics={topics} />;
  else body = <Home topics={topics} onPlacement={startPlacement} />;

  const current = page === 'topic' ? '' : page;
  return (
    <div className="app">
      <a className="skip" href="#main">{t('ข้ามไปเนื้อหา', 'Skip to content')}</a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="brand" href="#/" aria-label={t('Dev Trail หน้าแรก', 'Dev Trail home')}>
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#101814" />
              <path d="M8 23c4 0 4-6 8-6s4-6 8-6" stroke="#7FC8A0" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="8" cy="23" r="2.5" fill="#fff" />
              <circle cx="24" cy="11" r="2.5" fill="#fff" />
            </svg>
            <span>Dev Trail</span>
          </a>
          <nav aria-label={t('เมนูหลัก', 'Main navigation')} className="nav">
            {NAV.map(([path, th, en]) => (
              <a key={path} href={'#/' + path} className="nav-link" aria-current={current === path ? 'page' : undefined}>
                {t(th, en)}
                {path === 'exams' && exam ? <span className="dot" aria-label={t('กำลังสอบอยู่', 'Exam in progress')} /> : null}
              </a>
            ))}
          </nav>
          <div className="language-switch" role="group" aria-label={t('ภาษา', 'Language')}>
            {[['th', 'ไทย'], ['en', 'English']].map(([code, label]) => (
              <button key={code} type="button" lang={code} aria-pressed={language === code} onClick={() => setLanguage(code)}>{label}</button>
            ))}
          </div>
        </div>
      </header>
      <main id="main" className="wrap main">{body}</main>
      <footer className="footer">
        <div className="wrap">{t('ไม่เก็บคะแนนหรือความคืบหน้า · เนื้อหาทั้งหมดอยู่ใน GitHub repo เป็นไฟล์ JSON', 'Scores and progress are not saved · All content is stored as JSON in the GitHub repository')}</div>
      </footer>
    </div>
  );
}
