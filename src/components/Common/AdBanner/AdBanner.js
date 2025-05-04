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

  const adKey = `${location.pathname}-${isMobile}-${isTablet}-${isCollapsed}`;

  useEffect(() => {
    // Only attempt to push ads if the banner is not collapsed
    if (!isCollapsed) {
      // Use a short timeout to let React finish DOM updates after key change
      const timer = setTimeout(() => {
        try {
          console.log(`AdBanner: Attempting to push ad for key: ${adKey}`);
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          // Log errors, the "already have ads" error should be less frequent now
          console.error("AdSense push error:", error);
        }
      }, 50); // 50ms delay might be sufficient
      return () => clearTimeout(timer);
    }
    // This effect runs when the adKey changes
  }, [adKey]);

  return (
    <div className="ad-banner-container">
      <div
        className={`ad-banner ${isCollapsed ? 'ad-banner--collapsed' : ''}`}
        ref={bannerRef}
        onClick={isCollapsed ? handleExpand : undefined}
      >
        <div key={adKey} className="ad-content">
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