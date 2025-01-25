import React from 'react';
import PageContainer from '../components/PageContainer';
import GoogleTrendsContainer from '../components/GoogleTrends/GoogleTrendsContainer';

export const GoogleTrendsPage = () => {
    return (
        <PageContainer title="Google 搜尋熱度" description="比較 Google 搜尋熱度與股價的關係。">
            <GoogleTrendsContainer />
        </PageContainer>
    );
}; 