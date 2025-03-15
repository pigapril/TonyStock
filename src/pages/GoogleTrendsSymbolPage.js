import React from 'react';
import PageContainer from '../components/PageContainer';
import GoogleTrendsSymbolContainer from '../components/GoogleTrends/GoogleTrendsSymbolContainer';
import './GoogleTrendsSymbolPage.css';

export const GoogleTrendsSymbolPage = () => {
    return (
        <PageContainer 
            title="Google 標的搜尋熱度" 
            description="比較 Google 標的搜尋熱度與股價的關係。"
            className="google-trends-symbol-page-container"
        >
            <h1 className="google-trends-page-title">Google 標的搜尋熱度分析</h1>
            <GoogleTrendsSymbolContainer />
        </PageContainer>
    );
}; 