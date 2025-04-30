import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GoogleTrendsSymbolSearch from './GoogleTrendsSymbolSearch';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import { fetchGoogleTrendsData } from './googleTrends.service';
import '../Loading/Loading.css';  // 確保引入載入動畫樣式
import './GoogleTrendsSymbolContainer.css';  // 引入 Container 樣式

const GoogleTrendsSymbolContainer = () => {
    const { t } = useTranslation();
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [symbol, setSymbol] = useState('');

    const fetchData = useCallback(async (currentSymbol) => {
        if (!currentSymbol) return;
        
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching data for symbol:', currentSymbol);
            const data = await fetchGoogleTrendsData(currentSymbol);
            console.log('Received data:', data);
            
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
            fetchData(symbol);
        }
    }, [fetchData, symbol]);

    const handleSearch = useCallback((searchSymbol) => {
        console.log('Search triggered with symbol:', searchSymbol);
        setSymbol(searchSymbol);
    }, []);

    return (
        <div className="google-trends-symbol-container">
            <GoogleTrendsSymbolSearch onSearch={handleSearch} />

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