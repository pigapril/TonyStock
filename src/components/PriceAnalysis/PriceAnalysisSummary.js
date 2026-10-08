import React from 'react';
import InfoPopover from './InfoPopover';

// 延遲載入圖表與資料請求共用同一份摘要，避免完成後新增欄位推動圖表。
export default function PriceAnalysisSummary({
  hasAnalysisContent = false,
  displayedStockCode,
  analysisResult = {},
  displayedHorizonKey,
  analysisSentimentText,
  getSentimentSuffix = () => 'neutral',
  formatPrice = (value) => value,
  t
}) {
  return (
    <div
      className={`chart-header ${hasAnalysisContent ? '' : 'chart-header--skeleton'}`}
      aria-busy={!hasAnalysisContent}
    >
      <div className={`analysis-result ${hasAnalysisContent ? '' : 'analysis-result--skeleton'}`}>
        <div className="analysis-item">
          <span className="analysis-label">{t('priceAnalysis.result.stockCode')}</span>
          {hasAnalysisContent ? (
            <span className="analysis-value">{displayedStockCode || '—'}</span>
          ) : (
            <span className="analysis-value-skeleton" />
          )}
        </div>
        <div className="analysis-item">
          <span className="analysis-label">{t('priceAnalysis.result.stockPrice')}</span>
          {hasAnalysisContent ? (
            <span className="analysis-value">${formatPrice(analysisResult.price)}</span>
          ) : (
            <span className="analysis-value-skeleton" />
          )}
        </div>
        <div className="analysis-item">
          <span className="analysis-label">
            {t('priceAnalysis.result.marketSentiment')}
            <InfoPopover
              label={t('priceAnalysis.description.sd.title')}
              title={t('priceAnalysis.description.sd.title')}
              points={[
                t('priceAnalysis.description.sd.point1'),
                t('priceAnalysis.description.sd.point2'),
                t('priceAnalysis.description.sd.point3'),
                t('priceAnalysis.description.sd.point4')
              ]}
            />
          </span>
          {hasAnalysisContent ? (
            <span className={`analysis-value sentiment-${getSentimentSuffix(analysisResult.sentimentKey)}`}>
              {analysisSentimentText || '—'}
            </span>
          ) : (
            <span className="analysis-value-skeleton analysis-value-skeleton--wide" />
          )}
        </div>

        {/* 另外兩個週期的位階。目前圖表這個週期的位階就是左邊的「市場情緒」，
            再列一次是同一個數字講兩遍，所以只留沒被畫出來的那兩個。
            自訂年數時三個都不是圖表週期，三個就都列。 */}
        <div className="analysis-item analysis-item--horizons">
          <span className="analysis-label">
            {t('priceAnalysis.result.horizons')}
            <InfoPopover
              label={t('priceAnalysis.description.horizons.title')}
              title={t('priceAnalysis.description.horizons.title')}
              points={[
                t('priceAnalysis.description.horizons.point1'),
                t('priceAnalysis.description.horizons.point2'),
                t('priceAnalysis.description.horizons.point3')
              ]}
            />
          </span>
          <span className="horizon-grid">
            {['short', 'medium', 'long']
              .filter((key) => key !== displayedHorizonKey)
              .map((key) => {
                const level = getSentimentSuffix(analysisResult.alignment?.[key]);
                const known = Boolean(analysisResult.alignment?.[key]);
                return (
                  <span className="horizon-grid__cell" key={key}>
                    <span className="horizon-grid__period">
                      {t(`priceAnalysis.form.period${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                    </span>
                    <span className={`horizon-grid__value${known ? ` sentiment-${level}` : ' horizon-grid__value--unknown'}`}>
                      {known ? t(`priceAnalysis.sentiment.${level}`) : '—'}
                    </span>
                  </span>
                );
              })}
          </span>
        </div>
        {/* 通道位置自成一欄，與情緒並列。掛在情緒值後面會讓兩個等重的資訊擠在一起。 */}
        <div className="analysis-item">
          <span className="analysis-label">
            {t('priceAnalysis.result.channelPosition')}
            <InfoPopover
              label={t('priceAnalysis.description.ulband.title')}
              title={t('priceAnalysis.description.ulband.title')}
              points={[
                t('priceAnalysis.description.ulband.point1'),
                t('priceAnalysis.description.ulband.point2'),
                t('priceAnalysis.description.ulband.point3')
              ]}
            />
          </span>
          {hasAnalysisContent && analysisResult.channelState ? (
            <span className={`analysis-value channel-value channel-value--${analysisResult.channelState}`}>
              {t(`priceAnalysis.channel.${analysisResult.channelState}`)}
            </span>
          ) : (
            <span className="analysis-value-skeleton analysis-value-skeleton--wide analysis-value-skeleton--channel" />
          )}
        </div>
      </div>
    </div>
  );
}
