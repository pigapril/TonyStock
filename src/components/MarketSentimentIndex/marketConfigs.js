const buildTwGaugeExplainerCopy = ({ currentLang, currentCompositeScore, currentCompositeSentimentLabel }) => {
  if (currentLang === 'zh-TW') {
    return {
      title: '關於台股恐懼貪婪指標',
      subtitle: `本次綜合分數為 ${currentCompositeScore ?? '-'}，整體偏向「${currentCompositeSentimentLabel}」。九項台股訊號合成 0 到 100 分，讓你先看整體情緒，再找出背後的變化。`,
      sections: [
        {
          title: '1. 整合台股多面向情緒訊號',
          body: '從選擇權、融資融券、外資期貨部位到匯率、動能與市場參與度，合併觀察台股的風險偏好。不同訊號可能各走各的，綜合分數讓你先掌握整體傾向。'
        },
        {
          title: '2. 留意情緒是否走到極端',
          body: '低分代表合成後偏向恐懼，高分代表偏向貪婪。遇到極端讀數，打開各項指標，確認哪些訊號推動分數，再對照加權指數走勢。'
        },
        {
          title: '3. 用數據檢查追高與殺低的衝動',
          body: '大跌時想出場、急漲時怕錯過，都可以先回到數據。比較情緒分數、指標組成與歷史位置，再決定是否調整原本的配置。'
        }
      ]
    };
  }

  return {
    title: 'About the Taiwan Fear & Greed Index',
    subtitle: `The composite score is ${currentCompositeScore ?? '-'}, leaning ${currentCompositeSentimentLabel}. Nine Taiwan signals form a 0-to-100 score. Start with the overall sentiment, then explore what changed.`,
    sections: [
      {
        title: '1. Read Taiwan sentiment across nine signals',
        body: 'Options, margin financing, short positions, foreign futures positions, currency, momentum and participation give you several views of risk appetite. Signals can diverge; the composite shows their aggregate direction.'
      },
      {
        title: '2. Watch for sentiment extremes',
        body: 'Low scores lean toward fear; high scores lean toward greed. At extremes, open the individual indicators to see what drove the score, then compare with the TAIEX price trend.'
      },
      {
        title: '3. Check the urge to chase or panic-sell',
        body: 'When a sell-off makes you want to exit, or a rally makes you fear missing out, return to the data. Compare the score, its components and historical readings before changing your allocation.'
      }
    ]
  };
};

export const US_MARKET_SENTIMENT_CONFIG = {
  marketKey: 'us',
  routePath: 'market-sentiment',
  summaryEndpointPro: '/api/market-sentiment',
  summaryEndpointFree: '/api/market-sentiment-free',
  historyEndpoint: '/api/composite-historical-data',
  detailEndpoint: '/api/indicator-history',
  trendSummaryEndpoint: '/api/indicator-trend-summary',
  detailQueryParam: 'indicator',
  historyMode: 'single',
  detailIncludesRange: false,
  showDescriptionSection: true,
  currentGaugeHeadlineZh: '當前美股市場情緒',
  snapshotGaugeHeadlineKey: 'marketSentiment.dataLimitation.snapshotGaugeHeadline',
  benchmarkAxisLabel: null,
  titleBrand: 'Sentiment Inside Out (SIO)',
  titleIndex: {
    'zh-TW': '美股恐懼貪婪指標',
    en: 'US Fear & Greed Index'
  },
  seo: {
    pageTitleKey: 'marketSentiment.pageTitle',
    pageDescriptionKey: 'marketSentiment.pageDescription',
    keywordsKey: 'marketSentiment.keywords',
    pageSubtitleKey: 'marketSentiment.pageSubtitle',
    headingKey: 'marketSentiment.heading',
    faqKeyPrefix: 'marketSentiment.enhancedDescription.content.faq'
  }
};

export const TW_MARKET_SENTIMENT_CONFIG = {
  marketKey: 'tw',
  routePath: 'tw-market-sentiment',
  summaryEndpointPro: '/api/tw-market-sentiment',
  summaryEndpointFree: '/api/tw-market-sentiment-free',
  historyEndpoint: '/api/tw-composite-historical-data',
  detailEndpoint: '/api/tw-indicator-history',
  trendSummaryEndpoint: '/api/tw-indicator-trend-summary',
  detailQueryParam: 'indicatorId',
  historyMode: 'range',
  detailIncludesRange: true,
  showDescriptionSection: true,
  currentGaugeHeadlineZh: '當前台股市場情緒',
  currentGaugeHeadlineEn: 'Current Taiwan market sentiment',
  snapshotGaugeHeadlineFormatter: ({ currentLang, formattedRestrictionCutoffDate }) => (
    currentLang === 'zh-TW'
      ? `${formattedRestrictionCutoffDate} 的台股市場情緒`
      : `Taiwan market sentiment on ${formattedRestrictionCutoffDate}`
  ),
  benchmarkAxisLabel: {
    'zh-TW': '台股加權指數',
    en: 'TAIEX'
  },
  titleBrand: 'Sentiment Inside Out (SIO)',
  titleIndex: {
    'zh-TW': '台股恐懼貪婪指標',
    en: 'Taiwan Fear & Greed Index'
  },
  seo: {
    pageTitleKey: 'marketSentiment.tw.pageTitle',
    pageDescriptionKey: 'marketSentiment.tw.pageDescription',
    keywordsKey: 'marketSentiment.tw.keywords',
    pageSubtitleKey: 'marketSentiment.tw.pageSubtitle',
    headingKey: 'marketSentiment.tw.heading',
    faqKeyPrefix: 'marketSentiment.tw.faq'
  },
  buildGaugeExplainerCopy: buildTwGaugeExplainerCopy
};
