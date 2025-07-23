import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Import useTranslation
import './InterstitialAdModal.css'; // 我們需要創建這個 CSS 檔案

export function InterstitialAdModal({ onClose }) {
  const { t } = useTranslation(); // 2. Initialize t function
  const [isCloseButtonVisible, setIsCloseButtonVisible] = useState(false); // 狀態：控制按鈕可見性
  const adInsRef = useRef(null); // Ref：獲取 <ins> 元素的引用
  const observerRef = useRef(null); // Ref：保存 MutationObserver 實例以便清理
  const timeoutRef = useRef(null); // Ref：保存 fallback 計時器 ID 以便清理

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

  // Effect 2: 監測廣告載入並顯示關閉按鈕
  useEffect(() => {
    const adInsElement = adInsRef.current;
    if (!adInsElement) return; // 如果 ref 不存在則退出

    const showButton = () => {
      setIsCloseButtonVisible(true);
      // 按鈕顯示後，清理 observer 和 timeout
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.log('Close button visible.');
    };

    // --- Fallback 計時器 ---
    // 如果 1 秒內廣告仍未被檢測到載入，也強制顯示關閉按鈕，防止用戶卡住
    timeoutRef.current = setTimeout(() => {
      console.warn('Ad load detection timeout. Forcing close button visibility.');
      showButton();
    }, 1500); // 1.5 秒後觸發

    // --- Mutation Observer ---
    // 觀察 <ins> 元素的子節點變化 (即 AdSense 注入 iframe 或內容時)
    const observer = new MutationObserver((mutationsList) => {
      for(let mutation of mutationsList) {
        // 檢查是否有節點被添加，或者 <ins> 元素是否不再為空
        if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || adInsElement.hasChildNodes())) {
          console.log('Ad content detected by MutationObserver.');
          showButton();
          return; // 找到變化，停止觀察並顯示按鈕
        }
      }
      // 某些情況下，AdSense 可能只改變屬性而不添加子節點 (雖然較少見)
      // 也可以檢查 data-ad-status 屬性是否變為 'filled'
      if (adInsElement.getAttribute('data-ad-status') === 'filled') {
         console.log('Ad content detected by data-ad-status attribute.');
         showButton();
         return;
      }
    });

    // 開始觀察目標節點的子節點列表和屬性變化
    observer.observe(adInsElement, {
      childList: true, // 觀察子節點的添加或移除
      attributes: true, // 觀察屬性變化 (例如 data-ad-status)
      attributeFilter: ['data-ad-status'] // 只關心 data-ad-status 屬性
     });
    observerRef.current = observer; // 保存 observer 實例

    // --- 清理函數 ---
    // 在元件卸載時停止觀察並清除計時器
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.log('Ad observer and timeout cleaned up.');
    };
  }, []); // 空依賴數組，僅在掛載時執行一次

  // 刪除 handleOverlayClick 函數

  return (
    <div className="interstitial-ad-modal-overlay"> {/* 移除 onClick */}
      <button
        className={`interstitial-ad-modal-close ${isCloseButtonVisible ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!isCloseButtonVisible} // 輔助技術：按鈕不可見時隱藏
      >
        {/* 3. Replace button text with t() */}
        {t('interstitialAd.closeButton')}
      </button>
      <div className="interstitial-ad-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* AdSense 廣告代碼 */}
        <ins
             ref={adInsRef}
             className="adsbygoogle"
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