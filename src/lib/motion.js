import { createElement, useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Số đếm tăng dần từ giá trị cũ tới giá trị mới (easeOutCubic) */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(reduced() ? target : 0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (reduced() || typeof target !== 'number') return setValue(target);
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function CountUp({ value, duration }) {
  return useCountUp(value, duration);
}

/** true sau frame đầu tiên – dùng để kích hoạt transition CSS khi vừa mount (vd thanh biểu đồ dài ra) */
export function useMounted(delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setM(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return m;
}

export const h = createElement;
