import { useEffect, useState } from 'react';

/**
 * Router tối giản theo hash (#/tree, #/accounts…) – không cần cấu hình rewrite trên Vercel.
 */
const current = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

export function useHashRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const h = () => setRoute(current());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return route;
}

export const navigate = (path) => {
  if (current() !== path) window.location.hash = path;
};
