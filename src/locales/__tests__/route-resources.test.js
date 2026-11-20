import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createInstance } from 'i18next';
import { createRouteLocaleLoader } from '../loadRouteLocales';
import { RESOURCE_GROUPS, getRouteLocaleGroups } from '../resourceGroups';
import { buildLocaleResources } from '../localeResourcesBuilder';
import { LOCALE_CODES } from '../localeConfig';

const root = path.resolve(__dirname, '../../..');
const resource = (lang, group) => JSON.parse(fs.readFileSync(path.join(root, 'src/locales/resources', lang, `${group}.json`), 'utf8'));
const original = lang => JSON.parse(fs.readFileSync(path.join(root, 'src/locales', lang, 'translation.json'), 'utf8'));

test('generated route resources remain current with every enabled locale source copy', () => {
  execFileSync(process.execPath, ['scripts/generate-locale-resources.js', '--check'], { cwd: root });
});

test.each(LOCALE_CODES)('all split resources reconstruct the exact original %s copy', async lang => {
  const instance = createInstance();
  await instance.init({ lng: lang, fallbackLng: false, resources: { [lang]: { translation: resource(lang, 'common') } } });
  for (const group of Object.keys(RESOURCE_GROUPS)) instance.addResourceBundle(lang, 'translation', resource(lang, group), true, true);
  expect(instance.getResourceBundle(lang, 'translation')).toEqual(original(lang));
  // Shared homepage gauge and preview charts must not depend on feature chunks.
  const common = resource(lang, 'common');
  expect(common.home.hero.title).toBe(original(lang).home.hero.title);
  expect(common.marketSentiment.composite.scoreLabel).toBeTruthy();
  expect(common.priceAnalysis.sentiment).toEqual(original(lang).priceAnalysis.sentiment);
  expect(common).not.toHaveProperty('admin');
  expect(common).not.toHaveProperty('momentumDashboard');
  expect(common).not.toHaveProperty('sentimentIndicatorPages');
});

test.each(LOCALE_CODES)('every enabled locale prefix resolves the same feature route groups: %s', locale => {
  expect(getRouteLocaleGroups(`/${locale}/momentum`)).toEqual(['momentum']);
  expect(getRouteLocaleGroups(`/${locale}/priceanalysis`)).toEqual(['price']);
  expect(getRouteLocaleGroups(`/${locale}/market-sentiment`)).toEqual(['market']);
  expect(getRouteLocaleGroups(`/${locale}/payment/card-trial/result`)).toEqual(['account']);
});

test.each([
  ['/zh-TW/', []], ['/zh-CN/', []], ['/en/articles/a/', []], ['/zh-TW/momentum/', ['momentum']],
  ['/zh-CN/momentum/', ['momentum']],
  ['/en/sentiment-indicators/vix', ['indicators', 'market']],
  ['/zh-TW/tw-market-sentiment/', ['market']], ['/en/priceanalysis', ['price']],
  ['/zh-TW/watchlist', ['price']], ['/en/payment/card-trial/result', ['account']],
  ['/zh-TW/subscription-plans', ['account']], ['/en/user-account', ['account']],
  ['/en/momentum-other', []], ['/zh-TW/NK-Admin', Object.keys(RESOURCE_GROUPS)],
  ['/en/NK-Admin-diagnostic', Object.keys(RESOURCE_GROUPS)], ['/en/admin', Object.keys(RESOURCE_GROUPS)]
])('loads only required groups for %s', (pathname, expected) => {
  expect(getRouteLocaleGroups(pathname)).toEqual(expected);
});

test('direct Chinese route loads both feature copy and English fallback, deduplicating concurrent requests', async () => {
  const instance = createInstance();
  await instance.init({ lng: 'zh-TW', fallbackLng: 'en', resources: {
    en: { translation: resource('en', 'common') }, 'zh-TW': { translation: resource('zh-TW', 'common') }
  } });
  const loaders = Object.fromEntries(['en', 'zh-TW'].map(lang => [lang, {
    momentum: jest.fn(async () => ({ default: resource(lang, 'momentum') })),
    admin: jest.fn()
  }]));
  const load = createRouteLocaleLoader(instance, loaders);
  await load('en', '/en/');
  expect(loaders.en.momentum).not.toHaveBeenCalled();
  await Promise.all([load('zh-TW', '/zh-TW/momentum'), load('zh-TW', '/zh-TW/momentum')]);
  await load('zh-TW', '/zh-TW/momentum');
  for (const lang of ['en', 'zh-TW']) expect(loaders[lang].momentum).toHaveBeenCalledTimes(1);
  expect(instance.t('momentumDashboard.title')).toBe(original('zh-TW').momentumDashboard.title);
  instance.removeResourceBundle('zh-TW', 'translation');
  expect(instance.t('momentumDashboard.title')).toBe(original('en').momentumDashboard.title);
  expect(loaders.en.admin).not.toHaveBeenCalled();
});

test('a failed chunk request can be retried without duplicating successful resources', async () => {
  const instance = createInstance();
  await instance.init({ lng: 'en' });
  const loader = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ default: { momentumDashboard: { title: 'ready' } } });
  const load = createRouteLocaleLoader(instance, { en: { momentum: loader } });
  await expect(load('en', '/en/momentum')).rejects.toThrow('offline');
  await load('en', '/en/momentum');
  expect(instance.t('momentumDashboard.title')).toBe('ready');
  expect(loader).toHaveBeenCalledTimes(2);
});

