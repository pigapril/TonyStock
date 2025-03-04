import React, { useState, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import './AdBanner.css';
import { useMediaQuery } from 'react-responsive';

export const AdBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const isMobile = useMediaQuery({ maxWidth: 720 });
  const isTablet = useMediaQuery({ minWidth: 721, maxWidth: 969 });
  const handleClose = () => {
    setIsVisible(false);
  };
  const adContentRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      // 確保廣告在組件掛載後再推送到 AdSense
      const timer = setTimeout(() => {
        try {
          // 推送廣告，根據裝置類型推送不同尺寸的廣告
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.error("AdSense push error:", error);
        }
      }, 100); // 延遲一小段時間，確保組件已渲染
      return () => clearTimeout(timer);
    }
  }, [isVisible, isMobile, isTablet]);

  if (!isVisible) return null;

  return (
    <div className="ad-banner">
      <div className="ad-content" ref={adContentRef}>
        {/* 廣告預留位置，AdSense 會在此處載入廣告 */}
        {isMobile ? (
          <ins className="adsbygoogle"
               style={{ display: "inline-block", width: "300px", height: "100px" }}
               data-ad-client="ca-pub-9124378768777425"
               data-ad-slot="2305447757"></ins>
        ) : isTablet ? (
          <ins className="adsbygoogle"
               style={{ display: "inline-block", width: "728px", height: "90px" }}
               data-ad-client="ca-pub-9124378768777425"
               data-ad-slot="6690581177"></ins>
        ) : (
          <ins className="adsbygoogle"
               style={{ display: "inline-block", width: "970px", height: "90px" }}
               data-ad-client="ca-pub-9124378768777425"
               data-ad-slot="3736248809"></ins>
        )}
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