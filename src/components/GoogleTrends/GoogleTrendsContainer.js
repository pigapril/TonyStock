import React, { useState, useCallback } from 'react';
import GoogleTrendsSearch from './GoogleTrendsSearch';
import GoogleTrendsChart from './GoogleTrendsChart';
import { fetchGoogleTrendsData } from './googleTrends.service'; // 假設 API service 檔案

const GoogleTrendsContainer = () => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [symbol, setSymbol] = useState('SPY'); // 預設顯示 SPY

    const fetchData = useCallback(async (currentSymbol) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchGoogleTrendsData(currentSymbol);
            if (data) {
                setChartData(data);
            } else {
                setError('Failed to fetch Google Trends data');
            }
        } catch (err) {
            setError('Error fetching Google Trends data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始載入 SPY 數據
    React.useEffect(() => {
        fetchData(symbol);
    }, [fetchData, symbol]);


    const handleSearch = useCallback((searchSymbol) => {
        setSymbol(searchSymbol); // 更新 symbol 狀態，觸發 useEffect 重新 fetching 數據
    }, []);


    return (
        <div>
            <h2>Google 搜尋熱度 vs. 股價</h2>
            <GoogleTrendsSearch onSearch={handleSearch} />

            {loading && <p>Loading data...</p>}
            {error && <p>Error: {error}</p>}

            {chartData && !loading && !error && (
                <GoogleTrendsChart data={chartData} />
            )}

            <p>
                本圖表比較了 {symbol} 的 Google 搜尋熱度與股價走勢。搜尋熱度曲線 (藍色) 反映了市場對該標的的關注度，股價曲線 (綠色) 顯示了實際價格變化。 請注意，Google 搜尋熱度僅為參考指標，投資決策需謹慎。
            </p>
        </div>
    );
};

export default GoogleTrendsContainer; 