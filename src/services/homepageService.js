import apiClient from '../api/apiClient';

const FALLBACK_HOMEPAGE_DATA = {
  generatedAt: null,
  announcement: {
    enabled: false,
    message: '',
    message_zh: '',
    message_en: '',
    lastUpdated: null
  },
  pricing: {
    currency: 'TWD',
    free: {
      name: 'Free Plan',
      description: ''
    },
    pro: {
      name: 'Pro Plan',
      description: '',
      monthly: 599,
      yearly: 5990
    }
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
  freeExperience: {
    tickers: ['SPY', 'QQQ', 'VOO', 'AAPL', 'MSFT', 'NVDA'],
    totalTickerCount: 6
  }
};

class HomepageService {
  async getHomepageData() {
    try {
      const response = await apiClient.get('/api/public/homepage');

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }

      return FALLBACK_HOMEPAGE_DATA;
    } catch (error) {
      console.warn('HomepageService: failed to fetch homepage data, using fallback.', error);
      return FALLBACK_HOMEPAGE_DATA;
    }
  }

  getFallbackData() {
    return FALLBACK_HOMEPAGE_DATA;
  }
}

const homepageService = new HomepageService();

export default homepageService;
