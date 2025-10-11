import React, { useEffect, useRef } from 'react';

function AdSense({ client, slot, layout, format }) {
  const adRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 避免重複初始化同一個廣告位
    if (isInitialized.current || !adRef.current) {
      return;
    }

    try {
      // 檢查廣告位是否已經有廣告
      const existingAd = adRef.current.querySelector('.adsbygoogle');
      if (existingAd && existingAd.getAttribute('data-adsbygoogle-status')) {
        console.log('AdSense: Ad already initialized, skipping');
        return;
      }

      // 初始化廣告
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      isInitialized.current = true;
      console.log('AdSense: Ad initialized successfully');
    } catch (error) {
      console.error("AdSense initialization error:", error);
      // 重置初始化狀態，允許重試
      isInitialized.current = false;
    }
  }, [client, slot, layout, format]);

  // 組件卸載時重置狀態
  useEffect(() => {
    return () => {
      isInitialized.current = false;
    };
  }, []);

  return (
    <div ref={adRef}>
      <ins className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout={layout}
        data-ad-format={format}
        data-ad-client={client}
        data-ad-slot={slot}></ins>
    </div>
  );
}

export default AdSense; 