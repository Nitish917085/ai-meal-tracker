import { useEffect, useRef, useState } from 'react';

/** Measure an element's width and re-render on resize (for pixel-accurate SVG charts). */
export function useElementWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || fallback);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
}
