import { getMarketCopyLocale, resolveMarketLocaleText } from './marketLocaleCopy';

const buildTwGaugeExplainerCopy = ({ currentLang, currentCompositeScore, currentCompositeSentimentLabel }) => {
  const locale = getMarketCopyLocale(currentLang);
  if (locale === 'ko-KR') {
    return {
      title: '대만 시장 공포·탐욕 지수 소개',
      subtitle: `현재 종합 점수는 ${currentCompositeScore ?? '-'}점이며, 전반적으로 「${currentCompositeSentimentLabel}」 쪽에 가깝습니다. 대만 시장의 9개 신호를 0~100점으로 종합해 전체 심리를 먼저 파악하고 그 배경의 변화를 살펴볼 수 있습니다.`,
      sections: [
        { title: '1. 대만 시장의 다양한 심리 신호 통합', body: '옵션, 신용융자·대주, 외국인 선물 포지션부터 환율, 모멘텀, 시장 참여도까지 함께 살펴 대만 시장의 위험 선호도를 파악합니다. 신호마다 서로 다른 방향으로 움직일 수 있으므로 종합 점수로 전체적인 흐름을 먼저 확인할 수 있습니다.' },
        { title: '2. 심리가 극단에 이르렀는지 확인', body: '점수가 낮으면 종합 결과가 공포 쪽에, 높으면 탐욕 쪽에 치우쳐 있음을 의미합니다. 극단적인 수치가 나타나면 각 지표를 열어 어떤 신호가 점수에 영향을 주었는지 확인한 뒤 가권지수 흐름과 비교해 보세요.' },
        { title: '3. 데이터로 고점 추격과 투매 충동 점검', body: '급락할 때 매도하고 싶거나 급등할 때 기회를 놓칠까 걱정될 때는 먼저 데이터로 돌아가 보세요. 심리 점수, 지표 구성, 과거 위치를 비교한 뒤 기존 포트폴리오 구성을 조정할지 판단할 수 있습니다.' }
      ]
    };
  }
  if (locale === 'zh-TW') {
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

  if (locale === 'zh-CN') {
    return {
      title: '关于台湾股市恐惧与贪婪指数',
      subtitle: `本次综合得分为 ${currentCompositeScore ?? '-'}，整体偏向「${currentCompositeSentimentLabel}」。九项台湾股市信号合成为 0 到 100 分，让你先了解整体情绪，再查看背后的变化。`,
      sections: [
        {
          title: '1. 整合台湾股市多个维度的情绪信号',
          body: '从期权、融资融券、外资期货持仓到汇率、动能与市场参与度，综合观察台湾股市的风险偏好。不同信号可能各有表现，综合得分帮助你先掌握整体倾向。'
        },
        {
          title: '2. 留意情绪是否走向极端',
          body: '低分代表综合结果偏向恐惧，高分代表偏向贪婪。遇到极端读数时，可以打开各项指标，确认哪些信号推动了得分，再对照加权指数走势。'
        },
        {
          title: '3. 用数据检查追涨与杀跌的冲动',
          body: '大跌时想离场、急涨时怕错过，都可以先回到数据。比较情绪得分、指标组成与历史位置，再决定是否调整原有配置。'
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
  currentGaugeHeadline: {
    'zh-TW': '當前美股市場情緒',
    'zh-CN': '当前美股市场情绪',
    en: 'Current US market sentiment',
    'ko-KR': '현재 미국 시장 심리'
  },
  snapshotGaugeHeadlineKey: 'marketSentiment.dataLimitation.snapshotGaugeHeadline',
  benchmarkAxisLabel: null,
  titleBrand: 'Sentiment Inside Out (SIO)',
  titleIndex: {
    'zh-TW': '美股恐懼貪婪指標',
    'zh-CN': '美股恐惧与贪婪指数',
    en: 'US Fear & Greed Index',
    'ko-KR': '미국 시장 공포·탐욕 지수'
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
  currentGaugeHeadline: {
    'zh-TW': '當前台股市場情緒',
    'zh-CN': '当前台湾股市情绪',
    en: 'Current Taiwan market sentiment',
    'ko-KR': '현재 대만 시장 심리'
  },
  snapshotGaugeHeadlineFormatter: ({ currentLang, formattedRestrictionCutoffDate }) => {
    const template = resolveMarketLocaleText({
      'zh-TW': '{{date}} 的台股市場情緒',
      'zh-CN': '{{date}} 的台湾股市情绪',
      'ko-KR': '{{date}} 기준 대만 시장 심리',
      en: 'Taiwan market sentiment on {{date}}'
    }, currentLang);
    return template.replace('{{date}}', formattedRestrictionCutoffDate);
  },
  benchmarkAxisLabel: {
    'zh-TW': '台股加權指數',
    'zh-CN': '台湾加权指数',
    'ko-KR': '대만 가권지수',
    en: 'TAIEX'
  },
  titleBrand: 'Sentiment Inside Out (SIO)',
  titleIndex: {
    'zh-TW': '台股恐懼貪婪指標',
    'zh-CN': '台湾股市恐惧与贪婪指数',
    en: 'Taiwan Fear & Greed Index',
    'ko-KR': '대만 시장 공포·탐욕 지수'
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
