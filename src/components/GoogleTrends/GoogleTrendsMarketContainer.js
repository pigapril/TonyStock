import React, { useState, useEffect, useCallback } from 'react';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import { fetchGoogleTrendsData } from './googleTrends.service';
import '../shared/styles/Loading.css';
import './GoogleTrendsMarketContainer.css'; // 可自行建立此 CSS 檔來定義樣式

const GoogleTrendsMarketContainer = () => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 這裡預設傳送的 symbol，即由後端定義 q 參數的值
    const DEFAULT_SYMBOL = 'market';

    const fetchData = useCallback(async (symbol) => {
        if (!symbol) return;
        
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching data for symbol:', symbol);
            const data = await fetchGoogleTrendsData(symbol);
            console.log('Received data:', data);
            
            if (data && data.data && Array.isArray(data.data)) {
                setChartData(data.data);
            } else {
                setError('無效的數據格式');
                console.error('Invalid data format:', data);
            }
        } catch (err) {
            setError(err.message || '獲取數據時發生錯誤');
            console.error('Error details:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // 一進入頁面就使用預設 symbol 請求數據
        fetchData(DEFAULT_SYMBOL);
    }, [fetchData]);

    return (
        <div className="google-trends-market-container">
            {loading && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>載入中...</span>
                </div>
            )}
            {error && <div className="error-message">錯誤: {error}</div>}

            {chartData && !loading && !error ? (
                <div className="google-trends-market-chart-card">
                    <GoogleTrendsSymbolChart data={chartData} />
                    <p className="chart-description">
                        本圖表比較了市場的 Google 搜尋熱度與股價走勢。
                    </p>
                </div>
            ) : !loading && !error && (
                <div className="empty-state">
                    <p>無可顯示的數據</p>
                </div>
            )}
        </div>
    );
};

export default GoogleTrendsMarketContainer;
