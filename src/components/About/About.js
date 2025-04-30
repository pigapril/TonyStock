import React from 'react';
import { FaEnvelope } from 'react-icons/fa';
import aboutImage from '../../assets/images/aboutme.jpg';
import './About.css';
import PageContainer from '../PageContainer/PageContainer';
import { useTranslation } from 'react-i18next';

export const About = () => {
  const { t } = useTranslation();

  // 定義 JSON-LD 結構化數據
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": t('about.jsonLdName'),
    "description": t('about.jsonLdDescription'),
    "url": "https://sentimentinsideout.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "Sentiment Inside Out",
      "email": "support@sentimentinsideout.com"
    }
  };

  return (
    <PageContainer
      title={t('about.pageTitle')}
      description={t('about.pageDescription')}
      keywords={t('about.keywords')}
      ogImage="/images/about-og.png"
      ogUrl="https://sentimentinsideout.com/about"
      ogType="website"
      ogTitle={t('about.ogTitle')}
      twitterCard="summary_large_image"
      twitterImage="/images/about-og.png"
      jsonLd={aboutJsonLd}
    >
      <div className="about-page">
        <div className="about-container">
          <div className="about-image">
            <img src={aboutImage} alt={t('about.imageAlt')} />
          </div>
          
          <div className="about-content">
            <h1 className="about-title">{t('about.heading')}</h1>
            
            <div className="about-text">
              <section className="about-section">
                <h2>{t('about.section1Title')}</h2>
                <p>{t('about.section1Text')}</p>
              </section>

              <section className="about-section">
                <h2>{t('about.section2Title')}</h2>
                <p>{t('about.section2Text')}</p>
              </section>

              <section className="about-section">
                <h2>{t('about.section3Title')}</h2>
                <p>{t('about.section3Text')}</p>
              </section>

              <section className="contact-section">
                <h2>{t('about.contactTitle')}</h2>
                <div className="contact-info">
                  <FaEnvelope className="contact-icon" />
                  <a href="mailto:support@sentimentinsideout.com">
                  support@sentimentinsideout.com
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}; 