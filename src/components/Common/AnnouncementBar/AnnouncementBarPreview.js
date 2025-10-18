import React, { useState, useEffect, useRef } from 'react';
import './AnnouncementBar.css';

/**
 * 公告欄預覽組件
 * 用於管理介面的預覽功能，接收 props 而不是從 API 獲取
 */
const AnnouncementBarPreview = ({ message, isVisible, onClose, autoHide = false, autoHideDelay = 8000 }) => {
  const [showBar, setShowBar] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      setShowBar(true);
      
      // 自動隱藏功能
      if (autoHide) {
        timeoutRef.current = setTimeout(() => {
          handleClose();
        }, autoHideDelay);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, autoHide, autoHideDelay]);

  const handleClose = () => {
    setIsAnimating(true);
    
    // 清除自動隱藏計時器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 延遲隱藏以顯示動畫效果
    setTimeout(() => {
      setShowBar(false);
      setIsAnimating(false);
      if (onClose) onClose();
    }, 300);
  };

  // 滑鼠懸停時暫停自動隱藏
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // 滑鼠離開時重新開始自動隱藏
  const handleMouseLeave = () => {
    if (autoHide && !isAnimating) {
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, autoHideDelay);
    }
  };

  if (!showBar) return null;

  return (
    <div 
      className={`announcement-bar ${isAnimating ? 'closing' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="banner"
      aria-live="polite"
    >
      <div className="announcement-content">
        <p className="announcement-message">{message}</p>
      </div>
      <button 
        className="announcement-close" 
        onClick={handleClose}
        aria-label="關閉公告"
        title="關閉公告"
      >
        ×
      </button>
    </div>
  );
};

export default AnnouncementBarPreview;