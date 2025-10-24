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

  // 處理公告內容，將 URL 轉換為連結
  const renderAnnouncementContent = (message) => {
    if (!message) return null;
    
    // 簡單的 URL 檢測正則表達式
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    
    // 檢查是否包含 URL
    if (urlRegex.test(message)) {
      // 重置正則表達式
      urlRegex.lastIndex = 0;
      
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = urlRegex.exec(message)) !== null) {
        const url = match[0];
        const startIndex = match.index;
        
        // 添加 URL 前的文字
        if (startIndex > lastIndex) {
          parts.push(message.slice(lastIndex, startIndex));
        }
        
        // 添加連結
        parts.push(
          <a
            key={`link-${startIndex}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="announcement-link"
            title={url}
          >
            {url.length > 40 ? url.substring(0, 37) + '...' : url}
          </a>
        );
        
        lastIndex = urlRegex.lastIndex;
      }
      
      // 添加最後一部分文字
      if (lastIndex < message.length) {
        parts.push(message.slice(lastIndex));
      }
      
      return parts;
    }
    
    // 如果沒有 URL，直接返回文字
    return message;
  };

  // 檢測是否包含 URL
  const hasUrlsInMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
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
        <p className={`announcement-message ${hasUrlsInMessage(message) ? 'has-links' : ''}`}>
          {renderAnnouncementContent(message)}
        </p>
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