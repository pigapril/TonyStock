import React from 'react';
import './PageContainer.css';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

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
  const { lang } = useParams();

  const defaultTitle = t('pageContainer.defaultTitle');
  const defaultDescription = t('pageContainer.defaultDescription');
  const defaultKeywords = t('pageContainer.defaultKeywords');

  const pageTitle = title ? `${title} | ${t('pageContainer.defaultTitle')}` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  
  const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const pageOgUrl = ogUrl || (typeof window !== 'undefined' ? window.location.origin + currentPathname : '');

  const pageTwitterImage = twitterImage || ogImage;

  const localizedJsonLd = jsonLd ? {
    ...jsonLd,
    ...(jsonLd.url && { url: pageOgUrl }),
    ...(jsonLd.potentialAction?.target && {
        potentialAction: {
            ...jsonLd.potentialAction,
            target: jsonLd.potentialAction.target.replace('https://sentimentinsideout.com', `${window.location.origin}/${lang}`)
        }
    })
  } : null;

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
        <meta property="og:url" content={pageOgUrl} />
        <meta property="og:type" content={ogType} />
        {lang && <meta property="og:locale" content={lang.replace('-', '_')} />}
        
        {/* Twitter Card 標籤 */}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={title || defaultTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageTwitterImage} />
        
        {/* 結構化數據 - 如果提供了 */}
        {localizedJsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(localizedJsonLd)}
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
