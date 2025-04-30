import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import twFlag from '../../../../assets/flags/tw-flag.svg';
import usFlag from '../../../../assets/flags/us-flag.svg';
import '../../styles/StockHeader.css';

export const StockHeader = memo(function StockHeader({ stock }) {
    const { t } = useTranslation();

    const renderLogo = () => {
        if (stock.logo === 'TW') {
            return (
                <div className="default-logo tw-stock">
                    <img 
                        src={twFlag}
                        alt={t('watchlist.stockCard.header.twFlagAlt')}
                        className="flag-icon"
                    />
                </div>
            );
        } else if (stock.logo === 'US_ETF') {
            return (
                <div className="default-logo us-etf">
                    <img 
                        src={usFlag}
                        alt={t('watchlist.stockCard.header.usFlagAlt')}
                        className="flag-icon"
                    />
                </div>
            );
        } else if (stock.logo) {
            return (
                <img 
                    src={stock.logo} 
                    alt={t('watchlist.stockCard.header.logoAlt', { symbol: stock.symbol })}
                    className="stock-logo-img"
                    onError={(e) => {
                        e.target.src = '/default-stock-logo.png';
                        e.target.alt = t('watchlist.stockCard.header.logoAlt', { symbol: stock.symbol });
                    }}
                />
            );
        } else {
            if (stock && stock.symbol) {
                return (
                    <div className="default-logo">
                        {stock.symbol[0]}
                    </div>
                );
            } else {
                return null;
            }
        }
    };

    return (
        <div className="stock-info">
            <div className="stock-logo">
                {renderLogo()}
            </div>
            <div className="stock-text-info">
                <span className="watchlist-stock-symbol">
                    {stock.symbol}
                </span>
                <div className="stock-names">
                    {stock.name !== stock.nameEn ? (
                        <>
                            <span className="stock-name-zh">{stock.name}</span>
                            <span className="stock-name-en">{stock.nameEn}</span>
                        </>
                    ) : (
                        <span className="stock-name">{stock.name}</span>
                    )}
                </div>
            </div>
        </div>
    );
}); 