import React, { memo } from 'react';
import { StockGauge } from '../../StockGauge';
import { formatPrice, isNearEdge } from '../../utils/priceUtils';
import '../../styles/StockAnalysis.css';

export const StockAnalysis = memo(function StockAnalysis({ price, analysis }) {
    if (!analysis) {
        return <span className="analysis-loading">分析中</span>;
    }

    const { isNearUpper, isNearLower } = isNearEdge(
        price, 
        analysis.tl_minus_2sd, 
        analysis.tl_plus_2sd
    );

    return (
        <div className="watchlist-stock-gauge">
            <StockGauge
                price={price}
                support={analysis.tl_minus_2sd}
                resistance={analysis.tl_plus_2sd}
            />
            <div className={`watchlist-stock-analysis ${
                isNearUpper ? 'near-upper-edge' : ''
            } ${
                isNearLower ? 'near-lower-edge' : ''
            }`}>
                <span className={`analysis-value support ${
                    isNearLower ? 'pulse' : ''
                }`}>
                    {formatPrice(analysis.tl_minus_2sd)}
                </span>
                <span className={`analysis-value resistance ${
                    isNearUpper ? 'pulse' : ''
                }`}>
                    {formatPrice(analysis.tl_plus_2sd)}
                </span>
            </div>
            <span className="watchlist-stock-price">
                {price ? `$${formatPrice(price)}` : '-'}
            </span>
        </div>
    );
}); 