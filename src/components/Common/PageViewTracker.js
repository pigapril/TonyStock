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
      event: 'page_view',
      page_path: location.pathname,
      page_location: window.location.href,
      page_title: document.title
    });
  }, [location]);

  return null;
} 
