// AdSense.js
import React, { useEffect, useRef, useCallback } from 'react';

function AdSense({ client, slot, format, layout, style, responsive }) {
  const adRef = useRef(null);
  const observerRef = useRef(null); // 用於存儲 ResizeObserver 實例
  const adPushedRef = useRef(false); // 確保廣告只被 push 一次

  const attemptLoadAd = useCallback(() => {
    if (adRef.current && adRef.current.offsetWidth > 0 && !adPushedRef.current) {
      // console.log(`AdSense [${slot}]: Container has width ${adRef.current.offsetWidth}. Pushing ad.`);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adPushedRef.current = true; // 標記為已推送
        
        // 一旦成功推送，斷開 observer
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      } catch (error) {
        console.error(`AdSense.js [${slot}]: adsbygoogle.push() error:`, error);
      }
    }
    // 可選：如果寬度仍然為0，可以添加日誌，但不應在此處重試，ResizeObserver 會處理
    // else if (adRef.current && adRef.current.offsetWidth === 0 && !adPushedRef.current) {
    //   console.log(`AdSense [${slot}]: Container still has 0 width. Waiting for ResizeObserver.`);
    // }
  }, [slot]); // slot 加入依賴項，主要用於日誌或調試

  useEffect(() => {
    adPushedRef.current = false; // 重置推送狀態 (如果組件因 key 改變而重新掛載)
    const adElement = adRef.current;

    if (!adElement) {
      return;
    }

    // 初始檢查：如果元素已有寬度，立即嘗試加載
    if (adElement.offsetWidth > 0) {
      attemptLoadAd();
    } else {
      // 如果初始寬度為0，設置 ResizeObserver
      // console.log(`AdSense [${slot}]: Initial width is 0. Setting up ResizeObserver.`);
      observerRef.current = new ResizeObserver(entries => {
        // 通常我們只觀察一個元素
        const entry = entries[0];
        if (entry.target.offsetWidth > 0 && !adPushedRef.current) {
          // console.log(`AdSense [${slot}]: Width changed to ${entry.target.offsetWidth} by ResizeObserver. Pushing ad.`);
          attemptLoadAd();
        }
      });
      observerRef.current.observe(adElement);
    }

    return () => {
      // 清理工作：組件卸載時斷開 ResizeObserver
      if (observerRef.current) {
        // console.log(`AdSense [${slot}]: Disconnecting ResizeObserver.`);
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [slot, attemptLoadAd]); // attemptLoadAd 現在是 useCallback 的結果，其依賴項變化時此 effect 也會重新運行

  // 預設樣式，可以被傳入的 style prop 覆蓋
  const defaultStyle = { display: 'block', textAlign: 'center' };
  // 對於響應式廣告 (format="auto")，Google 建議父容器有明確的寬度。
  // `width: '100%'` 讓 <ins> 嘗試填滿父容器。
  // 如果 AdSense 計算不出寬度，有時指定一個 min-height 也有幫助。
  const adInsStyle = { ...defaultStyle, width: '100%', ...style };
  if (format === 'auto' && responsive === 'true') { // 'responsive' 來自 AdSense 指導
      adInsStyle['data-full-width-responsive'] = 'true';
  }


  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={adInsStyle}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
      // 如果 slot ID 可能會動態改變，或者列表中的 AdSense 組件順序改變，
      // key={slot} 可以幫助 React 正確處理組件的重新掛載與狀態。
      key={slot} 
    ></ins>
  );
}

export default AdSense;