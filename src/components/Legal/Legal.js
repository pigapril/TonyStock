import { useMemo } from 'react';
import './Legal.css';
import { useTranslation } from 'react-i18next';
import PageContainer from '../PageContainer/PageContainer';
import MarkdownRenderer from './MarkdownRenderer';

export const Legal = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // 根據語言選擇對應的 markdown 文件
  const getLegalDocument = () => {
    const basePath = '/docs/T&C';
    switch (currentLang) {
      case 'zh-TW':
      case 'zh':
        return { filePath: `${basePath}/zh-tw_T&C_20261008.md`, contentLocale: 'zh-TW' };
      case 'zh-CN':
        return { filePath: `${basePath}/zh-cn_T&C_20261008.md`, contentLocale: 'zh-CN' };
      case 'ko-KR':
        return { filePath: `${basePath}/ko-kr_T&C_20261008.md`, contentLocale: 'ko-KR' };
      case 'en':
      default:
        return { filePath: `${basePath}/en_T&C_20261008.md`, contentLocale: 'en' };
    }
  };
  const legalDocument = getLegalDocument();

  const legalJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "LegalNotice",
    "name": t('legal.pageTitle'),
    "description": t('legal.pageDescription'),
    "url": `${window.location.origin}/${currentLang}/legal`,
    "inLanguage": legalDocument.contentLocale,
  }), [t, currentLang, legalDocument.contentLocale]);

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
            {t('legal.lastUpdated')}
          </p>
        </div>

        {/* 使用 MarkdownRenderer 渲染條款內容 */}
        <MarkdownRenderer
          filePath={legalDocument.filePath}
          contentLocale={legalDocument.contentLocale}
          className="legal-content"
        />
      </div>
    </PageContainer>
  );
};
