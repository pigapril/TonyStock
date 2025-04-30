import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import { fetchGoogleTrendsMarketData } from './googleTrends.service';
import '../Loading/Loading.css';
import './GoogleTrendsMarketContainer.css'; // 可自行建立此 CSS 檔來定義樣式

const GoogleTrendsMarketContainer = () => {
    const { t } = useTranslation();
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching market data...');
            const data = await fetchGoogleTrendsMarketData();
            console.log('Received data:', data);
            
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
        // 進入此頁面就呼叫 fetchData() 取得市場資料
        fetchData();
    }, [fetchData]);

    return (
        <div className="google-trends-market-container">
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
