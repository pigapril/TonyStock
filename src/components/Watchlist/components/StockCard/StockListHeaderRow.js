import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { SortButton } from '../SortButton';

export function StockListHeaderRow({ sortState, onSortChange }) {
    const { t } = useTranslation();

    return (
        <div className="stock-card-header-row-wrapper">
            <div className="stock-card-header-row">
                <span className="stock-header-title">
                    <SortButton
                        column="symbol"
                        label={t('watchlist.stockCard.header.symbol')}
                        sortState={sortState}
                        onSortChange={onSortChange}
                    />
                </span>
                <span className="current-price-title">
                    <SortButton
                        column="price"
                        label={t('watchlist.stockCard.header.price')}
                        sortState={sortState}
                        onSortChange={onSortChange}
                    />
                </span>
                <span className="stock-analysis-title">{t('watchlist.stockCard.header.analysis')}</span>
                <span className="stock-sentiment-title">
                    <SortButton
                        column="sentiment"
                        label={t('watchlist.stockCard.header.sentiment')}
                        sortState={sortState}
                        onSortChange={onSortChange}
                    />
                </span>
                <span className="stock-news-title">{t('watchlist.stockCard.header.news')}</span>
            </div>
        </div>
    );
}

StockListHeaderRow.propTypes = {
    sortState: PropTypes.shape({
        key: PropTypes.string,
        direction: PropTypes.string
    }),
    onSortChange: PropTypes.func.isRequired
};
