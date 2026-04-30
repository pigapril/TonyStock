import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GoogleTrendsSymbolSearch from './GoogleTrendsSymbolSearch';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import TrendsTimeframeSelector from './TrendsTimeframeSelector';
import { fetchGoogleTrendsData } from './googleTrends.service';
import '../Loading/Loading.css';
import './GoogleTrendsSymbolContainer.css';

const DEFAULT_TIMEFRAME = '3m';

const GoogleTrendsSymbolContainer = () => {
    const { t } = useTranslation();
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [symbol, setSymbol] = useState('');
    const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);

    const fetchData = useCallback(async (currentSymbol, currentTimeframe) => {
        if (!currentSymbol) return;

        setLoading(true);
        setError(null);
        try {
            const data = await fetchGoogleTrendsData(currentSymbol, currentTimeframe);

            if (data && data.data && Array.isArray(data.data)) {
                setChartData(data.data);
            } else {
                setError(t('googleTrendsSymbol.invalidData'));
                console.error('Invalid data format:', data);
            }
        } catch (err) {
            setError(err.message || t('googleTrendsSymbol.fetchError'));
            console.error('Error details:', err);
        } finally {
            setLoading(false);
        }
    }, [t]);

    React.useEffect(() => {
        if (symbol) {
            fetchData(symbol, timeframe);
        }
    }, [fetchData, symbol, timeframe]);

    const handleSearch = useCallback((searchSymbol) => {
        setSymbol(searchSymbol);
    }, []);

    const handleTimeframeChange = useCallback((nextTimeframe) => {
        setTimeframe(nextTimeframe);
    }, []);

    return (
        <div className="google-trends-symbol-container">
            <div className="google-trends-controls">
                <GoogleTrendsSymbolSearch onSearch={handleSearch} />
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
                    <GoogleTrendsSymbolChart data={chartData} symbol={symbol} />
                    <p className="chart-description">
                        {t('googleTrendsSymbol.chartDescription', { symbol })}
                    </p>
                </div>
            ) : !loading && !error && (
                <div className="empty-state">
                    <p>{t('googleTrendsSymbol.prompt')}</p>
                </div>
            )}
        </div>
    );
};

export default GoogleTrendsSymbolContainer;
