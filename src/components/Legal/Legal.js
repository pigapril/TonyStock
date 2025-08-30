import React, { useMemo } from 'react';
import './Legal.css';
import { useTranslation } from 'react-i18next';
import PageContainer from '../PageContainer/PageContainer';

export const Legal = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

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
        <h1 className="legal-title">{t('legal.mainHeading')}</h1>
        <p className="legal-intro">
          {t('legal.lastUpdated')}<br />
          {t('legal.effectiveDate')}
        </p>

        {/* 服務條款部分 */}
        <div className="legal-section">
          <h2 className="section-title">{t('legal.termsOfServiceTitle')}</h2>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.serviceDescriptionTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.serviceDescriptionIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.serviceDescriptionItem1')}</li>
                <li>{t('legal.serviceDescriptionItem2')}</li>
                <li>{t('legal.serviceDescriptionItem3')}</li>
                <li>{t('legal.serviceDescriptionItem4')}</li>
                <li>{t('legal.serviceDescriptionItem5')}</li>
                <li>{t('legal.serviceDescriptionItem6')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.userAccountTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.userAccountIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.userAccountItem1')}</li>
                <li>{t('legal.userAccountItem2')}</li>
                <li>{t('legal.userAccountItem3')}</li>
                <li>{t('legal.userAccountItem4')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.paymentServicesTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.paymentServicesIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.paymentServicesItem1')}</li>
                <li>{t('legal.paymentServicesItem2')}</li>
                <li>{t('legal.paymentServicesItem3')}</li>
                <li>{t('legal.paymentServicesItem4')}</li>
                <li>{t('legal.paymentServicesItem5')}</li>
                <li>{t('legal.paymentServicesItem6')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.usageRulesTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.usageRulesIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.usageRulesItem1')}</li>
                <li>{t('legal.usageRulesItem2')}</li>
                <li>{t('legal.usageRulesItem3')}</li>
                <li>{t('legal.usageRulesItem4')}</li>
                <li>{t('legal.usageRulesItem5')}</li>
                <li>{t('legal.usageRulesItem6')}</li>
                <li>{t('legal.usageRulesItem7')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.disclaimerTitle')}</h3>
            <div className="subsection-content">
              <p><strong>{t('legal.disclaimerIntro')}</strong></p>
              <ul className="legal-list">
                <li>{t('legal.disclaimerItem1')}</li>
                <li>{t('legal.disclaimerItem2')}</li>
                <li>{t('legal.disclaimerItem3')}</li>
                <li>{t('legal.disclaimerItem4')}</li>
                <li>{t('legal.disclaimerItem5')}</li>
                <li>{t('legal.disclaimerItem6')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.intellectualPropertyTitle')}</h3>
            <div className="subsection-content">
              <ul className="legal-list">
                <li>{t('legal.intellectualPropertyItem1')}</li>
                <li>{t('legal.intellectualPropertyItem2')}</li>
                <li>{t('legal.intellectualPropertyItem3')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 隱私權政策部分 */}
        <div className="legal-section">
          <h2 className="section-title">{t('legal.privacyPolicyTitle')}</h2>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.dataCollectionTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.dataCollectionIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.dataCollectionItem1')}</li>
                <li>{t('legal.dataCollectionItem2')}</li>
                <li>{t('legal.dataCollectionItem3')}</li>
                <li>{t('legal.dataCollectionItem4')}</li>
                <li>{t('legal.dataCollectionItem5')}</li>
                <li>{t('legal.dataCollectionItem6')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.dataUsageTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.dataUsageIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.dataUsageItem1')}</li>
                <li>{t('legal.dataUsageItem2')}</li>
                <li>{t('legal.dataUsageItem3')}</li>
                <li>{t('legal.dataUsageItem4')}</li>
                <li>{t('legal.dataUsageItem5')}</li>
                <li>{t('legal.dataUsageItem6')}</li>
                <li>{t('legal.dataUsageItem7')}</li>
                <li>{t('legal.dataUsageItem8')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.thirdPartyServicesTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.thirdPartyServicesIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.thirdPartyServicesItem1')}</li>
                <li>{t('legal.thirdPartyServicesItem2')}</li>
                <li>{t('legal.thirdPartyServicesItem3')}</li>
                <li>{t('legal.thirdPartyServicesItem4')}</li>
                <li>{t('legal.thirdPartyServicesItem5')}</li>
                <li>{t('legal.thirdPartyServicesItem6')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.dataProtectionTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.dataProtectionIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.dataProtectionItem1')}</li>
                <li>{t('legal.dataProtectionItem2')}</li>
                <li>{t('legal.dataProtectionItem3')}</li>
                <li>{t('legal.dataProtectionItem4')}</li>
                <li>{t('legal.dataProtectionItem5')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.cookieUsageTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.cookieUsageIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.cookieUsageItem1')}</li>
                <li>{t('legal.cookieUsageItem2')}</li>
                <li>{t('legal.cookieUsageItem3')}</li>
                <li>{t('legal.cookieUsageItem4')}</li>
                <li>{t('legal.cookieUsageItem5')}</li>
                <li>{t('legal.cookieUsageItem6')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.userRightsTitle')}</h3>
            <div className="subsection-content">
              <p>{t('legal.userRightsIntro')}</p>
              <ul className="legal-list">
                <li>{t('legal.userRightsItem1')}</li>
                <li>{t('legal.userRightsItem2')}</li>
                <li>{t('legal.userRightsItem3')}</li>
                <li>{t('legal.userRightsItem4')}</li>
                <li>{t('legal.userRightsItem5')}</li>
              </ul>
            </div>
          </div>

          <div className="subsection">
            <h3 className="subsection-title">{t('legal.dataRetentionTitle')}</h3>
            <div className="subsection-content">
              <ul className="legal-list">
                <li>{t('legal.dataRetentionItem1')}</li>
                <li>{t('legal.dataRetentionItem2')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="legal-section">
          <h2 className="section-title">{t('legal.contactUsTitle')}</h2>
          <div className="subsection-content">
            <p>{t('legal.contactUsIntro')}</p>
            <ul className="legal-list">
              <li>{t('legal.contactUsWebsite')}</li>
              <li>{t('legal.contactUsEmail')}</li>
              <li>{t('legal.contactUsResponseTime')}</li>
            </ul>
          </div>
        </div>

        {/* 政策更新 */}
        <div className="legal-section">
          <h2 className="section-title">{t('legal.policyUpdatesTitle')}</h2>
          <div className="subsection-content">
            <p>{t('legal.policyUpdatesIntro')}</p>
            <ul className="legal-list">
              <li>{t('legal.policyUpdatesItem1')}</li>
              <li>{t('legal.policyUpdatesItem2')}</li>
              <li>{t('legal.policyUpdatesItem3')}</li>
              <li>{t('legal.policyUpdatesItem4')}</li>
            </ul>
          </div>
        </div>


      </div>
    </PageContainer>
  );
}; 