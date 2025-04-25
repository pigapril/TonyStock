import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom'; // 引入 ReactDOM
import './FullScreenAd.css'; // 引入對應的 CSS 檔案

// 接收 showAd 和 onClose 作為 props
export const FullScreenAd = ({ showAd, onClose }) => {
  const adRef = useRef(null);
  const animationFrameRef = useRef(null); // 用於存儲 requestAnimationFrame 的 ID
  const portalRoot = document.getElementById('ad-portal-root'); // 獲取 Portal 目標節點

  useEffect(() => {
    // 取消上一次可能存在的 animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 只有在 showAd 為 true 且 adRef.current 存在時才嘗試加載廣告
    if (showAd && adRef.current) {
      // 使用 requestAnimationFrame 確保在下一次瀏覽器繪製前執行
      animationFrameRef.current = requestAnimationFrame(() => {
        // 再嵌套一層，確保佈局計算完成
        animationFrameRef.current = requestAnimationFrame(() => {
          try {
            // 確保 adsbygoogle 陣列存在
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log('AdSense push called for FullScreenAd via requestAnimationFrame');
          } catch (error) {
            console.error("AdSense push error in FullScreenAd:", error);
          }
        });
      });
    }

    // 組件卸載或 showAd 變為 false 時取消 animation frame
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

  }, [showAd]); // 當 showAd 狀態改變時觸發

  // 如果 showAd 為 false 或找不到 portalRoot，則不渲染任何內容
  if (!showAd || !portalRoot) {
    return null;
  }

  // 使用 ReactDOM.createPortal 將內容渲染到 #ad-portal-root
  return ReactDOM.createPortal(
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
    </div>,
    portalRoot // 指定 Portal 的目標 DOM 節點
  );
};

// 注意：請確保 AdSense 的主要腳本已在您的 HTML 文件 (<head> 部分) 中加載：
// <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9124378768777425" crossorigin="anonymous"></script> 