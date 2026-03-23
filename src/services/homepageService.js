import apiClient from '../api/apiClient';

const PRICE_PREVIEW_SENTIMENT_KEY_MAP = {
  'priceAnalysis.sentiment.optimism': 'priceAnalysis.sentiment.greed',
  'priceAnalysis.sentiment.extremeOptimism': 'priceAnalysis.sentiment.extremeGreed',
  'priceAnalysis.sentiment.pessimism': 'priceAnalysis.sentiment.fear',
  'priceAnalysis.sentiment.extremePessimism': 'priceAnalysis.sentiment.extremeFear'
};

function normalizePricePreview(pricePreview) {
  if (!pricePreview) {
    return pricePreview;
  }

  return {
    ...pricePreview,
    sentimentKey: PRICE_PREVIEW_SENTIMENT_KEY_MAP[pricePreview.sentimentKey]
      || pricePreview.sentimentKey
      || 'priceAnalysis.sentiment.neutral'
  };
}

const FALLBACK_HOMEPAGE_DATA = {
  generatedAt: null,
  announcement: {
    enabled: false,
    message: '',
    message_zh: '',
    message_en: '',
    lastUpdated: null
  },
  sentiment: {
    score: null,
    sentimentKey: 'sentiment.notAvailable',
    lastUpdated: null,
    restrictionCutoffDate: null,
    delayMonths: 2,
    frameworkIndicatorIds: [
      'aaiiSpread',
      'cboeRatio',
      'marketMomentum',
      'vixMA50',
      'safeHaven',
      'junkBond',
      'cotIndex',
      'naaimIndex'
    ],
    previewIndicators: [],
    distribution: {
      extremeFear: 0,
      fear: 0,
      neutral: 0,
      greed: 0,
      extremeGreed: 0,
      total: 0
    },
    historicLows: [],
    historicExtremes: [],
    featuredMoments: [],
    historyPreview: [
      { date: '2017-01-01T00:00:00.000Z', score: 74, spyClose: 225 },
      { date: '2018-12-01T00:00:00.000Z', score: 15, spyClose: 250 },
      { date: '2018-12-24T00:00:00.000Z', score: 12, spyClose: 234 },
      { date: '2020-03-01T00:00:00.000Z', score: 5, spyClose: 274 },
      { date: '2020-03-16T00:00:00.000Z', score: 4, spyClose: 239 },
      { date: '2021-11-01T00:00:00.000Z', score: 86, spyClose: 460 },
      { date: '2021-11-15T00:00:00.000Z', score: 88, spyClose: 467 },
      { date: '2022-10-01T00:00:00.000Z', score: 11, spyClose: 357 },
      { date: '2022-10-12T00:00:00.000Z', score: 10, spyClose: 356 },
      { date: '2023-11-01T00:00:00.000Z', score: 67, spyClose: 454 }
    ]
  },
  pricePreview: {
    stockCode: 'SPY',
    years: 3.5,
    lastUpdated: null,
    currentPrice: null,
    sentimentKey: 'priceAnalysis.sentiment.neutral',
    trendLineValue: null,
    tlMinus2SdValue: null,
    tlMinusSdValue: null,
    tlPlusSdValue: null,
    tlPlus2SdValue: null,
    series: []
  }
};

class HomepageService {
  getFallbackData(section = 'all') {
    if (section === 'hero') {
      return {
        generatedAt: FALLBACK_HOMEPAGE_DATA.generatedAt,
        sentiment: FALLBACK_HOMEPAGE_DATA.sentiment
      };
    }

    if (section === 'narrative') {
      return {
        generatedAt: FALLBACK_HOMEPAGE_DATA.generatedAt,
        announcement: FALLBACK_HOMEPAGE_DATA.announcement,
        sentiment: {
          historyPreview: FALLBACK_HOMEPAGE_DATA.sentiment.historyPreview
        }
      };
    }

    if (section === 'price') {
      return {
        generatedAt: FALLBACK_HOMEPAGE_DATA.generatedAt,
        pricePreview: FALLBACK_HOMEPAGE_DATA.pricePreview
      };
    }

    if (section === 'content') {
      return FALLBACK_HOMEPAGE_DATA;
    }

    return FALLBACK_HOMEPAGE_DATA;
  }

  async getHomepageData(section = 'all') {
    try {
      const response = await apiClient.get('/api/public/homepage', {
        params: { section }
      });

      if (response.data?.success && response.data?.data) {
        const payload = response.data.data;

        if (payload?.pricePreview) {
          return {
            ...payload,
            pricePreview: normalizePricePreview(payload.pricePreview)
          };
        }

        return payload;
      }

      return this.getFallbackData(section);
    } catch (error) {
      console.warn('HomepageService: failed to fetch homepage data, using fallback.', error);
      return this.getFallbackData(section);
    }
  }

  async getHomepageHeroData() {
    return this.getHomepageData('hero');
  }

  async getHomepageNarrativeData() {
    return this.getHomepageData('narrative');
  }

  async getHomepagePriceData() {
    return this.getHomepageData('price');
  }

}

const homepageService = new HomepageService();

export default homepageService;
