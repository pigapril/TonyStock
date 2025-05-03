import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import './Footer.css';

export const Footer = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const currentYear = new Date().getFullYear();

  const EmailLink = () => (
    <a href="mailto:support@sentimentinsideout.com">support@sentimentinsideout.com</a>
  );

  const langPrefix = lang ? `/${lang}` : '';

  return (
    <footer className="site-footer">
      <div className="footer-content">
        {/* 頁尾導航區域 */}
        <div className="footer-navigation">
          <div className="footer-section">
            <h3>{t('footer.analysisTools')}</h3>
            <ul>
              <li><Link to={`${langPrefix}/priceanalysis`}>{t('footer.priceAnalysis')}</Link></li>
              <li><Link to={`${langPrefix}/market-sentiment`}>{t('footer.marketSentiment')}</Link></li>
              {/*
              <li><Link to={`${langPrefix}/googletrends`}>{t('footer.googleTrendsSymbol')}</Link></li>
              <li><Link to={`${langPrefix}/googletrendsmarket`}>{t('footer.googleTrendsMarket')}</Link></li>
              */}
              <li><Link to={`${langPrefix}/watchlist`}>{t('footer.watchlist')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>{t('footer.otherResources')}</h3>
            <ul>
              <li><Link to={`${langPrefix}/articles`}>{t('footer.articles')}</Link></li>
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
              <li><Link to={`${langPrefix}/about`}>{t('footer.aboutSite')}</Link></li>
              <li><Link to={`${langPrefix}/legal`}>{t('footer.legal')}</Link></li>
              <li><Link to={`${langPrefix}/sponsor-us`}>{t('footer.sponsor')}</Link></li>
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
              <Trans i18nKey="footer.disclaimer2">
                歡迎分享本網站提供之資訊連結，如需轉載內容務必經由本網站同意。聯絡信箱：<EmailLink />
              </Trans>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}; 