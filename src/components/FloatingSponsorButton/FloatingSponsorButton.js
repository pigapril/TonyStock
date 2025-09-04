import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import './FloatingSponsorButton.css'; // 確保導入 CSS 樣式
import sponsorIcon from '../../assets/images/sponsor-us/sponsor_icon.gif'; // 將副檔名改為 .gif

const FloatingSponsorButton = () => {
  const { i18n } = useTranslation();
  const { lang } = useParams();
  const currentLanguage = i18n.language;

  if (currentLanguage !== 'zh-TW') {
    return null;
  }

  return (
    <a href={`/${lang}/sponsor-us`} className="floating-sponsor-button">
      <img src={sponsorIcon} alt="贊助我們" />
    </a>
  );
};

export default FloatingSponsorButton; 