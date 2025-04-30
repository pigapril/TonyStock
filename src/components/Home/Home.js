import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown } from 'react-icons/fa';
import './Home.css';
import { useDialog } from '../../components/Common/Dialog/useDialog';
import { useAuth } from '../../components/Auth/useAuth';
import { Helmet } from 'react-helmet-async';
import PageContainer from '../PageContainer/PageContainer';
import { useTranslation } from 'react-i18next';

export const Home = () => {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const { isAuthenticated } = useAuth();

  // 定義用於結構化數據的 JSON-LD
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Sentiment Inside Out",
    "description": t('home.jsonLd.description'),
    "url": "https://sentimentinsideout.com/"
  };

  // Helper to render text with line breaks
  const renderTextWithLineBreaks = (text) => {
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <PageContainer
      title={t('home.pageTitle')}
      description={t('home.pageDescription')}
      keywords={t('home.keywords')}
      ogImage="/home-og-image.png"
      ogUrl="https://sentimentinsideout.com/"
      jsonLd={homeJsonLd}
    >
      <div className="home-page">
        <div className="home-container">
          {/* 英雄區（Hero Section） */}
          <section className="hero-section">
            <h1>{t('home.hero.title')}</h1>
            <p className="hero-subtitle">
              {renderTextWithLineBreaks(t('home.hero.subtitle'))}
            </p>
            <FaChevronDown
              className="scroll-arrow"
              onClick={() => {
                document.querySelector('#features').scrollIntoView({
                  behavior: 'smooth'
                });
              }}
            />
          </section>

          {/* 特點區段（Feature Sections） */}
          <section className="feature-section feature1" id="features">
            <div className="feature-container">
              <div className="feature-media">
                <img src="/images/home-feature1.png" alt={t('home.feature1.alt')} />
              </div>
              <div className="feature-content">
                <h2>{t('home.feature1.title')}</h2>
                <p>{t('home.feature1.text')}</p>
                <Link to="/priceanalysis" className="feature-link">
                  {t('home.feature.link')} <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="feature-section feature2">
            <div className="feature-container reverse">
              <div className="feature-media">
                <img src="/images/home-feature2.png" alt={t('home.feature2.alt')} />
              </div>
              <div className="feature-content">
                <h2>{t('home.feature2.title')}</h2>
                <p>{t('home.feature2.text')}</p>
                <Link
                  to="/watchlist"
                  className="feature-link"
                  onClick={(e) => {
                    if (!isAuthenticated) {
                      e.preventDefault();
                      openDialog('auth', { returnPath: '/watchlist' });
                    }
                  }}
                >
                  {t('home.feature.link')} <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="feature-section feature3">
            <div className="feature-container">
              <div className="feature-media">
                <img src="/images/home-feature3.png" alt={t('home.feature3.alt')} />
              </div>
              <div className="feature-content">
                <h2>{t('home.feature3.title')}</h2>
                <p>{t('home.feature3.text')}</p>
                <Link to="/market-sentiment" className="feature-link">
                  {t('home.feature.link')} <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 行動呼籲區（CTA Section） - 只在未登入時顯示 */}
          {!isAuthenticated && (
            <section className="cta-section">
              <button className="cta-button" onClick={() => openDialog('auth')}>
                {t('home.cta.button')}
              </button>
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
};