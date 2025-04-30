import React from 'react';
import './SponsorSuccess.css'; // 引入樣式表
import { Helmet } from 'react-helmet-async';
import { FaHeart } from 'react-icons/fa'; // 引入愛心圖示
import { useTranslation } from 'react-i18next'; // Import useTranslation

const SponsorSuccess = () => {
  const { t } = useTranslation(); // Initialize useTranslation

  return (
    <div className="sponsor-success-page">
      <Helmet>
        <title>{t('sponsorSuccess.pageTitle')}</title>
        <meta name="description" content={t('sponsorSuccess.pageDescription')} />
      </Helmet>
      <div className="sponsor-success-container">
        <div className="heart-icon">
          <FaHeart />
        </div>
        <h1>{t('sponsorSuccess.heading')}</h1>
        <p>
          {t('sponsorSuccess.messageLine1')}
          <br />
          {t('sponsorSuccess.messageLine2')}
          <br />
          {t('sponsorSuccess.messageLine3')}
          <br />
          <br />
          {t('sponsorSuccess.messageLine4')}
          <br />
          {t('sponsorSuccess.messageLine5')}
        </p>
        <div className="signature">
          <p>{t('sponsorSuccess.signature')}</p>
        </div>
      </div>
    </div>
  );
};

export { SponsorSuccess };
