import React from 'react';
import './Legal.css';
import { useTranslation } from 'react-i18next';

export const Legal = () => {
  const { t } = useTranslation();

  return (
    <div className="legal-page">
      <h1 className="legal-title">{t('legal.mainHeading')}</h1>
      
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
            </ul>
          </div>
        </div>
      </div>

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
            </ul>
          </div>
        </div>

        <div className="subsection">
          <h3 className="subsection-title">{t('legal.disclaimerTitle')}</h3>
          <div className="subsection-content">
            <p>{t('legal.disclaimerIntro')}</p>
            <ul className="legal-list">
              <li>{t('legal.disclaimerItem1')}</li>
              <li>{t('legal.disclaimerItem2')}</li>
              <li>{t('legal.disclaimerItem3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 