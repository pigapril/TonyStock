import React from 'react';
import './FloatingSponsorButton.css'; // 確保導入 CSS 樣式
import sponsorIcon from '../../assets/images/sponsor-us/sponsor_icon.gif'; // 將副檔名改為 .gif

const FloatingSponsorButton = () => {
  return (
    <a href="/sponsor-us" className="floating-sponsor-button">
      <img src={sponsorIcon} alt="贊助我們" />
    </a>
  );
};

export default FloatingSponsorButton; 