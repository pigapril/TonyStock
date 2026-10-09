import { useEffect, useRef, useState } from 'react';

// Observe a permanent section wrapper so placeholders do not trigger eager imports.
export function useNearViewport() {
  const ref = useRef(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setIsNear(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px', threshold: 0 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isNear];
}
