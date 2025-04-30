import React from 'react';
import PageContainer from '../PageContainer/PageContainer';
import GoogleTrendsMarketContainer from '../GoogleTrends/GoogleTrendsMarketContainer';
import './GoogleTrendsMarketPage.css'; // 可自行建立此 CSS 檔來定義頁面樣式
import { useTranslation } from 'react-i18next'; // 1. Import useTranslation

export const GoogleTrendsMarketPage = () => {
    const { t } = useTranslation(); // 2. Use the hook

    return (
        <PageContainer 
            title={t('googleTrendsMarket.pageTitle')} // 3. Use t()
            description={t('googleTrendsMarket.pageDescription')} // 3. Use t()
            className="google-trends-market-page-container"
        >
            <h1 className="google-trends-page-title">{t('googleTrendsMarket.heading')}</h1> {/* 3. Use t() */}
            <GoogleTrendsMarketContainer />
        </PageContainer>
    );
};

export default GoogleTrendsMarketPage; 