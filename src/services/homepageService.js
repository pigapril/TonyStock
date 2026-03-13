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
    featuredMoments: []
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
