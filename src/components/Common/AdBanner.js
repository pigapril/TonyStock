import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './AdBanner.css';

export const AdBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="ad-banner">
      <div className="ad-content">
        {/* 在這裡放置您的廣告內容 */}
        <div className="ad-placeholder">
          廣告版位
        </div>
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