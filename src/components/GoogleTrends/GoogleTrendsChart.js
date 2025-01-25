import React from 'react';
import './styles/GoogleTrendsChart.css';

const GoogleTrendsChart = ({ chartData }) => {
    // TODO: 使用 chartData 渲染圖表 (例如使用 Chart.js, Recharts)
    // 目前先簡單顯示 JSON 數據
    return (
        <div className="googletrends-chart-container">
            {chartData ? (
                <>
                    <h3>Google Trends vs. Stock Price</h3> {/* Chart Title */}
                    {/* 圖表將在這裡渲染 */}
                    <div className="chart-placeholder">
                        <p>圖表載入中...</p>
                        {/*  TODO: 實際圖表元件 */}
                    </div>
                    <div className="chart-description">
                        <p>本圖表比較了 [股票代碼/指數名稱] 的 Google 搜尋熱度與股價走勢。搜尋熱度曲線 (藍色) 反映了市場對該標的的關注度，股價曲線 (紅色) 顯示了實際價格變化。 請注意，Google 搜尋熱度僅為參考指標，投資決策需謹慎。</p> {/* Expandable Description */}
                    </div>
                </>
            ) : (
                <div className="no-data-message">
                    <p>請搜尋股票以顯示 Google Trends 與股價圖表</p>
                </div>
            )}
        </div>
    );
};

export default GoogleTrendsChart; 