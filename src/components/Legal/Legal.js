import { useMemo } from 'react';
import './Legal.css';
import { useTranslation } from 'react-i18next';
import PageContainer from '../PageContainer/PageContainer';
import MarkdownRenderer from './MarkdownRenderer';

export const Legal = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // 根據語言選擇對應的 markdown 文件
  const getMarkdownFilePath = () => {
    const basePath = '/docs/T&C';
    switch (currentLang) {
      case 'zh-TW':
      case 'zh':
        return `${basePath}/zh-tw_T&C_20250914.md`;
      case 'en':
      default:
        return `${basePath}/en_T&C_20250914.md`;
    }
  };

  const legalJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "LegalNotice",
    "name": t('legal.pageTitle'),
    "description": t('legal.pageDescription'),
    "url": `${window.location.origin}/${currentLang}/legal`,
    "inLanguage": currentLang,
  }), [t, currentLang]);

  return (
    <PageContainer
      title={t('legal.pageTitle')}
      description={t('legal.pageDescription')}
      keywords={t('legal.keywords')}
      jsonLd={legalJsonLd}
    >
      <div className="legal-page">
        <h1 className="legal-title">{t('legal.pageTitle')}</h1>

        <div className="legal-intro">
          <p className="legal-last-updated">
            {t('legal.lastUpdated')}<br />
            {t('legal.effectiveDate')}
          </p>
        </div>

        {/* 使用 MarkdownRenderer 渲染條款內容 */}
        <MarkdownRenderer
          filePath={getMarkdownFilePath()}
          className="legal-content"
        />
      </div>
    </PageContainer>
  );
}; 