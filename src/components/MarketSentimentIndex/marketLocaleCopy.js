// Direct-copy used by market widgets is resolved independently from i18next
// resources. Unsupported/unapproved app locales intentionally fall back to
// English; Traditional and Simplified Chinese keep their own exact copy.
export const getMarketCopyLocale = (locale) => {
  if (locale === 'zh-HK') return 'zh-HK';
  if (locale === 'zh-TW' || locale === 'zh') return 'zh-TW';
  if (locale === 'zh-CN') return 'zh-CN';
  if (locale === 'ko-KR') return 'ko-KR';
  return 'en';
};

export const resolveMarketLocaleText = (values, locale, fallback = 'en') => {
  if (!values || typeof values !== 'object') return '';
  const preferred = getMarketCopyLocale(locale);
  const regionalFallback = preferred === 'zh-HK' ? 'zh-TW' : fallback;
  return values[preferred] ?? values[regionalFallback] ?? values[fallback] ?? '';
};

const MARKET_SENTIMENT_UI_COPY = {
  recentReference: {
    en: 'Recent Reference',
    'zh-TW': '近期參考',
    'zh-CN': '近期参考',
    'ko-KR': '최근 비교 기준'
  },
  historicalFearLows: {
    en: 'Past extreme fear lows',
    'zh-TW': '過往極端恐懼低點',
    'zh-CN': '历史极度恐惧低点',
    'ko-KR': '과거 극단적 공포 저점'
  },
  genericIndicatorDetailSummary: {
    en: 'This indicator adds another way to read market sentiment. The point is not just the level itself, but whether it shows the crowd has become too one-sided in optimism or fear.',
    'zh-TW': '這個指標提供另一個觀察市場情緒的角度，重點不是單看高低，而是看它是否已經反映出市場過度一致的樂觀或悲觀。',
    'zh-CN': '这个指标提供了另一个观察市场情绪的角度。重点不只是数值高低，而是看它是否反映出市场已经过度一致地乐观或悲观。',
    'ko-KR': '이 지표는 시장 심리를 다른 관점에서 살펴볼 수 있도록 합니다. 핵심은 단순히 수치가 높거나 낮은지가 아니라, 시장의 낙관이나 비관이 지나치게 한쪽으로 쏠렸는지를 확인하는 것입니다.'
  },
  sentimentViewsAria: {
    en: 'Composite sentiment views',
    'zh-TW': '綜合情緒視角切換',
    'zh-CN': '综合情绪视角切换',
    'ko-KR': '종합 시장 심리 보기 전환'
  },
  latestMarketSentiment: {
    en: 'Latest market sentiment',
    'zh-TW': '最新市場情緒',
    'zh-CN': '最新市场情绪',
    'ko-KR': '최신 시장 심리'
  },
  history: {
    en: 'History',
    'zh-TW': '歷史趨勢',
    'zh-CN': '历史趋势',
    'ko-KR': '과거 추이'
  },
  closeIndicatorDetail: {
    en: 'Close indicator detail',
    'zh-TW': '關閉指標詳情',
    'zh-CN': '关闭指标详情',
    'ko-KR': '지표 상세 닫기'
  },
  usGaugeHeadline: {
    en: 'Current US market sentiment',
    'zh-TW': '當前美股市場情緒',
    'zh-CN': '当前美股市场情绪',
    'ko-KR': '현재 미국 시장 심리'
  }
};

export const getMarketSentimentUiCopy = (key, locale) => (
  resolveMarketLocaleText(MARKET_SENTIMENT_UI_COPY[key], locale)
);
