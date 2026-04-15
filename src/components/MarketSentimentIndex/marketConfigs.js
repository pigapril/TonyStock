const buildTwGaugeExplainerCopy = ({ currentLang, currentCompositeScore, currentCompositeSentimentLabel }) => {
  if (currentLang === 'zh-TW') {
    return {
      title: '台股情緒快照',
      subtitle: `目前台股情緒分數為 ${currentCompositeScore ?? '-'}，整體偏向「${currentCompositeSentimentLabel}」。`,
      sections: [
        {
          title: '先看大方向',
          body: '這個分數把多個台股情緒訊號整理成同一個讀數，讓你先知道市場現在偏保守還是偏積極。'
        },
        {
          title: '再看驅動因子',
          body: '真正重要的不是單一分數，而是目前是哪幾個訊號在推動市場往恐懼或貪婪移動。'
        },
        {
          title: '把歷史一起看',
          body: '切到歷史趨勢後，可以更快判斷這次讀數是短期波動，還是更大的情緒轉折。'
        }
      ]
    };
  }

  return {
    title: 'Taiwan sentiment snapshot',
    subtitle: `Taiwan market sentiment is currently ${currentCompositeScore ?? '-'}, leaning ${currentCompositeSentimentLabel}.`,
    sections: [
      {
        title: 'Start with the composite read',
        body: 'The score turns several Taiwan market signals into one read so you can quickly judge whether risk appetite is cautious or heated.'
      },
      {
        title: 'Then inspect the drivers',
        body: 'The useful part is not the number alone, but which signals are currently pushing the market toward fear or greed.'
      },
      {
        title: 'Use the history view for context',
        body: 'The history workspace helps you decide whether this is a short-lived swing or part of a larger sentiment turn.'
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
    'zh-TW': '恐懼貪婪指標',
    en: 'Fear & Greed Index'
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
  showDescriptionSection: false,
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
  buildGaugeExplainerCopy: buildTwGaugeExplainerCopy
};
