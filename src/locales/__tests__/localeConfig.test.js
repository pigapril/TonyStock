import fs from 'fs';
import path from 'path';
import {
  DEFAULT_LOCALE,
  I18NEXT_SUPPORTED_LNGS,
  LEGACY_LOCALE_ALIASES,
  LOCALES,
  LOCALE_CODES,
  getBrowserLocale,
  getCanonicalLocale,
  getInitialLanguage,
  getIntlLocale,
  getPaymentServiceLocale,
  getLocaleFallbacks,
  getLocaleResourceChain,
  stripLocalePrefix,
} from '../localeConfig';
import { commonLocaleLoaders, routeLocaleLoaders } from '../localeResources.generated';

const root = path.resolve(__dirname, '../../..');

test('the locale registry is the source of truth for supported locale resources', () => {
  expect(LOCALE_CODES).toEqual(LOCALES.map(locale => locale.code));
  expect(LOCALE_CODES).toContain(DEFAULT_LOCALE);
  expect(I18NEXT_SUPPORTED_LNGS).toEqual([...LOCALE_CODES, ...Object.keys(LEGACY_LOCALE_ALIASES)]);

  for (const locale of LOCALE_CODES) {
    expect(fs.existsSync(path.join(root, `src/locales/${locale}/translation.json`))).toBe(true);
    expect(fs.existsSync(path.join(root, `public/manifest.${locale}.json`))).toBe(true);
    expect(typeof commonLocaleLoaders[locale]).toBe('function');
    expect(routeLocaleLoaders[locale]).toBeDefined();
    expect(Object.keys(routeLocaleLoaders[locale])).toEqual(
      expect.arrayContaining([
        'admin', 'momentum', 'indicatorsExternal', 'indicatorsUs', 'indicatorsTw',
        'indicatorsSio', 'indicatorsBofa', 'account', 'market', 'price'
      ])
    );
  }
});

test('canonical locale and legacy URL alias resolve without creating a second translation', () => {
  expect(getCanonicalLocale('zh')).toBe('zh-TW');
  expect(getCanonicalLocale('ZH-tw')).toBe('zh-TW');
  expect(getCanonicalLocale('zh-cn')).toBe('zh-CN');
  expect(getCanonicalLocale('unknown')).toBe(DEFAULT_LOCALE);
  expect(getLocaleResourceChain('zh')).toEqual(['zh-TW', 'en']);
});

test('fallback chains are taken from locale configuration', () => {
  expect(getLocaleFallbacks('en')).toEqual([]);
  expect(getLocaleFallbacks('zh-TW')).toEqual(['en']);
  expect(getLocaleResourceChain('zh-TW')).toEqual(['zh-TW', 'en']);
  expect(getLocaleFallbacks('zh-CN')).toEqual(['en']);
  expect(getLocaleResourceChain('zh-CN')).toEqual(['zh-CN', 'en']);
  expect(getLocaleResourceChain('en')).toEqual(['en']);
});

test('browser language selects an enabled locale and otherwise falls back to default', () => {
  expect(getBrowserLocale('zh-HK')).toBe('zh-TW');
  expect(getBrowserLocale('zh-TW')).toBe('zh-TW');
  expect(getBrowserLocale('zh-Hant')).toBe('zh-TW');
  expect(getBrowserLocale('zh-Hant-HK')).toBe('zh-TW');
  expect(getBrowserLocale('zh-CN')).toBe('zh-CN');
  expect(getBrowserLocale('zh-Hans')).toBe('zh-CN');
  expect(getBrowserLocale('zh-Hans-CN')).toBe('zh-CN');
  expect(getBrowserLocale('zh-SG')).toBe('zh-CN');
  expect(getBrowserLocale('zh')).toBe('zh-TW');
  expect(getBrowserLocale('en-GB')).toBe('en');
  expect(getBrowserLocale('ja-JP')).toBe(DEFAULT_LOCALE);
  expect(getBrowserLocale('ko-KR')).toBe('ko-KR');
  expect(getBrowserLocale('ko')).toBe('ko-KR');
  expect(getCanonicalLocale('ko-KR')).toBe('ko-KR');
  expect(getLocaleResourceChain('ko-KR')).toEqual(['ko-KR', 'en']);
  expect(getBrowserLocale('')).toBe(DEFAULT_LOCALE);
});

test('explicit URL locale takes precedence over browser preference', () => {
  expect(getInitialLanguage('/zh-TW/priceanalysis', 'en-US')).toBe('zh-TW');
  expect(getInitialLanguage('/zh-CN/priceanalysis', 'zh-TW')).toBe('zh-CN');
  expect(getInitialLanguage('/EN/watchlist', 'zh-TW')).toBe('en');
  expect(getInitialLanguage('/zh/momentum', 'en-US')).toBe('zh');
  expect(getInitialLanguage('/ko-KR/momentum', 'en-US')).toBe('ko-KR');
  expect(getInitialLanguage('/unsupported/path', 'zh-TW')).toBe(DEFAULT_LOCALE);
  expect(getInitialLanguage('/', 'zh-TW')).toBe('zh-TW');
});

test('locale prefix parsing is data-driven and leaves non-locale routes intact', () => {
  for (const locale of LOCALE_CODES) {
    expect(stripLocalePrefix(`/${locale}/watchlist`)).toBe('/watchlist');
  }
  expect(stripLocalePrefix('/zh/priceanalysis')).toBe('/priceanalysis');
  expect(stripLocalePrefix('/ko-KR/priceanalysis')).toBe('/priceanalysis');
  expect(stripLocalePrefix('/unknown/priceanalysis')).toBe('/unknown/priceanalysis');
});

test('Intl formatting locale is centralized with a safe fallback', () => {
  expect(getIntlLocale('zh-TW')).toBe('zh-TW');
  expect(getIntlLocale('zh-CN')).toBe('zh-CN');
  expect(getIntlLocale('ko-KR')).toBe('ko-KR');
  expect(getIntlLocale('en')).toBe('en-US');
  expect(getIntlLocale('unknown')).toBe('en-US');
});

test('payment services receive only the currently supported locales', () => {
  expect(getPaymentServiceLocale('zh-TW')).toBe('zh-TW');
  expect(getPaymentServiceLocale('zh')).toBe('zh-TW');
  expect(getPaymentServiceLocale('zh-CN')).toBe('en');
  expect(getPaymentServiceLocale('en')).toBe('en');
  // Korean UI copy is independent from payment service language support.
  expect(getPaymentServiceLocale('ko-KR')).toBe('en');
});

test('Korean translation covers every source leaf with matching placeholders', () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/zh-TW/translation.json'), 'utf8'));
  const korean = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/ko-KR/translation.json'), 'utf8'));
  const proposal = JSON.parse(fs.readFileSync(path.join(root, 'docs/korean-review/ko-KR-review-proposal.json'), 'utf8'));
  const leaves = value => Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object' ? leaves(child).map(path => `${key}.${path}`) : [key]
  );
  const sourceKeys = leaves(source).sort();
  const koreanKeys = leaves(korean).sort();
  expect(proposal.entries).toHaveLength(sourceKeys.length);
  expect(new Set(proposal.entries.map(entry => entry.key)).size).toBe(sourceKeys.length);
  expect(koreanKeys).toEqual(sourceKeys);
  expect(proposal.entries.every(entry => typeof entry.korean === 'string')).toBe(true);
});
