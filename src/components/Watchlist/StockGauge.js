import React from 'react';
import { formatPrice } from '../../utils/priceUtils';
import './styles/StockGauge.css';

export const StockGauge = ({ price, support, resistance }) => {
    // Colors from PriceAnalysis.css
    const COLORS = {
        extremePessimism: '#0000FF',  // 極度悲觀 (matches tl_minus_2sd)
        pessimism: '#5B9BD5',         // 悲觀
        neutral: '#708090',           // 中性 (matches trendLine)
        optimism: '#F0B8CE',          // 樂觀
        extremeOptimism: '#D24A93',   // 極度樂觀 (matches tl_plus_2sd)
        neutralBackground: 'rgba(226, 232, 240, 0.3)' // Slate-200 for unfilled portion
    };

    // Calculate percentage (same as before)
    const calculatePercent = () => {
        if (price <= support) return 0;
        if (price >= resistance) return 100;
        return ((price - support) / (resistance - support)) * 100;
    };

    // Sentiment logic from PriceAnalysis
    const getSentimentColor = (price, support, resistance) => {
        const tlMinus2sd = support; // tl_minus_2sd
        const tlPlus2sd = resistance; // tl_plus_2sd
        const range = resistance - support;
        const tlMinusSd = support + (range * 0.25); // Approximate -1sd (25%)
        const tlPlusSd = support + (range * 0.75);  // Approximate +1sd (75%)
        const trendLine = support + (range * 0.5);  // Approximate trendLine (50%)

        if (price >= tlPlus2sd) {
            return COLORS.extremeOptimism;
        } else if (price > tlPlusSd) {
            return COLORS.optimism;
        } else if (price <= tlMinus2sd) {
            return COLORS.extremePessimism;
        } else if (price < tlMinusSd) {
            return COLORS.pessimism;
        } else {
            return COLORS.neutral;
        }
    };

    const percent = calculatePercent();
    const barColor = getSentimentColor(price, support, resistance);

    return (
        <div className="stock-gauge-container">
            {/* Price label */}
            <div className="price-label" style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}>
                ${formatPrice(price)}
            </div>
            {/* Gauge bar with filled portion */}
            <div className="gauge-bar">
                <div
                    className="gauge-fill"
                    style={{
                        width: `${percent}%`,
                        backgroundColor: barColor,
                    }}
                />
                <div
                    className="price-indicator"
                    style={{
                        left: `${percent}%`,
                        backgroundColor: barColor,
                    }}
                />
                <div className="support-marker" style={{ left: '0%' }} />
                <div className="resistance-marker" style={{ left: '100%' }} />
            </div>
        </div>
    );
};