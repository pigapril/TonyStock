import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import './AdBanner.css';

export const AdBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      // 確保廣告在組件掛載後再推送到 AdSense
      const timer = setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.error("AdSense push error:", error);
        }
      }, 100); // 延遲一小段時間，確保組件已渲染
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="ad-banner">
      <div className="ad-content">
        {/* 在這裡放置您的廣告內容 */}
        <ins className="adsbygoogle"
             style={{ display: "block" }}
             data-ad-client="ca-pub-9124378768777425"
             data-ad-slot="6690581177"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
      <button className="ad-close-button" onClick={handleClose}>
        <FaTimes />
      </button>
    </div>
  );
};

// 如果之後需要，可以輕鬆添加相關的組件或工具函數
export const AdConfig = {
  // 廣告相關配置
};

export const useAd = () => {
  // 廣告相關的 hook
}; 