import React from 'react';
import './SponsorSuccess.css'; // 引入樣式表
import { Helmet } from 'react-helmet-async';
import { FaHeart } from 'react-icons/fa'; // 引入愛心圖示

const SponsorSuccess = () => {
  return (
    <div className="sponsor-success-page">
      <Helmet>
        <title>捐款贊助成功</title>
        <meta name="description" content="感謝您的款項，您的支持是我們前進的動力！" />
      </Helmet>
      <div className="sponsor-success-container">
        <div className="heart-icon">
          <FaHeart />
        </div>
        <h1>感謝您滿滿的愛心！</h1>
        <p>
          由衷感謝您對 Sentiment Inside Out 的支持！<br></br>
          您的這筆捐助，將協助網站維持營運，也給我更多持續提供服務和內容的動力，<br></br>
          更重要的是讓更多人的投資路能夠順遂。<br></br><br></br>
          我們非常感激您的信任與鼓勵，<br></br>
          也誠摯祝福您投資順利、生活美好！
        </p>
        <div className="signature">
          <p>— Sentiment Inside Out 敬上</p>
        </div>
      </div>
    </div>
  );
};

export { SponsorSuccess };
