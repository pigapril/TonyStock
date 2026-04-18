const buildTwGaugeExplainerCopy = ({ currentLang, currentCompositeScore, currentCompositeSentimentLabel }) => {
  if (currentLang === 'zh-TW') {
    return {
      title: '關於台股恐懼貪婪指標',
      subtitle: `目前綜合分數為 ${currentCompositeScore ?? '-'}，整體偏向「${currentCompositeSentimentLabel}」。這個分數把 9 項台股市場情緒訊號壓縮成 0 到 100 的單一讀數。`,
      sections: [
        {
          title: '1. 整合台股多面向情緒訊號',
          body: '指標把台指選擇權波動率、Put/Call Ratio、美元兌台幣匯率、融資維持率、外資期貨淨未平倉、市場廣度、券資比、市場動能與有效交易戶數放進同一個框架，涵蓋避險、槓桿、資金流向、價格延伸與市場參與度。你看到的不是單一數字，而是當下台股情緒的整體傾向。'
        },
        {
          title: '2. 看極端，而不是看一天的波動',
          body: '分數落到極低區域，代表避險需求、放空力道與資金退潮同時升溫，恐懼正在擴散；落到極高區域，代表追價、槓桿與市場廣度同步放大，市場已經偏熱。真正值得注意的，是多項訊號開始往極端位置靠近的時候。'
        },
        {
          title: '3. 用跨訊號共識對抗情緒慣性',
          body: '大跌想出場、狂漲怕錯過是人性，但單一指標很容易誤判。把散戶情緒、機構部位、匯率壓力與價格動能放在一起看，你會得到一個不受單日新聞驅動的客觀參考，讓判斷留在紀律之內。'
        }
      ]
    };
  }

  return {
    title: 'About the Taiwan Fear & Greed Index',
    subtitle: `The composite score is currently ${currentCompositeScore ?? '-'}, leaning ${currentCompositeSentimentLabel}. It compresses nine Taiwan market signals into a single 0-to-100 read.`,
    sections: [
      {
        title: '1. Read Taiwan sentiment across nine signals',
        body: 'The index combines TAIEX options volatility, the Put/Call ratio, USD/TWD, margin maintenance ratio, foreign-institution futures positioning, market breadth, margin-to-short ratio, index momentum and effective trading accounts. Together they cover hedging demand, leverage, capital flow, price extension and participation — so what you see is the aggregate posture of the Taiwan market, not any single series.'
      },
      {
        title: '2. Focus on extremes, not daily wiggles',
        body: 'When the score is deep in the low zone, hedging, short pressure and outflows are rising together and fear is spreading. When it reaches the high zone, chasing behavior, leverage and breadth have expanded in sync and the market is getting hot. The useful moment is when multiple signals start moving toward those extremes at the same time.'
      },
      {
        title: '3. Use the cross-signal consensus to fight instinct',
        body: 'Selling into weakness and chasing into strength are natural, but single indicators are easy to misread. Putting retail positioning, institutional flow, FX pressure and price momentum on one scale gives you a reference that is not driven by a single-day headline, helping you stay on a rule-based read of the market.'
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
    ogImage: '/images/market-sentiment-og.png',
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
    ogImage: '/logo.png',
    faqKeyPrefix: 'marketSentiment.tw.faq'
  },
  buildGaugeExplainerCopy: buildTwGaugeExplainerCopy
};
