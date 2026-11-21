// Single source of truth for runtime-supported locales.
// Keep legacy URL aliases separate: `/zh/*` is an old URL that redirects to
// `/zh-TW/*`, not a distinct translation. Simplified Chinese has its own
// canonical `/zh-CN/*` route.
const LOCALES = [
  {
    code: 'en',
    nativeName: 'English',
    intlLocale: 'en-US',
    socialAssetSuffix: '-en',
    fallback: [],
  },
  {
    code: 'zh-TW',
    nativeName: '繁體中文',
    intlLocale: 'zh-TW',
    socialAssetSuffix: '',
    writingSystem: 'cjk',
    fallback: ['en'],
  },
  {
    code: 'zh-HK',
    nativeName: '繁體中文（香港）',
    intlLocale: 'zh-HK',
    socialAssetSuffix: '-zh-HK',
    writingSystem: 'cjk',
    fallback: ['en'],
  },
  {
    code: 'zh-CN',
    nativeName: '简体中文',
    intlLocale: 'zh-CN',
    socialAssetSuffix: '-zh-CN',
    writingSystem: 'cjk',
    fallback: ['en'],
  },
  {
    code: 'ko-KR',
    nativeName: '한국어',
    intlLocale: 'ko-KR',
    socialAssetSuffix: '-ko-KR',
    writingSystem: 'cjk',
    fallback: ['en'],
  },
];

const DEFAULT_LOCALE = 'en';
const LEGACY_LOCALE_ALIASES = { zh: 'zh-TW' };
// Retained for compatibility with callers that distinguish formatting-only
// locale aliases. Korean is now a fully registered runtime locale.
const FORMAT_ONLY_LOCALES = {};
const LOCALE_BY_CODE = new Map(LOCALES.map(locale => [locale.code.toLowerCase(), locale]));
const LOCALE_CODES = LOCALES.map(locale => locale.code);
const LEGACY_LOCALE_CODES = Object.keys(LEGACY_LOCALE_ALIASES);
const I18NEXT_SUPPORTED_LNGS = [...LOCALE_CODES, ...LEGACY_LOCALE_CODES];

function getLocaleConfig(code) {
  const normalized = String(code || '').toLowerCase();
  const canonical = LEGACY_LOCALE_ALIASES[normalized] || normalized;
  return LOCALE_BY_CODE.get(canonical.toLowerCase()) || null;
}

function getCanonicalLocale(code) {
  return getLocaleConfig(code)?.code || DEFAULT_LOCALE;
}

function getIntlLocale(code) {
  const normalized = String(code || '').toLowerCase();
  return getLocaleConfig(code)?.intlLocale
    || FORMAT_ONLY_LOCALES[normalized]
    || getLocaleConfig(DEFAULT_LOCALE).intlLocale;
}

// Payment APIs and ECPay currently support Taiwan Traditional Chinese and
// English. Hong Kong Traditional Chinese uses the provider's existing CHT
// language while retaining zh-HK as the application return locale.
function getPaymentServiceLocale(code) {
  return ['zh-TW', 'zh-HK'].includes(getCanonicalLocale(code)) ? 'zh-TW' : 'en';
}

function getLocaleFallbacks(code) {
  const normalized = String(code || '').toLowerCase();
  const canonical = getCanonicalLocale(normalized);
  const locale = getLocaleConfig(canonical);
  const fallbacks = locale?.fallback || [];
  return [...new Set([
    ...(LEGACY_LOCALE_ALIASES[normalized] ? [canonical] : []),
    ...fallbacks,
  ])].filter(fallback => fallback !== normalized);
}

function getLocaleResourceChain(code) {
  const canonical = getCanonicalLocale(code);
  return [...new Set([canonical, ...getLocaleFallbacks(code)])];
}

function getBrowserLocale(browserLanguage = '') {
  const language = String(browserLanguage || '').trim().toLowerCase();
  if (!language) return DEFAULT_LOCALE;

  // Exact BCP 47 matches must win (for example, a future zh-CN locale should
  // not be swallowed by the generic Chinese fallback below).
  const exact = LOCALE_BY_CODE.get(language);
  if (exact) return exact.code;

  // Preserve explicit Hong Kong and Taiwan distinctions before applying the
  // generic Traditional Chinese fallback. Hans, mainland China and Singapore
  // select Simplified; bare `zh` and unspecified Hant retain legacy zh-TW.
  if (language === 'zh' || language.startsWith('zh-')) {
    if (language === 'zh-hk' || language === 'zh-hant-hk') {
      return LOCALE_BY_CODE.get('zh-hk')?.code || DEFAULT_LOCALE;
    }
    if (language === 'zh-tw' || language === 'zh-hant-tw') {
      return LOCALE_BY_CODE.get('zh-tw')?.code || DEFAULT_LOCALE;
    }
    if (language.includes('-hans') || language === 'zh-cn' || language === 'zh-sg') {
      return LOCALE_BY_CODE.get('zh-cn')?.code || DEFAULT_LOCALE;
    }
    return LOCALE_BY_CODE.get('zh-tw')?.code || DEFAULT_LOCALE;
  }

  const baseLanguage = language.split('-')[0];
  const baseMatch = LOCALES.find(locale => locale.code.toLowerCase().split('-')[0] === baseLanguage);
  return baseMatch?.code || DEFAULT_LOCALE;
}

function getInitialLanguage(pathname = '', browserLanguage = '') {
  // An explicit locale in the URL always wins over the browser preference.
  const firstSegment = String(pathname || '').split('/').filter(Boolean)[0];
  if (firstSegment) {
    const normalized = firstSegment.toLowerCase();
    if (LEGACY_LOCALE_ALIASES[normalized]) return normalized;
    const match = LOCALE_BY_CODE.get(normalized);
    return match?.code || DEFAULT_LOCALE;
  }
  return getBrowserLocale(browserLanguage);
}

function stripLocalePrefix(pathname = '') {
  const segments = String(pathname || '').split('/');
  const firstSegment = segments[1]?.toLowerCase();
  if (!firstSegment || (!LOCALE_BY_CODE.has(firstSegment) && !LEGACY_LOCALE_ALIASES[firstSegment])) {
    return pathname;
  }
  return `/${segments.slice(2).join('/')}` || '/';
}

module.exports = {
  DEFAULT_LOCALE,
  FORMAT_ONLY_LOCALES,
  I18NEXT_SUPPORTED_LNGS,
  LEGACY_LOCALE_ALIASES,
  LEGACY_LOCALE_CODES,
  LOCALES,
  LOCALE_CODES,
  getBrowserLocale,
  getCanonicalLocale,
  getInitialLanguage,
  getIntlLocale,
  getPaymentServiceLocale,
  getLocaleConfig,
  getLocaleFallbacks,
  getLocaleResourceChain,
  stripLocalePrefix,
};
