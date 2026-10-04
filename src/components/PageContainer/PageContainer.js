import React from 'react';
import './PageContainer.css';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { socialImagePath, canonicalUrl, normalizeLocale } from '../../utils/socialMetadata';

const PageContainer = ({ 
  children, 
  title, 
  description,
  keywords,
  ogImage,
  ogImageAlt,
  ogImageWidth,
  ogImageHeight,
  ogUrl,
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterImage,
  jsonLd,
  includeHreflang = true,
  robots,
  metadataOnly = false
}) => {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const location = useLocation();

  const defaultTitle = t('pageContainer.defaultTitle');
  const defaultDescription = t('pageContainer.defaultDescription');
  const defaultKeywords = t('pageContainer.defaultKeywords');

  const pageTitle = title ? `${title} | ${t('pageContainer.defaultTitle')}` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sentimentinsideout.com';
  const pageOgUrl = canonicalUrl(ogUrl || location.pathname, origin);
  const pageImage = new URL(ogImage || socialImagePath(location.pathname, lang), origin).href;
  const pageTwitterImage = new URL(twitterImage || pageImage, origin).href;
  const imageAlt = ogImageAlt || title || defaultTitle;
  const imageWidth = ogImageWidth || (!ogImage ? 1200 : undefined);
  const imageHeight = ogImageHeight || (!ogImage ? 630 : undefined);

  // `zh` is a legacy alias of `zh-TW`, not an independently translated page.
  // Advertising it as an alternate makes two identical URLs compete as canonical.
  const supportedLngs = (i18n.options.supportedLngs || []).filter(lng => lng !== 'zh');
  // i18n.options.fallbackLng is the object { zh: [...], default: ['en'] }
  // (see i18n.js), not a language string. Normalize it here so the
  // <html lang>, og:locale and x-default logic below always get a string.
  const rawFallbackLng = i18n.options.fallbackLng;
  const fallbackLng = typeof rawFallbackLng === 'string'
    ? rawFallbackLng
    : (rawFallbackLng?.default?.[0] || 'en');

  const pathWithoutLang = location.pathname.startsWith(`/${lang}`)
    ? location.pathname.substring(`/${lang}`.length)
    : location.pathname;

  const basePath = pathWithoutLang === '' ? '/' : (pathWithoutLang.startsWith('/') ? pathWithoutLang : `/${pathWithoutLang}`);

  const localizedJsonLd = jsonLd ? {
    ...jsonLd,
    ...(jsonLd.url && { url: pageOgUrl }),
    ...(jsonLd.mainEntityOfPage && { mainEntityOfPage: pageOgUrl }),
    ...(jsonLd.potentialAction?.target && {
        potentialAction: {
            ...jsonLd.potentialAction,
            target: jsonLd.potentialAction.target.replace('https://sentimentinsideout.com', `${window.location.origin}/${lang}`)
        }
    })
  } : null;

  const Container = metadataOnly ? React.Fragment : 'div';
  return (
    <Container {...(!metadataOnly && { className: 'page-container' })}>
      <Helmet htmlAttributes={{ lang: lang || fallbackLng }}>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={pageKeywords} />
        
        {/* Open Graph 標籤 */}
        <meta property="og:title" content={title || defaultTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content="Sentiment Inside Out" />
        <meta property="og:image" content={pageImage} />
        <meta property="og:image:alt" content={imageAlt} />
        {imageWidth && <meta property="og:image:width" content={imageWidth} />}
        {imageHeight && <meta property="og:image:height" content={imageHeight} />}
        {pageImage.endsWith('.png') && <meta property="og:image:type" content="image/png" />}
        <meta property="og:url" content={pageOgUrl} />
        <meta property="og:type" content={ogType} />
        <meta property="og:locale" content={normalizeLocale(lang || fallbackLng) === 'en' ? 'en_US' : 'zh_TW'} />
        
        {/* Twitter Card 標籤 */}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={title || defaultTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageTwitterImage} />
        <meta name="twitter:image:alt" content={imageAlt} />
        {robots && <meta name="robots" content={robots} />}
        
        {/* Canonical 標籤：指定此頁面的首選 URL */}
        <link rel="canonical" href={pageOgUrl} />
        
        {/* Hreflang 標籤 */}
        {includeHreflang && supportedLngs
          .filter(lng => lng !== 'cimode')
          .map(supportedLang => {
            const alternateUrl = `${origin}/${supportedLang}${basePath === '/' ? '/' : `${basePath.replace(/\/$/, '')}/`}`;
            return (
              <link
                key={supportedLang}
                rel="alternate"
                hrefLang={supportedLang}
                href={alternateUrl}
              />
            );
        })}

        {includeHreflang && fallbackLng && supportedLngs.includes(fallbackLng) && (
          <link
            rel="alternate"
            hrefLang="x-default"
            href={basePath === '/' ? `${origin}/` : `${origin}/${fallbackLng}${basePath.replace(/\/$/, '')}/`}
          />
        )}
        
        {/* 結構化數據 - 如果提供了 */}
        {localizedJsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(localizedJsonLd)}
          </script>
        )}
      </Helmet>
      {metadataOnly ? children : <div className="page-content">{children}</div>}
    </Container>
  );
};

export default PageContainer;
