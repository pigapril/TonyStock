import React, { useEffect } from 'react';
import './InterstitialAdModal.css'; // 我們需要創建這個 CSS 檔案

export function InterstitialAdModal({ onClose }) {

  // 使用 useEffect 來確保 AdSense 代碼在元件掛載後執行
  useEffect(() => {
    try {
      // 檢查 adsbygoogle 是否已存在，如果不存在則初始化
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log('AdSense push called.');
    } catch (e) {
      console.error('Error pushing AdSense ad:', e);
    }
  }, []); // 空依賴數組確保只執行一次

  return (
    <div className="interstitial-ad-modal-overlay" onClick={onClose}>
      <button className="interstitial-ad-modal-close" onClick={onClose}>關閉廣告</button>
      <div className="interstitial-ad-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* AdSense 廣告代碼 */}
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-9124378768777425" // 請確認這是你的 Publisher ID
             data-ad-slot="1108573669" // 請確認這是你的廣告單元 Slot ID
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        {/* --- AdSense 廣告代碼結束 --- */}
      </div>
    </div>
  );
} 