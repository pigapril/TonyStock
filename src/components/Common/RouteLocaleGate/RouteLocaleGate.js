import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadRouteLocales } from '../../../locales/loadRouteLocales';
import { getRouteLocaleGroups } from '../../../locales/resourceGroups';

// Wait for route copy before mounting the page, including direct/deep links.
// A new language/path cannot render the previous request's ready state.
export default function RouteLocaleGate({ lang, pathname, fallback = null, children }) {
  const { i18n, t } = useTranslation();
  const key = `${lang}:${getRouteLocaleGroups(pathname).join(',')}`;
  const [state, setState] = useState({ key: null, status: 'loading' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    loadRouteLocales(i18n, lang, pathname).then(async () => {
      if (!active) return;
      if (i18n.language !== lang) await i18n.changeLanguage(lang);
      if (active) setState({ key, status: 'ready' });
    }).catch(() => {
      if (active) setState({ key, status: 'error' });
    });
    return () => { active = false; };
  }, [i18n, key, lang, pathname, retry]);

  if (state.key === key && state.status === 'error') {
    return <div className="loading-container" role="alert">
      <p>{t('common.errorLoading')}</p>
      <button className="ui-button ui-button--secondary" onClick={() => {
        setState({ key, status: 'loading' });
        setRetry(value => value + 1);
      }}>{t('common.retry')}</button>
    </div>;
  }
  return state.key === key && state.status === 'ready' && i18n.language === lang ? children : fallback;
}
