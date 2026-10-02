import { useEffect, useState } from 'react';

// Hash routes work on GitHub Pages without server rewrites:
// #/  ·  #/topic/sql  ·  #/topic/sql/quiz  ·  #/practice  ·  #/exams  ·  #/import
const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (path) => { window.location.hash = '#/' + path; };
