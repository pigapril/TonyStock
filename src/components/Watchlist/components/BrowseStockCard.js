import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../../utils/priceUtils';
import '../styles/ReadOnlyWatchlistList.css';

function getStockSymbol(stock) {
    return stock?.symbol || stock?.stockCode || stock?.stockSymbol || '';
}

function getStockName(stock) {
    return stock?.name || stock?.nameEn || stock?.stockName || '';
}

function getSentimentKey(stock) {
    const price = stock?.price;
    const analysis = stock?.analysis;

    if (!analysis || typeof price !== 'number') {
        return null;
    }

    if (price >= analysis.tl_plus_2sd) {
        return 'sentiment.extremeGreed';
    }

    if (price > analysis.tl_plus_sd) {
        return 'sentiment.greed';
    }

    if (price <= analysis.tl_minus_2sd) {
        return 'sentiment.extremeFear';
    }

    if (price < analysis.tl_minus_sd) {
        return 'sentiment.fear';
    }

    return 'sentiment.neutral';
}

export const BrowseStockCard = memo(function BrowseStockCard({ stock, onSelect }) {
    const { t } = useTranslation();
    const symbol = getStockSymbol(stock);
    const name = getStockName(stock);
    const sentimentKey = getSentimentKey(stock);
    const hasPrice = typeof stock?.price === 'number';

    return (
        <button
            type="button"
            className="read-only-watchlist__stock"
            onClick={() => onSelect(stock)}
        >
            <div className="read-only-watchlist__stockMain">
                <span className="read-only-watchlist__ticker">{symbol}</span>
                {name && name !== symbol ? (
                    <span className="read-only-watchlist__name">{name}</span>
                ) : null}
            </div>
            <div className="read-only-watchlist__meta">
                {hasPrice ? (
                    <span className="read-only-watchlist__price">
                        ${formatPrice(stock.price)}
                    </span>
                ) : null}
                {sentimentKey ? (
                    <span className={`read-only-watchlist__sentiment read-only-watchlist__sentiment--${sentimentKey.split('.').pop()}`}>
                        {t(sentimentKey)}
                    </span>
                ) : null}
            </div>
        </button>
    );
});
