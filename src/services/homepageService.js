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
  pricePreview: {
    stockCode: 'SPY',
    years: 3.5,
    lastUpdated: '2023-11-01',
    currentPrice: 454,
    sentimentKey: 'priceAnalysis.sentiment.optimism',
    trendLineValue: 430,
    tlMinus2SdValue: 350,
    tlMinusSdValue: 390,
    tlPlusSdValue: 450,
    tlPlus2SdValue: 490,
    series: [
      { date: '2021-01-01', price: 370, trendLine: 340, tlMinus2Sd: 280, tlMinusSd: 310, tlPlusSd: 370, tlPlus2Sd: 400 },
      { date: '2021-06-01', price: 420, trendLine: 360, tlMinus2Sd: 300, tlMinusSd: 330, tlPlusSd: 390, tlPlus2Sd: 420 },
      { date: '2021-12-01', price: 453, trendLine: 385, tlMinus2Sd: 320, tlMinusSd: 350, tlPlusSd: 420, tlPlus2Sd: 455 },
      { date: '2022-06-01', price: 410, trendLine: 398, tlMinus2Sd: 338, tlMinusSd: 368, tlPlusSd: 428, tlPlus2Sd: 458 },
      { date: '2022-10-01', price: 357, trendLine: 400, tlMinus2Sd: 345, tlMinusSd: 372, tlPlusSd: 428, tlPlus2Sd: 455 },
      { date: '2023-04-01', price: 412, trendLine: 407, tlMinus2Sd: 350, tlMinusSd: 378, tlPlusSd: 435, tlPlus2Sd: 463 },
      { date: '2023-11-01', price: 454, trendLine: 430, tlMinus2Sd: 350, tlMinusSd: 390, tlPlusSd: 450, tlPlus2Sd: 490 }
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
