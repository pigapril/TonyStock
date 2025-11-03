import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import './AdBanner.css';
import { useMediaQuery } from 'react-responsive';
import { useSubscription } from '../../Subscription/SubscriptionContext';

export const AdBanner = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 720 });
  const isTablet = useMediaQuery({ minWidth: 721, maxWidth: 969 });
  const collapseTimer = useRef(null);
  const location = useLocation();
  const bannerRef = useRef(null);
  const adContainerRef = useRef(null);
  const isInitialized = useRef(false);
  const { userPlan } = useSubscription();

  // 檢查是否為 Pro 用戶
  const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';

  const adKey = `${location.pathname}-${isMobile}-${isTablet}-${isCollapsed}`;

  // AdSense 初始化邏輯
  useEffect(() => {
    // 如果是 Pro 用戶，不執行廣告相關邏輯
    if (isProUser || isCollapsed || !adContainerRef.current) {
      return;
    }

    // 檢查是否已經初始化過
    const existingAd = adContainerRef.current.querySelector('.adsbygoogle');
    if (existingAd && existingAd.getAttribute('data-adsbygoogle-status')) {
      console.log('AdBanner: Ad already initialized, skipping');
      return;
    }

    // 避免重複初始化同一個廣告位
    if (isInitialized.current) {
      console.log('AdBanner: Already initialized for this render cycle');
      return;
    }

    // 使用短暫延遲讓 React 完成 DOM 更新
    const timer = setTimeout(() => {
      try {
        console.log(`AdBanner: Initializing ad for key: ${adKey}`);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isInitialized.current = true;
      } catch (error) {
        console.error("AdSense initialization error:", error);
        // 重置初始化狀態，允許重試
        isInitialized.current = false;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [adKey, isProUser, isCollapsed]);

  // 組件卸載或路由變化時重置初始化狀態
  useEffect(() => {
    isInitialized.current = false;
    setIsCollapsed(false); 
  }, [location.pathname]);

  // 清理函數
  useEffect(() => {
    return () => {
      isInitialized.current = false;
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, []);

  // 如果是 Pro 用戶，不顯示廣告
  if (isProUser) {
    return null;
  }

  const handleCollapse = () => {
    setIsCollapsed(true);
    isInitialized.current = false;
    if (bannerRef.current) {
      bannerRef.current.classList.add('ad-banner--collapsed');
      collapseTimer.current = setTimeout(() => {
        if (bannerRef.current) {
          bannerRef.current.classList.remove('ad-banner--collapsed');
          setIsCollapsed(false);
        }
      }, 600000); //10 minutes
    }
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    if (bannerRef.current) {
      bannerRef.current.classList.remove('ad-banner--collapsed');
    }
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };



  return (
    <div className="ad-banner-container">
      <div
        className={`ad-banner ${isCollapsed ? 'ad-banner--collapsed' : ''}`}
        ref={bannerRef}
        onClick={isCollapsed ? handleExpand : undefined}
      >
        <div key={adKey} className="ad-content" ref={adContainerRef}>
          {!isCollapsed && (
            <>
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
            </>
          )}
        </div>
      </div>
      <button className="ad-close-button" onClick={isCollapsed ? handleExpand : handleCollapse}>
        {isCollapsed ? <FaChevronUp /> : <FaChevronDown />}
      </button>
    </div>
  );
};

export const AdConfig = {
  // 廣告相關配置
};

export const useAd = () => {
  // 廣告相關的 hook
}; 