import React from 'react';
import PageContainer from '../PageContainer/PageContainer';
import GoogleTrendsSymbolContainer from '../GoogleTrends/GoogleTrendsSymbolContainer';
import './GoogleTrendsSymbolPage.css';
import { useTranslation } from 'react-i18next';

export const GoogleTrendsSymbolPage = () => {
    const { t } = useTranslation();

    return (
        <PageContainer 
            title={t('googleTrendsSymbol.pageTitle')}
            description={t('googleTrendsSymbol.pageDescription')}
            className="google-trends-symbol-page-container"
        >
            <h1 className="google-trends-page-title">{t('googleTrendsSymbol.heading')}</h1>
            <GoogleTrendsSymbolContainer />
        </PageContainer>
    );
}; 