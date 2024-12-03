import React, { memo } from 'react';
import twFlag from '../../../../assets/flags/tw-flag.svg';
import usFlag from '../../../../assets/flags/us-flag.svg';
import '../../styles/StockHeader.css';

export const StockHeader = memo(function StockHeader({ stock }) {
    const renderLogo = () => {
        if (stock.logo === 'TW') {
            return (
                <div className="default-logo tw-stock">
                    <img 
                        src={twFlag}
                        alt="Taiwan Flag"
                        className="flag-icon"
                    />
                </div>
            );
        } else if (stock.logo === 'US_ETF') {
            return (
                <div className="default-logo us-etf">
                    <img 
                        src={usFlag}
                        alt="US Flag"
                        className="flag-icon"
                    />
                </div>
            );
        } else if (stock.logo) {
            return (
                <img 
                    src={stock.logo} 
                    alt={`${stock.symbol} logo`}
                    className="stock-logo-img"
                    onError={(e) => {
                        e.target.src = '/default-stock-logo.png';
                    }}
                />
            );
        } else {
            return (
                <div className="default-logo">
                    {stock.symbol[0]}
                </div>
            );
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