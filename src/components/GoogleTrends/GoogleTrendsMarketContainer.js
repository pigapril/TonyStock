import React, { useState, useEffect, useCallback } from 'react';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import { fetchGoogleTrendsMarketData } from './googleTrends.service';
import '../Loading/Loading.css';
import './GoogleTrendsMarketContainer.css'; // 可自行建立此 CSS 檔來定義樣式

const GoogleTrendsMarketContainer = () => {
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
        // 進入此頁面就呼叫 fetchData() 取得市場資料
        fetchData();
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
                <div className="google-trends-chart-card">
                    <GoogleTrendsSymbolChart data={chartData} symbol="SPY" />
                    <p className="chart-description">
                        本圖表比較了多個市場關鍵字的 Google 搜尋熱度與 S&P500 (SPY) 股價走勢。
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
