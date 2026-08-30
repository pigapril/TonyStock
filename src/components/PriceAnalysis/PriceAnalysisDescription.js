import React from 'react';

const ARTICLE_URL = 'https://sentimentinsideout.com/articles/1.%E7%94%A8%E6%A8%82%E6%B4%BB%E4%BA%94%E7%B7%9A%E8%AD%9C%E5%88%86%E6%9E%90%E5%83%B9%E6%A0%BC%E8%B6%A8%E5%8B%A2%E8%88%87%E6%83%85%E7%B7%92';

/**
 * 頁尾說明。
 *
 * 原本是四個分頁的說明區（318px、永遠在第一屏外）。五條線與樂活通道的細節
 * 已經移到欄位旁的問號說明裡，這裡只留「這是什麼」與使用前提，深入內容連到文章，
 * 避免同一份概念同時住在頁面和文章兩個地方而各自走樣。
 */
function PriceAnalysisDescription({ t }) {
  return (
    <div className="bottom-description-section">
      <div className="description-card">
        <h3 className="description-card__title">
          {t('priceAnalysis.description.overview.title')}
        </h3>
        <p className="description-card__body">
          {t('priceAnalysis.description.overview.content')}
        </p>
        <ul className="description-card__notes">
          <li>{t('priceAnalysis.description.tips.usage')}</li>
          <li>{t('priceAnalysis.description.tips.limitation')}</li>
        </ul>
        <a
          className="description-card__link"
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('priceAnalysis.description.overview.readMore')}
        </a>
      </div>
    </div>
  );
}

export default React.memo(PriceAnalysisDescription);
