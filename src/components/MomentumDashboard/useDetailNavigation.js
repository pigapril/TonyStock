import { useEffect, useRef } from 'react';

export default function useDetailNavigation(selected, detailRef, triggerRef, active = true, focusOnDesktop = true) {
  const scrollPosition = useRef(0);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!active) return;
    const mobile = window.matchMedia?.('(max-width: 900px)')?.matches;
    if (selected) {
      if (!wasOpen.current) scrollPosition.current = window.scrollY;
      if (mobile || focusOnDesktop) detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollTo?.({ top: 0, behavior: 'auto' });
      if (mobile) detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    } else if (wasOpen.current) {
      triggerRef.current?.focus({ preventScroll: true });
      if (mobile) window.scrollTo?.({ top: scrollPosition.current, behavior: 'auto' });
    }
    wasOpen.current = Boolean(selected);
  }, [selected, active, detailRef, triggerRef, focusOnDesktop]);
}
