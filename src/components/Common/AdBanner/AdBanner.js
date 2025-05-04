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

  const handleCollapse = () => {
    setIsCollapsed(true);
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

  const adContentRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    // 在組件掛載時初始化廣告
    const timer = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error("AdSense initialization error:", error);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []); // 空依賴陣列表示只在掛載時執行一次

  useEffect(() => {
    if (!isCollapsed) {
      const timer = setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.error("AdSense push error on state change:", error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed, isMobile, isTablet]);

  useEffect(() => {
    if (!isCollapsed) {
      const timer = setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.error("AdSense push error on state/route change:", error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed, isMobile, isTablet, location.pathname]);

  return (
    <div className="ad-banner-container">
      <div
        className={`ad-banner ${isCollapsed ? 'ad-banner--collapsed' : ''}`}
        ref={bannerRef}
        onClick={isCollapsed ? handleExpand : undefined}
      >
        <div className="ad-content" ref={adContentRef}>
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