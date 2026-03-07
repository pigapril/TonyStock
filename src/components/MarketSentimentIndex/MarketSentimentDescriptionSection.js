import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSentiment } from '../../utils/sentimentUtils';
import FAQ from './FAQ/FAQ';
import './MarketSentimentDescriptionSection.css';

const INDICATOR_COPY = {
  'AAII Bull-Bear Spread': {
    zh: {
      measure: '用散戶問卷的多空差，判斷市場是否過度偏向單一方向。',
      caveat: '問卷情緒反應很快，但未必會立刻反映在價格行為上。'
    },
    en: {
      measure: 'Uses the retail bull-bear survey spread to show whether sentiment has become one-sided.',
      caveat: 'Survey sentiment shifts quickly, but price action may react with a lag.'
    }
  },
  'CBOE Put/Call Ratio 5-Day Avg': {
    zh: {
      measure: '觀察期權避險需求，判斷市場是在防守還是在追逐風險。',
      caveat: '短期事件會明顯拉高避險需求，因此要避免用單一日波動解讀大趨勢。'
    },
    en: {
      measure: 'Tracks options hedging demand to show whether investors are defending or chasing risk.',
      caveat: 'Event-driven hedging spikes can distort the signal if you overreact to a single move.'
    }
  },
  'Market Momentum': {
    zh: {
      measure: '比較價格與長期均線的距離，衡量漲勢或跌勢是否過度延伸。',
      caveat: '動能可在強趨勢中維持很久，極端值不代表立刻反轉。'
    },
    en: {
      measure: 'Compares price versus its long-term trend to see whether the move is stretched.',
      caveat: 'Momentum can stay extreme for long periods, so an extreme reading is not a timing signal by itself.'
    }
  },
  'VIX MA50': {
    zh: {
      measure: '以波動率壓力來衡量市場是否處於緊張或恐慌狀態。',
      caveat: 'VIX 對事件風險很敏感，事件結束後也可能迅速回落。'
    },
    en: {
      measure: 'Uses volatility stress to indicate whether the market is calm, tense, or panicked.',
      caveat: 'VIX is highly event-sensitive, so spikes can fade quickly after the catalyst passes.'
    }
  },
  'Safe Haven Demand': {
    zh: {
      measure: '比較股票與避險資產的相對表現，觀察資金是在承擔風險還是轉向保守。',
      caveat: '有時避險資產本身也受利率或宏觀因素影響，不一定只反映風險偏好。'
    },
    en: {
      measure: 'Compares equities versus safe-haven assets to see whether money is embracing or avoiding risk.',
      caveat: 'Safe havens can also move for rates or macro reasons, not just sentiment.'
    }
  },
  'Junk Bond Spread': {
    zh: {
      measure: '信用利差能反映市場願不願意承擔較高違約風險。',
      caveat: '信用市場變化通常較慢，更適合判讀風險偏好的中期變化。'
    },
    en: {
      measure: 'Credit spreads show whether investors are comfortable taking lower-quality credit risk.',
      caveat: 'Credit markets tend to move more slowly, so this signal is better for medium-term context.'
    }
  },
  'S&P 500 COT Index': {
    zh: {
      measure: '從期貨持倉觀察大型參與者對美股的曝險偏向。',
      caveat: '部位資料有發布時差，較適合用來看結構而非超短線變化。'
    },
    en: {
      measure: 'Uses futures positioning to show how larger market participants are leaning in equities.',
      caveat: 'Positioning data is delayed, so it is better for structural context than short-term timing.'
    }
  },
  'NAAIM Exposure Index': {
    zh: {
      measure: '觀察主動型經理人的股票曝險程度，衡量專業資金的風險偏好。',
      caveat: '專業經理人可能因制度與風控限制而提前或延後調整部位。'
    },
    en: {
      measure: 'Tracks active manager equity exposure to gauge professional risk appetite.',
      caveat: 'Institutional managers can rebalance early or late because of mandates and risk rules.'
    }
  }
};

