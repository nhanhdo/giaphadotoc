import { useEffect, useState } from 'react';

/** Theo dõi media query, vd useMedia('(min-width: 1024px)') */
export function useMedia(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = () => setMatches(mq.matches);
    h();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return matches;
}

/** Breakpoint dùng chung với Tailwind: md = 768, lg = 1024, xl = 1280 */
export const useIsDesktop = () => useMedia('(min-width: 1024px)');
export const useIsPhone = () => !useMedia('(min-width: 768px)');
