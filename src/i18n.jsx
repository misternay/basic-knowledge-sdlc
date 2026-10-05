import { createContext, useContext, useEffect, useState } from 'react';
import { TRACKS, EXAMS, EN_TRACKS, EN_EXAMS } from './content.js';
import { initialLanguage, LANGUAGE_KEY, LANGUAGES } from './lib/locale.js';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => initialLanguage());
  const setLanguage = (next) => {
    if (!LANGUAGES.includes(next)) return;
    setLanguageState(next);
    try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Private browsing may disable storage. */ }
  };
  useEffect(() => {
    document.documentElement.lang = language;
    document.querySelector('meta[name="description"]')?.setAttribute('content', language === 'th'
      ? 'เรียนเรื่องที่นักพัฒนาควรรู้ อ่านให้เข้าใจ แล้วลองตอบ'
      : 'Learn essential developer topics, test your understanding, and practice with exercises.');
  }, [language]);
  return (
    <I18nContext.Provider value={{
      language, setLanguage,
      t: (th, en) => language === 'en' ? en : th,
      tracks: language === 'en' ? EN_TRACKS : TRACKS,
      exams: language === 'en' ? EN_EXAMS : EXAMS,
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
