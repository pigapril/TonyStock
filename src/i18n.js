import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import Backend from 'i18next-http-backend'; // 不再需要

// 直接 import json 檔案
import en from './locales/en/translation.json';
import zhTW from './locales/zh-TW/translation.json';

// Dev-only: record every key passed to t() so we can verify "unused" claims
// from static analysis against real runtime behavior. Reset from the crawler
// via window.__i18nCalledKeys__ = new Set().
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.__i18nCalledKeys__ = window.__i18nCalledKeys__ || new Set();
}

// 初始化 i18n，直接用 resources
i18n
  // .use(Backend) // 不再需要
  .use(initReactI18next)
  .init({
    fallbackLng: {
      'zh': ['zh-TW', 'en'],
      'default': ['en']
    },
    debug: process.env.NODE_ENV === 'development',
    supportedLngs: ['en', 'zh-TW', 'zh'],
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW }
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
