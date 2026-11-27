/**
 * Published article editions. A locale is listed only when a complete
 * localized Markdown source exists. The original folder name remains stable
 * for image assets and backwards-compatible file storage; public slugs are
 * locale-specific and are used for links, canonical URLs and SEO.
 */
const ARTICLE_CATALOG = [
  {
    id: '1',
    originalSlug: '1.用樂活五線譜分析價格趨勢與情緒',
    locales: {
      en: {
        slug: 'analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis',
        filename: 'Analyzing Price Trends and Sentiment with LOHAS Five-Line Analysis.en.ini.md',
      },
      'zh-TW': {
        slug: '1.用樂活五線譜分析價格趨勢與情緒',
        filename: '用樂活五線譜分析價格趨勢與情緒.zh-TW.ini.md',
      },
      'zh-HK': {
        slug: '1.用樂活五線譜分析價格趨勢與情緒',
        filename: 'article-1.zh-HK.ini.md',
      },
      'zh-CN': {
        slug: 'lohas-five-line-analysis-price-trends-sentiment',
        filename: 'article-1.zh-CN.ini.md',
      },
      'ko-KR': {
        slug: 'lohas-five-line-analysis-price-trends-and-sentiment',
        filename: 'article-1.ko-KR.ini.md',
      },
      'ja-JP': {
        slug: 'lohas-five-line-analysis-price-trends-and-sentiment',
        filename: 'article-1.ja-JP.ini.md',
      },
    },
  },
  {
    id: '2',
    originalSlug: '2.用市場情緒綜合指數判斷買賣時機',
    locales: {
      en: {
        slug: 'using-market-sentiment-composite-index-to-time-buys-and-sells',
        filename: 'using-market-sentiment-composite-index-to-time-buys-and-sells.en.ini.md',
      },
      'zh-TW': {
        slug: '2.用市場情緒綜合指數判斷買賣時機',
        filename: '用市場情緒綜合指數判斷買賣時機.zh-TW.ini.md',
      },
      'zh-HK': {
        slug: '2.用市場情緒綜合指數判斷買賣時機',
        filename: 'article-2.zh-HK.ini.md',
      },
      'zh-CN': {
        slug: 'sio-fear-greed-index-buy-sell-timing',
        filename: 'article-2.zh-CN.ini.md',
      },
      'ko-KR': {
        slug: 'sio-fear-greed-index-buy-sell-timing',
        filename: 'article-2.ko-KR.ini.md',
      },
      'ja-JP': {
        slug: 'sio-fear-greed-index-buy-sell-timing',
        filename: 'article-2.ja-JP.ini.md',
      },
    },
  },
  {
    id: '4',
    originalSlug: '4.樂活五線譜1155萬筆台美股資料實測結果分析',
    locales: {
      en: {
        slug: 'lohas-five-line-analysis-tested-on-11-6-million-daily-bars',
        filename: 'LOHAS Five-Line Analysis Tested on 11.6 Million Daily Bars.en.ini.md',
      },
      'zh-TW': {
        slug: '4.樂活五線譜1156萬筆台美股資料實測結果分析',
        filename: '樂活五線譜1155萬筆台美股資料實測結果分析.zh-TW.ini.md',
      },
      'zh-HK': {
        slug: '4.樂活五線譜1156萬筆台美股資料實測結果分析',
        filename: 'article-4.zh-HK.ini.md',
      },
      'zh-CN': {
        slug: 'lohas-five-line-analysis-backtest-11-56-million-bars',
        filename: 'article-4.zh-CN.ini.md',
      },
      'ko-KR': {
        slug: 'lohas-five-line-analysis-backtest-11-56-million-bars',
        filename: 'article-4.ko-KR.ini.md',
      },
      'ja-JP': {
        slug: 'lohas-five-line-analysis-backtest-11-56-million-bars',
        filename: 'article-4.ja-JP.ini.md',
      },
    },
  },
  {
    id: '5',
    originalSlug: '5.市場動能儀表板使用指南',
    locales: {
      en: {
        slug: 'market-momentum-dashboard-guide',
        filename: 'Market Momentum Dashboard Guide.en.ini.md',
      },
      'zh-TW': {
        slug: '5.市場動能儀表板使用指南',
        filename: '市場動能儀表板使用指南.zh-TW.ini.md',
      },
      'zh-HK': {
        slug: '5.市場動能儀表板使用指南',
        filename: 'article-5.zh-HK.ini.md',
      },
      'zh-CN': {
        slug: 'market-momentum-dashboard-guide',
        filename: 'article-5.zh-CN.ini.md',
      },
      'ko-KR': {
        slug: 'market-momentum-dashboard-guide',
        filename: 'article-5.ko-KR.ini.md',
      },
      'ja-JP': {
        slug: 'market-momentum-dashboard-guide',
        filename: 'article-5.ja-JP.ini.md',
      },
    },
  },
];

module.exports = ARTICLE_CATALOG;
