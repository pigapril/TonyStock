import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'pageview',
        page: {
          path: location.pathname,
          title: document.title
        }
      });
    }
  }, [location]);

  return null;
} 