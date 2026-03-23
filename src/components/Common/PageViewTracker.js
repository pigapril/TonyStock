import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { ensureDataLayer } from '../../utils/deferredScripts';

export function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dataLayer = ensureDataLayer();
    dataLayer.push({
      event: 'pageview',
      page: {
        path: location.pathname,
        title: document.title
      }
    });
  }, [location]);

  return null;
} 
