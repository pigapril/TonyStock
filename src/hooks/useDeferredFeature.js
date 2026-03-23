import { useEffect, useState } from 'react';

function scheduleIdle(callback, timeoutMs) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(id);
}

export function useDeferredFeature({
  timeoutMs = 0,
  useIdleCallback = false,
  triggerOnInteraction = false
} = {}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady || typeof window === 'undefined') {
      return undefined;
    }

    let cleanedUp = false;
    const cleanups = [];

    const markReady = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      setIsReady(true);
      cleanups.forEach((cleanup) => cleanup());
    };

    if (useIdleCallback) {
      cleanups.push(scheduleIdle(markReady, Math.max(timeoutMs, 1_000)));
    } else {
      const timer = window.setTimeout(markReady, timeoutMs);
      cleanups.push(() => window.clearTimeout(timer));
    }

    if (triggerOnInteraction) {
      const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
      const handleInteraction = () => markReady();

      events.forEach((eventName) => {
        window.addEventListener(eventName, handleInteraction, { passive: true, once: true });
        cleanups.push(() => window.removeEventListener(eventName, handleInteraction));
      });
    }

    return () => {
      cleanedUp = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [isReady, timeoutMs, triggerOnInteraction, useIdleCallback]);

  return isReady;
}
