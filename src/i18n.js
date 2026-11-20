import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { loadCommonLocales } from './locales/loadCommonLocales';
import {
  DEFAULT_LOCALE,
  I18NEXT_SUPPORTED_LNGS,
  getInitialLanguage,
  getLocaleFallbacks,
} from './locales/localeConfig';

// Resolve the initial language from the URL/browser before loading any copy.
// The generated loader registry uses dynamic imports, so only this locale and
// its configured fallback chain are requested for the initial page view.
const initialLanguage = getInitialLanguage(
  typeof window === 'undefined' ? '' : window.location.pathname,
  typeof navigator === 'undefined' ? '' : navigator.language || navigator.userLanguage || ''
);

// Dev-only: record every key passed to t() so we can verify "unused" claims
// from static analysis against real runtime behavior. Reset from the crawler
// via window.__i18nCalledKeys__ = new Set().
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.__i18nCalledKeys__ = window.__i18nCalledKeys__ || new Set();
}

// Keep every language switch safe, including callers outside the router
// (dialogs, embedded flows and tests). i18next's own init-time switch runs
// before isInitialized; subsequent switches must load common resources first.
const changeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (language, callback) => {
  const resourcesReady = i18n.isInitialized
    ? loadCommonLocales(i18n, language)
    : Promise.resolve();
  return resourcesReady.then(() => changeLanguage(language, callback));
};

// Initialize i18next first, then load the selected locale and fallback before
// index.js mounts React. This prevents the UI from briefly rendering missing
// keys or English copy while a non-English common chunk is still downloading.
const i18nInitialized = i18n
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: language => {
      const fallbacks = getLocaleFallbacks(language);
      return fallbacks.length ? fallbacks : (language === DEFAULT_LOCALE ? [] : [DEFAULT_LOCALE]);
    },
    debug: process.env.NODE_ENV === 'development',
    supportedLngs: I18NEXT_SUPPORTED_LNGS,
    interpolation: {
      escapeValue: false,
    },
    // Dev-only: capture every t() call that resolves to a missing key.
    // Crawler reads window.__i18nMissingKeys__ to collect the full set.
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: process.env.NODE_ENV === 'development'
      ? (lngs, ns, key) => {
          if (typeof window === 'undefined') return;
          if (!window.__i18nMissingKeys__) window.__i18nMissingKeys__ = {};
          const bucket = window.__i18nMissingKeys__;
          for (const lng of lngs) {
            const id = `${lng}::${ns}::${key}`;
            bucket[id] = (bucket[id] || 0) + 1;
          }
        }
      : undefined,
  });

export const i18nReady = i18nInitialized.then(() => loadCommonLocales(i18n, initialLanguage));
export const loadLocaleCommonResources = language => loadCommonLocales(i18n, language);

// Dev-only: wrap t() to record every call (including successful ones).
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const origT = i18n.t.bind(i18n);
  i18n.t = function (key, ...args) {
    try {
      if (typeof key === 'string') window.__i18nCalledKeys__.add(key);
      else if (Array.isArray(key)) key.forEach(k => typeof k === 'string' && window.__i18nCalledKeys__.add(k));
    } catch {}
    return origT(key, ...args);
  };
}

export default i18n;