test('partial locale generation omits untranslated route groups instead of fabricating keys', () => {
  const source = {
    commonLabel: '한국어 공통 라벨',
    momentumDashboard: { title: '시장 모멘텀', description: '이미 번역된 설명' },
  };
  const generated = buildLocaleResources(source, {
    momentum: ['momentumDashboard.title', 'momentumDashboard.untranslatedSection'],
    admin: ['admin'],
  });

  expect(generated.momentum).toEqual({ momentumDashboard: { title: '시장 모멘텀' } });
  expect(generated.admin).toEqual({});
  expect(generated.common).toEqual({ commonLabel: '한국어 공통 라벨', momentumDashboard: { description: '이미 번역된 설명' } });
});

test('partial Korean route resources load the configured English fallback, never Chinese', async () => {
  const instance = createInstance();
  await instance.init({ lng: 'ko-KR', fallbackLng: ['en'], resources: {
    'ko-KR': { translation: { momentumDashboard: { title: '시장 모멘텀' } } },
    en: { translation: { momentumDashboard: { title: 'Market Momentum', description: 'English fallback' } } },
  } });
  const loaders = {
    'ko-KR': { momentum: jest.fn(async () => ({ default: { momentumDashboard: { title: '시장 모멘텀' } } })) },
    en: { momentum: jest.fn(async () => ({ default: { momentumDashboard: { description: 'English fallback' } } })) },
    'zh-TW': { momentum: jest.fn(async () => ({ default: { momentumDashboard: { description: '不應載入繁中' } } })) },
    'zh-CN': { momentum: jest.fn(async () => ({ default: { momentumDashboard: { description: '不应加载简中' } } })) },
  };
  const fallbackChain = locale => locale === 'ko-KR' ? ['ko-KR', 'en'] : [locale];
  const load = createRouteLocaleLoader(instance, loaders, fallbackChain);

  await load('ko-KR', '/momentum');

  expect(loaders['ko-KR'].momentum).toHaveBeenCalledTimes(1);
  expect(loaders.en.momentum).toHaveBeenCalledTimes(1);
  expect(loaders['zh-TW'].momentum).not.toHaveBeenCalled();
  expect(loaders['zh-CN'].momentum).not.toHaveBeenCalled();
  expect(instance.t('momentumDashboard.title')).toBe('시장 모멘텀');
  const fallbackKey = ['momentumDashboard', 'description'].join('.');
  expect(instance.t(fallbackKey)).toBe('English fallback');
});

test.each([
  ['/zh-TW/', 'zh-TW'], ['/ZH-tw/momentum', 'zh-TW'], ['/zh-CN/', 'zh-CN'], ['/zh/', 'zh'], ['/ko-KR/momentum', 'ko-KR'],
  ['/en/', 'en'], ['/', 'en'], ['/unsupported/', 'en']
])('initial language is resolved from %s before the first render', (pathname, language) => {
  const { getInitialLanguage } = require('../resourceGroups');
  expect(getInitialLanguage(pathname)).toBe(language);
});

test.each([
  ['/', 'zh-TW', 'zh-TW'], ['/', 'zh-HK', 'zh-TW'], ['/', 'zh-Hant', 'zh-TW'],
  ['/', 'zh-CN', 'zh-CN'], ['/', 'zh-Hans', 'zh-CN'], ['/', 'zh-SG', 'zh-CN'], ['/', 'ZH-cn', 'zh-CN'],
  ['/', 'en-US', 'en'], ['/', 'ko-KR', 'ko-KR'], ['/', 'ko', 'ko-KR'], ['/', 'ja-JP', 'en'], ['/', '', 'en'],
  ['/en/', 'zh-TW', 'en'], ['/zh-TW/', 'en-US', 'zh-TW'], ['/zh-CN/', 'zh-TW', 'zh-CN'], ['/zh/', 'en-US', 'zh'], ['/ko-KR/', 'en-US', 'ko-KR']
])('initial language for %s with browser preference %s is %s', (pathname, browserLanguage, language) => {
  const { getInitialLanguage } = require('../resourceGroups');
  expect(getInitialLanguage(pathname, browserLanguage)).toBe(language);
});

test.each([
  ['/', 'zh-TW', 'zh-TW'], ['/', 'zh-CN', 'zh-CN'], ['/', 'ko-KR', 'ko-KR'], ['/', 'ja-JP', 'en'], ['/en/', 'zh-TW', 'en'], ['/zh/', 'en-US', 'zh']
])('i18n loads only the initial locale chain before readiness resolves for %s with browser language %s', async (pathname, browserLanguage, language) => {
  const originalUrl = window.location.href;
  const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
  let i18nModule;
  try {
    window.history.replaceState(null, '', pathname);
    Object.defineProperty(navigator, 'language', { configurable: true, value: browserLanguage });
    jest.isolateModules(() => { i18nModule = require('../../i18n'); });
    await i18nModule.i18nReady;
    const instance = i18nModule.default;
    const { getLocaleResourceChain } = require('../localeConfig');
    const loadedLocales = getLocaleResourceChain(language);
    expect(instance.isInitialized).toBe(true);
    expect(instance.language).toBe(language);
    loadedLocales.forEach(locale => expect(instance.hasResourceBundle(locale, 'translation')).toBe(true));
    LOCALE_CODES.filter(locale => !loadedLocales.includes(locale)).forEach(locale => {
      expect(instance.hasResourceBundle(locale, 'translation')).toBe(false);
    });
  } finally {
    window.history.replaceState(null, '', originalUrl);
    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
    else delete navigator.language;
  }
});
