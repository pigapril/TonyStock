import React from 'react';
import { useTranslation } from 'react-i18next';

export function StockListHeaderRow() {
    const { t } = useTranslation();

    return (
        <div className="stock-card-header-row-wrapper">
            <div className="stock-card-header-row">
                <span className="stock-header-title">{t('watchlist.stockCard.header.symbol')}</span>
                <span className="current-price-title">{t('watchlist.stockCard.header.price')}</span>
                <span className="stock-analysis-title">{t('watchlist.stockCard.header.analysis')}</span>
                <span className="stock-sentiment-title">{t('watchlist.stockCard.header.sentiment')}</span>
                <span className="stock-news-title">{t('watchlist.stockCard.header.news')}</span>
            </div>
        </div>
    );
}
