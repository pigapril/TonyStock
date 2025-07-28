import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import './AdBanner.css';
import { useMediaQuery } from 'react-responsive';

export const AdBanner = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 720 });
  const isTablet = useMediaQuery({ minWidth: 721, maxWidth: 969 });
  const collapseTimer = useRef(null);
  const location = useLocation();
  const bannerRef = useRef(null);
  
  // 🔧 新增：追蹤廣告初始化狀態
  const adInitialized = useRef(false);
  const adElementRef = useRef(null);

  const handleCollapse = () => {
    setIsCollapsed(true);
    if (bannerRef.current) {
      bannerRef.current.classList.add('ad-banner--collapsed');
      collapseTimer.current = setTimeout(() => {
        if (bannerRef.current) {
          bannerRef.current.classList.remove('ad-banner--collapsed');
          setIsCollapsed(false);
        }
      }, 600000); // 10 minutes
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

  // 🔧 修復：防止重複初始化廣告
  useEffect(() => {
    // 只有在未折疊、未初始化、且廣告元素存在時才執行
    if (!isCollapsed && !adInitialized.current && adElementRef.current) {
      const timer = setTimeout(() => {
        try {
          const adElement = adElementRef.current;
          // 檢查廣告元素是否已經被 AdSense 處理過
          if (adElement && !adElement.dataset.adsbygoogleStatus) {
            console.log('AdBanner: Initializing ads');
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            adInitialized.current = true; // 標記為已初始化
          } else {
            console.log('AdBanner: Ad already initialized, skipping');
          }
        } catch (error) {
          console.error("AdSense push error:", error);
        }
      }, 100); // 增加延遲確保 DOM 準備好
      
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]); // 🔧 移除會頻繁變化的依賴

  // 🔧 路由變化時重置廣告狀態
  useEffect(() => {
    console.log('Route changed, resetting ad state');
    adInitialized.current = false;
  }, [location.pathname]);

  // 🔧 組件卸載時清理
  useEffect(() => {
    return () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
      adInitialized.current = false;
    };
  }, []);

  return (
    <div className="ad-banner-container">
      <div 
        ref={bannerRef} 
        className={`ad-banner ${isCollapsed ? 'ad-banner--collapsed' : ''}`}
      >
        {!isCollapsed && (
          <button 
            className="ad-close-button" 
            onClick={handleCollapse}
            aria-label="收合廣告"
          >
            <FaChevronDown />
          </button>
        )}
        
        {isCollapsed && (
          <button 
            className="ad-close-button" 
            onClick={handleExpand}
            aria-label="展開廣告"
          >
            <FaChevronUp />
          </button>
        )}

        <div className="ad-banner__content ad-content">
          {/* 🔧 保留你原本的響應式廣告邏輯，但加上 ref */}
          {isMobile ? (
            <ins 
              ref={adElementRef}
              className="adsbygoogle"
              style={{ display: "inline-block", width: "300px", height: "100px" }}
              data-ad-client="ca-pub-9124378768777425"
              data-ad-slot="2305447757"
            />
          ) : isTablet ? (
            <ins 
              ref={adElementRef}
              className="adsbygoogle"
              style={{ display: "inline-block", width: "728px", height: "90px" }}
              data-ad-client="ca-pub-9124378768777425"
              data-ad-slot="6690581177"
            />
          ) : (
            <ins 
              ref={adElementRef}
              className="adsbygoogle"
              style={{ display: "inline-block", width: "970px", height: "90px" }}
              data-ad-client="ca-pub-9124378768777425"
              data-ad-slot="3736248809"
            />
          )}
        </div>
      </div>
    </div>
  );
};