const INDICATOR_NAME_MAP = {
  'AAII Bull-Bear Spread': 'indicators.aaiiSpread',
  'CBOE Put/Call Ratio 5-Day Avg': 'indicators.cboeRatio',
  'Market Momentum': 'indicators.marketMomentum',
  'VIX MA50': 'indicators.vixMA50',
  'Safe Haven Demand': 'indicators.safeHaven',
  'Junk Bond Spread': 'indicators.junkBond',
  'S&P 500 COT Index': 'indicators.cotIndex',
  'NAAIM Exposure Index': 'indicators.naaimIndex'
};

function MarketSentimentDescriptionSection({
  activeIndicator = 'composite',
  currentView = 'history',
  indicatorsData = {},
  className = ''
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [activeTab, setActiveTab] = useState('guide');

  const indicatorLabel = useMemo(() => {
    if (activeIndicator === 'composite') {
      return currentLang === 'zh-TW' ? '綜合指標' : 'Composite index';
    }
    return t(INDICATOR_NAME_MAP[activeIndicator] || activeIndicator);
  }, [activeIndicator, currentLang, t]);

  const indicatorDetail = useMemo(() => {
    if (activeIndicator === 'composite') {
      return null;
    }

    const indicator = indicatorsData[activeIndicator];
    const percentile = indicator?.percentileRank != null ? Math.round(indicator.percentileRank) : null;
    const sentimentKey = getSentiment(percentile);
    const localizedCopy = INDICATOR_COPY[activeIndicator]?.[currentLang === 'zh-TW' ? 'zh' : 'en'];

    return {
      percentile,
      sentiment: t(sentimentKey),
      measure: localizedCopy?.measure || (currentLang === 'zh-TW'
        ? '提供市場情緒的一個額外觀察維度。'
        : 'Adds another lens for reading market sentiment.'),
      caveat: localizedCopy?.caveat || (currentLang === 'zh-TW'
        ? '建議搭配其他指標與價格結構一起判讀。'
        : 'Read it alongside the other indicators and price structure.')
    };
  }, [activeIndicator, currentLang, indicatorsData, t]);

  const quickGuideCards = useMemo(() => {
    if (currentLang === 'zh-TW') {
      return [
        {
          title: '先看位置，不只看高低',
          body: '分數越接近極端，代表市場情緒越擁擠；真正重要的是它位在週期的哪個位置。'
        },
        {
          title: '再看是誰在推動',
          body: '切到 Indicators，確認是波動率、動能、信用還是部位資料在拉動情緒。'
        },
        {
          title: '最後回到價格驗證',
          body: '情緒極端不是交易訊號本身，仍需回到價格與趨勢結構確認。'
        }
      ];
    }

    return [
      {
        title: 'Read position, not just level',
        body: 'Extreme scores matter most in context: what matters is where the reading sits inside the broader cycle.'
      },
      {
        title: 'Check who is driving it',
        body: 'Use Indicators to confirm whether volatility, momentum, credit, or positioning is shaping today’s mood.'
      },
      {
        title: 'Validate with price',
        body: 'An extreme sentiment reading is not a trade by itself. Confirm it against trend and price structure.'
      }
    ];
  }, [currentLang]);

  const methodologyItems = useMemo(() => {
    if (activeIndicator === 'composite') {
      return Object.keys(indicatorsData)
        .filter((key) => key !== 'Investment Grade Bond Yield' && key !== 'Junk Bond Yield')
        .map((key) => t(INDICATOR_NAME_MAP[key] || key));
    }

    return [];
  }, [activeIndicator, indicatorsData, t]);

  const readNowCopy = useMemo(() => {
    if (activeIndicator === 'composite') {
      return currentLang === 'zh-TW'
        ? '綜合分數把多個風險偏好維度壓縮成單一讀數，適合快速判斷市場是否進入偏樂觀或偏防守的區域。'
        : 'The composite reading compresses several risk appetite signals into one number so you can quickly gauge whether the market is leaning offensive or defensive.';
    }

    if (!indicatorDetail) {
      return '';
    }

    if (currentLang === 'zh-TW') {
      return `目前 ${indicatorLabel} 位在 ${indicatorDetail.percentile ?? '-'} 百分位，情緒偏向「${indicatorDetail.sentiment}」，適合拿來對照它是否與綜合指標一致。`;
    }

    return `${indicatorLabel} is currently at the ${indicatorDetail.percentile ?? '-'}th percentile, which reads as ${indicatorDetail.sentiment}. Use it to check whether this signal confirms or diverges from the composite mood.`;
  }, [activeIndicator, currentLang, indicatorDetail, indicatorLabel]);

  return (
    <section className={`msiLearn ${className}`}>
      <div className="msiLearn__header">
        <div className="msiLearn__heading">
          <h2 className="msiLearn__title">
            {currentLang === 'zh-TW' ? '解讀這個頁面' : 'How to interpret this page'}
          </h2>
          <p className="msiLearn__description">
            {currentLang === 'zh-TW'
              ? `目前聚焦：${indicatorLabel}${currentView === 'history' ? '，你正在查看歷史趨勢。' : '，你正在查看指標拆解。'}`
              : `Currently focused on ${indicatorLabel}${currentView === 'history' ? ' in history view.' : ' in indicators view.'}`}
          </p>
        </div>

        <div className="msiLearn__tabs" role="tablist" aria-label={currentLang === 'zh-TW' ? '說明區切換' : 'Learn section tabs'}>
          <button
            type="button"
            className={`msiLearn__tab ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            {currentLang === 'zh-TW' ? 'Quick Guide' : 'Quick Guide'}
          </button>
          <button
            type="button"
            className={`msiLearn__tab ${activeTab === 'methodology' ? 'active' : ''}`}
            onClick={() => setActiveTab('methodology')}
          >
            {currentLang === 'zh-TW' ? 'Methodology' : 'Methodology'}
          </button>
          <button
            type="button"
            className={`msiLearn__tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            FAQ
          </button>
        </div>
      </div>

      <div className="msiLearn__body">
        {activeTab === 'guide' && (
          <div className="msiLearn__guideGrid">
            {quickGuideCards.map((card) => (
              <article key={card.title} className="msiLearn__guideCard">
                <h3 className="msiLearn__cardTitle">{card.title}</h3>
                <p className="msiLearn__cardBody">{card.body}</p>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'methodology' && (
          <div className="msiLearn__methodology">
            <article className="msiLearn__methodCard">
              <span className="msiLearn__methodLabel">
                {currentLang === 'zh-TW' ? 'What it measures' : 'What it measures'}
              </span>
              <p className="msiLearn__methodText">
                {activeIndicator === 'composite'
                  ? (currentLang === 'zh-TW'
                    ? '綜合指標把多個情緒來源合併成同一個 0 到 100 讀數，幫助你快速判斷市場處於恐懼、中性或貪婪。'
                    : 'The composite index blends multiple sentiment inputs into a single 0-100 reading so you can quickly judge whether the market is fearful, neutral, or greedy.')
                  : indicatorDetail?.measure}
              </p>
            </article>

            <article className="msiLearn__methodCard">
              <span className="msiLearn__methodLabel">
                {currentLang === 'zh-TW' ? 'How to read now' : 'How to read now'}
              </span>
              <p className="msiLearn__methodText">{readNowCopy}</p>
            </article>

            <article className="msiLearn__methodCard">
              <span className="msiLearn__methodLabel">
                {currentLang === 'zh-TW' ? 'Caveat' : 'Caveat'}
              </span>
              <p className="msiLearn__methodText">
                {activeIndicator === 'composite'
                  ? (currentLang === 'zh-TW'
                    ? '綜合分數能幫你抓到氣氛，但真正的交易決策仍要搭配價格、趨勢與風險管理。'
                    : 'The composite score is excellent for catching the mood, but trade decisions still need price, trend, and risk management.')
                  : indicatorDetail?.caveat}
              </p>
            </article>

            {activeIndicator === 'composite' && methodologyItems.length > 0 && (
              <div className="msiLearn__methodListBlock">
                <span className="msiLearn__methodLabel">
                  {currentLang === 'zh-TW' ? 'Included indicators' : 'Included indicators'}
                </span>
                <div className="msiLearn__chipList">
                  {methodologyItems.map((item) => (
                    <span key={item} className="msiLearn__chip">{item}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'faq' && <FAQ activeIndicator={activeIndicator} />}
      </div>
    </section>
  );
}

export default MarketSentimentDescriptionSection;
