import React, { useState, useCallback } from 'react';
import GoogleTrendsSymbolSearch from './GoogleTrendsSymbolSearch';
import GoogleTrendsSymbolChart from './GoogleTrendsSymbolChart';
import { fetchGoogleTrendsData } from './googleTrends.service';
import '../shared/styles/Loading.css';  // 確保引入載入動畫樣式
import './GoogleTrendsSymbolContainer.css';  // 引入 Container 樣式

const GoogleTrendsSymbolContainer = () => {
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
                    <span>載入中...</span>
                </div>
            )}
            {error && <div className="error-message">錯誤: {error}</div>}

            {chartData && !loading && !error ? (
                <div className="google-trends-symbol-chart-card">
                    <GoogleTrendsSymbolChart data={chartData} symbol={symbol} />
                    <p className="chart-description">
                        本圖表比較了 {symbol} 的 Google 搜尋熱度與股價走勢。
                        搜尋熱度反映了市場對該標的的關注度，
                        股價顯示了實際價格變化。
                    </p>
                </div>
            ) : !loading && !error && (
                <div className="empty-state">
                    <p>請在上方搜尋框輸入股票代號來查看數據</p>
                </div>
            )}
        </div>
    );
};

export default GoogleTrendsSymbolContainer; 