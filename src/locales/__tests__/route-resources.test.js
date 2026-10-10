import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createInstance } from 'i18next';
import { createRouteLocaleLoader } from '../loadRouteLocales';
import { RESOURCE_GROUPS, getRouteLocaleGroups } from '../resourceGroups';

const root = path.resolve(__dirname, '../../..');
const resource = (lang, group) => JSON.parse(fs.readFileSync(path.join(root, 'src/locales/resources', lang, `${group}.json`), 'utf8'));
const original = lang => JSON.parse(fs.readFileSync(path.join(root, 'src/locales', lang, 'translation.json'), 'utf8'));

test('generated route resources remain current with the original bilingual source copy', () => {
  execFileSync(process.execPath, ['scripts/generate-locale-resources.js', '--check'], { cwd: root });
});

test.each(['en', 'zh-TW'])('all split resources reconstruct the exact original %s copy', async lang => {
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

test.each([
  ['/zh-TW/', []], ['/en/articles/a/', []], ['/zh-TW/momentum/', ['momentum']],
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

test.each([
  ['/zh-TW/', 'zh-TW'], ['/ZH-tw/momentum', 'zh-TW'], ['/zh/', 'zh'],
  ['/en/', 'en'], ['/', 'en'], ['/unsupported/', 'en']
])('initial language is resolved from %s before the first render', (pathname, language) => {
  const { getInitialLanguage } = require('../resourceGroups');
  expect(getInitialLanguage(pathname)).toBe(language);
});

test.each([
  ['/', 'zh-TW', 'zh-TW'], ['/', 'zh-HK', 'zh-TW'], ['/', 'ZH-cn', 'zh-TW'],
  ['/', 'en-US', 'en'], ['/', 'ja-JP', 'en'], ['/', '', 'en'],
  ['/en/', 'zh-TW', 'en'], ['/zh-TW/', 'en-US', 'zh-TW'], ['/zh/', 'en-US', 'zh']
])('initial language for %s with browser preference %s is %s', (pathname, browserLanguage, language) => {
  const { getInitialLanguage } = require('../resourceGroups');
  expect(getInitialLanguage(pathname, browserLanguage)).toBe(language);
});

test.each([
  ['/', 'zh-TW', 'zh-TW'], ['/', 'ja-JP', 'en'], ['/en/', 'zh-TW', 'en']
])('i18n initializes synchronously for %s with browser language %s', (pathname, browserLanguage, language) => {
  const originalUrl = window.location.href;
  const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
  let instance;
  try {
    window.history.replaceState(null, '', pathname);
    Object.defineProperty(navigator, 'language', { configurable: true, value: browserLanguage });
    jest.isolateModules(() => { instance = require('../../i18n').default; });
    expect(instance.isInitialized).toBe(true);
    expect(instance.language).toBe(language);
    expect(instance.hasResourceBundle(language, 'translation')).toBe(true);
  } finally {
    window.history.replaceState(null, '', originalUrl);
    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
    else delete navigator.language;
  }
});
