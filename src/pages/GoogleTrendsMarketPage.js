import React from 'react';
import PageContainer from '../components/PageContainer';
import GoogleTrendsMarketContainer from '../components/GoogleTrends/GoogleTrendsMarketContainer';
import './GoogleTrendsMarketPage.css'; // 可自行建立此 CSS 檔來定義頁面樣式

export const GoogleTrendsMarketPage = () => {
    return (
        <PageContainer 
            title="Google 市場趨勢" 
            description="比較 Google 市場搜尋熱度與股價走勢。"
            className="google-trends-market-page-container"
        >
            <h1 className="google-trends-market-page-title">Google 市場趨勢分析</h1>
            <GoogleTrendsMarketContainer />
        </PageContainer>
    );
};

export default GoogleTrendsMarketPage; 