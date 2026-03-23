import { useEffect, useState } from 'react';

const DEFAULT_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

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
  triggerOnInteraction = false,
  interactionEvents = DEFAULT_INTERACTION_EVENTS
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
      const handleInteraction = () => markReady();

      interactionEvents.forEach((eventName) => {
        window.addEventListener(eventName, handleInteraction, { passive: true, once: true });
        cleanups.push(() => window.removeEventListener(eventName, handleInteraction));
      });
    }

    return () => {
      cleanedUp = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [interactionEvents, isReady, timeoutMs, triggerOnInteraction, useIdleCallback]);

  return isReady;
}
