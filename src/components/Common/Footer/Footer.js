import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const EmailLink = () => (
    <a href="mailto:support@sentimentinsideout.com">support@sentimentinsideout.com</a>
  );

  return (
    <footer className="site-footer">
      <div className="footer-content">
        {/* 頁尾導航區域 */}
        <div className="footer-navigation">
          <div className="footer-section">
            <h3>{t('footer.analysisTools')}</h3>
            <ul>
              <li><Link to="/priceanalysis">{t('footer.priceAnalysis')}</Link></li>
              <li><Link to="/market-sentiment">{t('footer.marketSentiment')}</Link></li>
              {/*
              <li><Link to="/googletrends">{t('footer.googleTrendsSymbol')}</Link></li>
              <li><Link to="/googletrendsmarket">{t('footer.googleTrendsMarket')}</Link></li>
              */}
              <li><Link to="/watchlist">{t('footer.watchlist')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>{t('footer.otherResources')}</h3>
            <ul>
              <li><Link to="/articles">{t('footer.articles')}</Link></li>
              <li>
                <a href="https://vocus.cc/salon/daily_chart"
                   target="_blank"
                   rel="noopener noreferrer">
                  {t('footer.keyCharts')}
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/profile.php?id=61565751412240"
                   target="_blank"
                   rel="noopener noreferrer">
                  {t('footer.facebook')}
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>{t('footer.aboutUs')}</h3>
            <ul>
              <li><Link to="/about">{t('footer.aboutSite')}</Link></li>
              <li><Link to="/legal">{t('footer.legal')}</Link></li>
              <li><Link to="/sponsor-us">{t('footer.sponsor')}</Link></li>
            </ul>
          </div>
        </div>

        {/* 版權聲明區域 */}
        <div className="footer-bottom">
          <div className="copyright">
            {t('footer.copyright', { year: currentYear })}
          </div>
          <div className="disclaimer">
            <p>
              {t('footer.disclaimer1')}
            </p>
            <p>
              {t('footer.disclaimer2', { emailLink: <EmailLink /> })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}; 