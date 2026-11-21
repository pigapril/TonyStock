import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StockGauge } from '../../StockGauge';
import { formatPrice, isNearEdge } from '../../../../utils/priceUtils';
import '../../styles/StockAnalysis.css';

export const AnalysisSkeleton = memo(function AnalysisSkeleton({ className = '' }) {
    const { t } = useTranslation();
    return (
        <div className={`analysis-skeleton ${className}`.trim()} role="status" aria-label={t('watchlist.stockCard.analysis.loading')}>
            <span className="analysis-skeleton__value" />
            <span className="analysis-skeleton__track" />
            <span className="analysis-skeleton__value" />
        </div>
    );
});

export const StockAnalysis = memo(function StockAnalysis({ price, analysis, analysisStatus, quoteStatus }) {
    const { t } = useTranslation();

    // 同 StockAnalysisResult：價格缺席時 StockGauge 會把 null 當 0，
    // 指針停在最左並塗成「極度恐懼」藍。無價格就不畫量表。
    if (!analysis || price == null) {
        if (analysisStatus === 'pending' || quoteStatus === 'pending') {
            return <AnalysisSkeleton />;
        }

        if (analysisStatus === 'error' || quoteStatus === 'error') {
            return <span className="analysis-loading analysis-error">{t('watchlist.stockCard.analysis.loadError', { defaultValue: 'Unable to load analysis' })}</span>;
        }

        if (analysisStatus === 'unavailable' || quoteStatus === 'unavailable') {
            return <span className="analysis-loading">{t('watchlist.stockCard.analysis.unavailable', { defaultValue: 'No analysis data' })}</span>;
        }

        return <span className="analysis-loading">{t('watchlist.stockCard.analysis.loading')}</span>;
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
