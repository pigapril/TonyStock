import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import TrendsTimeframeSelector from './TrendsTimeframeSelector';
import { fetchGoogleTrendsMarketData } from './googleTrends.service';
import '../Loading/Loading.css';
import './GoogleTrendsMarketContainer.css';

const DEFAULT_TIMEFRAME = '3m';

const GoogleTrendsMarketContainer = () => {
    const { t } = useTranslation();
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);

    const fetchData = useCallback(async (currentTimeframe) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchGoogleTrendsMarketData(currentTimeframe);

            if (data && data.data && Array.isArray(data.data)) {
                setChartData(data.data);
            } else {
                setError(t('googleTrendsMarket.invalidData'));
                console.error('Invalid data format:', data);
            }
        } catch (err) {
            setError(err.message || t('googleTrendsMarket.fetchError'));
            console.error('Error details:', err);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData(timeframe);
    }, [fetchData, timeframe]);

    const handleTimeframeChange = useCallback((nextTimeframe) => {
        setTimeframe(nextTimeframe);
    }, []);

    return (
        <div className="google-trends-market-container">
            <div className="google-trends-market-controls">
                <TrendsTimeframeSelector
                    value={timeframe}
                    onChange={handleTimeframeChange}
                    disabled={loading}
                />
            </div>

            {loading && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>{t('common.loading')}</span>
                </div>
            )}
            {error && <div className="error-message">{t('common.errorPrefix')}: {error}</div>}

            {chartData && !loading && !error ? (
                <div className="google-trends-chart-card">
                    <GoogleTrendsSymbolChart data={chartData} symbol="SPY" />
                    <p className="chart-description">
                        {t('googleTrendsMarket.chartDescription')}
                    </p>
                </div>
            ) : !loading && !error && (
                <div className="empty-state">
                    <p>{t('common.noData')}</p>
                </div>
            )}
        </div>
    );
};

export default GoogleTrendsMarketContainer;
