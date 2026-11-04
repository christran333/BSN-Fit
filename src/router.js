// Hash routing (#/coach, #/r/mia-7kq) so the app works on GitHub Pages
// with no server config.
import { useEffect, useState } from 'react';

const current = () => window.location.hash.replace(/^#/, '') || '/coach';

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => {
      setPath(current());
      document.querySelector('.screen-scroll')?.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export const go = (path) => { window.location.hash = path; };

export const linkFor = (token) =>
  `${window.location.origin}${window.location.pathname}#/r/${token}`;
