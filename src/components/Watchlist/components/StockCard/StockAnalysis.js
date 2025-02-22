import React, { memo } from 'react';
import { StockGauge } from '../../StockGauge';
import { formatPrice, isNearEdge } from '../../../Common/priceUtils';
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
        <div className="stock-analysis-container">
            <div className="stock-analysis-content">
                <span className={`analysis-value support ${isNearLower ? 'pulse' : ''}`}>
                    {formatPrice(analysis.tl_minus_2sd)}
                </span>
                <StockGauge
                    price={price}
                    support={analysis.tl_minus_2sd}
                    resistance={analysis.tl_plus_2sd}
                />
                <span className={`analysis-value resistance ${isNearUpper ? 'pulse' : ''}`}>
                    {formatPrice(analysis.tl_plus_2sd)}
                </span>
            </div>
        </div>
    );
});