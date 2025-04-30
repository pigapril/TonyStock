import React from 'react';
import './PageContainer.css';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const PageContainer = ({ 
  children, 
  title, 
  description,
  keywords,
  ogImage = "/og-image.png",
  ogUrl,
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterImage,
  jsonLd
}) => {
  const { t } = useTranslation();

  const defaultTitle = t('pageContainer.defaultTitle');
  const defaultDescription = t('pageContainer.defaultDescription');
  const defaultKeywords = t('pageContainer.defaultKeywords');

  const pageTitle = title ? `${title} | ${t('pageContainer.defaultTitle')}` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  
  // 為每個頁面生成預設的 og:url（如果沒有提供）
  const currentUrl = ogUrl || (typeof window !== 'undefined' ? window.location.href : '');
  // 使用 ogImage 作為 Twitter 卡片圖片的預設值
  const pageTwitterImage = twitterImage || ogImage;

  return (
    <div className="page-container">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={pageKeywords} />
        
        {/* Open Graph 標籤 */}
        <meta property="og:title" content={title || defaultTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content={ogType} />
        
        {/* Twitter Card 標籤 */}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={title || defaultTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageTwitterImage} />
        
        {/* 結構化數據 - 如果提供了 */}
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
