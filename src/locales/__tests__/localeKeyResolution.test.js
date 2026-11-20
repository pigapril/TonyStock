const {
  getValueAtPath,
  resolveKeyFromChain,
  resolveRequiredKeyFromChain,
  getInterpolationTokens,
} = require('../localeKeyResolution');
const { createInstance } = require('i18next');

const resources = {
  'ko-KR': { home: { title: '시장 심리 분석' }, cardTrial: { days: '{{count}}일 무료 체험' } },
  en: { home: { description: 'Understand market sentiment' }, cardTrial: { days: '{{count}}-day free trial' } },
  'zh-TW': { home: { title: '市場情緒分析', description: '了解市場情緒' } },
  'zh-CN': { home: { title: '市场情绪分析', description: '了解市场情绪' } },
};

const koreanToEnglish = locale => locale === 'ko-KR' ? ['ko-KR', 'en'] : [locale];

test('resolves untranslated Korean keys from English only', () => {
  expect(resolveKeyFromChain('ko-KR', 'home.title', resources, koreanToEnglish)).toMatchObject({
    found: true, locale: 'ko-KR', value: '시장 심리 분석',
  });
  expect(resolveKeyFromChain('ko-KR', 'home.description', resources, koreanToEnglish)).toMatchObject({
    found: true, locale: 'en', value: 'Understand market sentiment',
  });
  expect(resolveKeyFromChain('ko-KR', 'missing.key', resources, koreanToEnglish).found).toBe(false);
});

test('static SEO and social-card metadata resolves through the same locale chain', () => {
  const partial = {
    'ko-KR': { home: { pageTitle: '시장 심리 분석' } },
    en: { home: { pageTitle: 'Market Sentiment', pageDescription: 'Read market sentiment.' }, pageContainer: { defaultTitle: 'Sentiment Inside Out' } },
    'zh-TW': { home: { pageDescription: '繁中不應被載入。' } },
    'zh-CN': { home: { pageDescription: '简中不应被加载。' } },
  };

  expect(resolveRequiredKeyFromChain('ko-KR', 'home.pageTitle', partial, koreanToEnglish).value)
    .toBe('시장 심리 분석');
  expect(resolveRequiredKeyFromChain('ko-KR', 'home.pageDescription', partial, koreanToEnglish))
    .toMatchObject({ locale: 'en', value: 'Read market sentiment.' });
  expect(resolveRequiredKeyFromChain('ko-KR', 'pageContainer.defaultTitle', partial, koreanToEnglish).value)
    .toBe('Sentiment Inside Out');
  expect(() => resolveRequiredKeyFromChain('ko-KR', 'missing.metadata', partial, koreanToEnglish))
    .toThrow('Missing locale resource ko-KR/missing.metadata (fallback: ko-KR -> en)');
});

test('requires complete English plural variants for a partial locale', () => {
  const pluralResources = {
    'ko-KR': {},
    en: {
      momentumDashboard: {
        assetCount_one: '{{count}} asset',
        assetCount_other: '{{count}} assets',
      },
    },
  };
  const resolved = resolveKeyFromChain('ko-KR', 'momentumDashboard.assetCount', pluralResources, koreanToEnglish);

  expect(resolved).toMatchObject({ found: true, locale: 'en, en', key: 'momentumDashboard.assetCount_{one,other}' });
  expect(resolveKeyFromChain('ko-KR', 'missing.englishFallback', pluralResources, koreanToEnglish).found).toBe(false);

  const incompleteEnglishPlural = {
    'ko-KR': {},
    en: { momentumDashboard: { assetCount_one: '{{count}} asset' } },
  };
  expect(resolveKeyFromChain('ko-KR', 'momentumDashboard.assetCount', incompleteEnglishPlural, koreanToEnglish))
    .toMatchObject({ found: false, variants: { one: { value: '{{count}} asset' }, other: null } });
});

test('real i18next Korean fallback selects English plural variants without using Chinese', async () => {
  const instance = createInstance();
  await instance.init({
    lng: 'ko-KR',
    fallbackLng: ['en'],
    resources: {
      'ko-KR': { translation: { momentumDashboard: { title: '시장 모멘텀' } } },
      en: { translation: { momentumDashboard: {
        title: 'Market Momentum',
        assetCount_one: '{{count}} tracked asset',
        assetCount_other: '{{count}} tracked assets',
      } } },
      'zh-TW': { translation: { momentumDashboard: { assetCount_other: '共追蹤 {{count}} 項資產' } } },
      'zh-CN': { translation: { momentumDashboard: { assetCount_other: '共跟踪 {{count}} 项资产' } } },
    },
  });

  expect(instance.t('momentumDashboard.title')).toBe('시장 모멘텀');
  expect(instance.t('momentumDashboard.assetCount', { count: 1 })).toBe('1 tracked asset');
  expect(instance.t('momentumDashboard.assetCount', { count: 2 })).toBe('2 tracked assets');
  expect(instance.t('momentumDashboard.assetCount', { count: 2 })).not.toMatch(/[\u3400-\u9fff]/);
});

test('i18next confirms a lone English plural variant breaks the other count form', async () => {
  const instance = createInstance();
  await instance.init({ lng: 'ko-KR', fallbackLng: ['en'], resources: {
    en: { translation: { momentumDashboard: { assetCount_one: '{{count}} asset' } } },
  } });
  expect(instance.t('momentumDashboard.assetCount', { count: 1 })).toBe('1 asset');
  expect(instance.t('momentumDashboard.assetCount', { count: 2 })).toBe('momentumDashboard.assetCount');
});

test('preserves interpolation names across direct and fallback translations', () => {
  const source = getValueAtPath(resources['zh-TW'], 'home.description');
  const direct = getValueAtPath(resources['ko-KR'], 'cardTrial.days');
  const fallback = resolveKeyFromChain('ko-KR', 'cardTrial.days', resources, koreanToEnglish).value;

  expect(getInterpolationTokens(direct)).toEqual(['{{count}}']);
  expect(getInterpolationTokens(fallback)).toEqual(['{{count}}']);
  expect(getInterpolationTokens(source)).toEqual([]);
});

test('recognizes every interpolation syntax used in the product resources', () => {
  expect(getInterpolationTokens('{{stockCode}} %{merchantTradeNo} {symbol}'))
    .toEqual(['%{merchantTradeNo}', '{symbol}', '{{stockCode}}']);
  expect(getInterpolationTokens('{{stockCode}} %{other} {symbol}'))
    .not.toEqual(['%{merchantTradeNo}', '{{stockCode}}', '{symbol}']);
});

test('resolves strings nested inside arrays using stable array index paths', () => {
  const arrayResources = {
    'ko-KR': { pricing: { plans: [{ name: '무료 요금제' }, { name: 'Pro 요금제' }] } },
    en: { pricing: { plans: [{ name: 'Free plan' }, { name: 'Pro plan' }] } },
  };
  expect(resolveKeyFromChain('ko-KR', 'pricing.plans[1].name', arrayResources, koreanToEnglish))
    .toMatchObject({ found: true, locale: 'ko-KR', value: 'Pro 요금제' });
  expect(resolveKeyFromChain('ko-KR', 'pricing.plans[0].missing', arrayResources, koreanToEnglish).found)
    .toBe(false);
});
