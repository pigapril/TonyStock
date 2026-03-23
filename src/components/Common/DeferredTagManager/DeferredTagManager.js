import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useDeferredFeature } from '../../../hooks/useDeferredFeature';
import { ensureGoogleTagManager } from '../../../utils/deferredScripts';

const DEFAULT_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
const ANALYSIS_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'];

export function getTagManagerDeferConfig(pathname = '') {
  const normalizedPath = pathname.toLowerCase();
  const isAnalysisRoute = normalizedPath.includes('/priceanalysis') || normalizedPath.includes('/market-sentiment');
  const isLocalizedRoot = /^\/[^/]+\/?$/.test(pathname);

  if (isLocalizedRoot) {
    return {
      timeoutMs: 10000,
      useIdleCallback: true,
      triggerOnInteraction: false,
      interactionEvents: DEFAULT_INTERACTION_EVENTS
    };
  }

  if (isAnalysisRoute) {
    return {
      timeoutMs: 20000,
      useIdleCallback: true,
      triggerOnInteraction: true,
      interactionEvents: ANALYSIS_INTERACTION_EVENTS
    };
  }

  return {
    timeoutMs: 2500,
    useIdleCallback: true,
    triggerOnInteraction: true,
    interactionEvents: DEFAULT_INTERACTION_EVENTS
  };
}

export function DeferredTagManager({
  containerId = 'GTM-NR4P4S7W',
  environment = process.env.NODE_ENV
}) {
  const location = useLocation();
  const config = getTagManagerDeferConfig(location.pathname || '');
  const shouldLoadTagManager = useDeferredFeature(config);

  useEffect(() => {
    if (!shouldLoadTagManager || environment !== 'production') {
      return;
    }

    Promise.resolve(ensureGoogleTagManager(containerId)).catch((error) => {
      console.warn('Failed to defer-load Google Tag Manager:', error);
    });
  }, [containerId, environment, shouldLoadTagManager]);

  return null;
}

export default DeferredTagManager;
