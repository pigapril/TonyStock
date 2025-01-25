import React, { useState, useCallback } from 'react';
import { GoogleTrendsSearchBox } from '../components/GoogleTrends/GoogleTrendsSearchBox';
import GoogleTrendsChart from '../components/GoogleTrends/GoogleTrendsChart';
import * as googleTrendsService from '../services/googleTrends.service'; // 引入 service
import './styles/GoogleTrendsPage.css';

const GoogleTrendsPage = () => {
    const [chartData, setChartData] = useState(null);
    const [selectedStock, setSelectedStock] = useState(null);

    const handleStockSelect = useCallback(async (stock) => {
        setSelectedStock(stock);
        try {
            const data = await googleTrendsService.getGoogleTrendsData(stock.symbol);
            setChartData(data);
        } catch (error) {
            console.error('Failed to fetch Google Trends data:', error);
            // TODO: 錯誤處理 (例如顯示錯誤訊息給使用者)
            setChartData(null); // 清空圖表數據
        }
    }, []);

    return (
        <div className="googletrends-page">
            <h1>Google 搜尋熱度與股價比較</h1>
            <div className="search-box-container">
                <GoogleTrendsSearchBox
                    onSelect={handleStockSelect}
                    googleTrendsService={googleTrendsService} // 傳遞 service
                />
            </div>
            <div className="chart-container">
                <GoogleTrendsChart chartData={chartData} />
            </div>
        </div>
    );
};

export { GoogleTrendsPage }; 