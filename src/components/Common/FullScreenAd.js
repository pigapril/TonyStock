import React, { useEffect, useRef } from 'react';
import './FullScreenAd.css'; // 引入對應的 CSS 檔案

// 接收 showAd 和 onClose 作為 props
export const FullScreenAd = ({ showAd, onClose }) => {
  const adRef = useRef(null);
  const pushTimeoutRef = useRef(null); // 用於存儲 setTimeout 的 ID

  useEffect(() => {
    // 清除上一次可能存在的 timeout
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
    }

    // 只有在 showAd 為 true 且 adRef.current 存在時才嘗試加載廣告
    if (showAd && adRef.current) {
      // 稍微延遲 push 操作，給 DOM 一點時間渲染
      pushTimeoutRef.current = setTimeout(() => {
        try {
          // 確保 adsbygoogle 陣列存在
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          console.log('AdSense push called for FullScreenAd after delay');
        } catch (error) {
          console.error("AdSense push error in FullScreenAd:", error);
        }
      }, 500); // 延遲 100 毫秒，可以根據需要調整

    }

    // 組件卸載或 showAd 變為 false 時清除 timeout
    return () => {
      if (pushTimeoutRef.current) {
        clearTimeout(pushTimeoutRef.current);
      }
    };

  }, [showAd]); // 當 showAd 狀態改變時觸發

  // 如果 showAd 為 false，則不渲染任何內容
  if (!showAd) {
    return null;
  }

  // 渲染廣告容器、AdSense 廣告單元和關閉按鈕
  return (
    <div className="fullscreen-ad-overlay">
      <div className="fullscreen-ad-container" ref={adRef}>
        {/* FullScreenAd */}
        <ins className="adsbygoogle"
             style={{ display: 'block' }} // AdSense 要求 display: block
             data-ad-client="ca-pub-9124378768777425"
             data-ad-slot="1108573669" // 您的全螢幕廣告單元 ID
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
      {/* 在這裡渲染關閉按鈕，並綁定 onClose 事件 */}
      <button
        onClick={onClose} // 使用傳入的 onClose 函數
        className="fullscreen-ad-manual-close-button" // 使用 CSS class 來設定樣式
        aria-label="關閉廣告"
        title="關閉廣告" // 添加 title 提示
      >
        &times; {/* 使用 HTML 實體顯示 'x' */}
      </button>
    </div>
  );
};

// 注意：請確保 AdSense 的主要腳本已在您的 HTML 文件 (<head> 部分) 中加載：
// <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9124378768777425" crossorigin="anonymous"></script> 