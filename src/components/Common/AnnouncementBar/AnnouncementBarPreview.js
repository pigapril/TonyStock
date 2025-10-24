import React, { useState, useEffect, useRef } from 'react';
import './AnnouncementBar.css';
import AnnouncementModal from './AnnouncementModal';

/**
 * 公告欄預覽組件
 * 用於管理介面的預覽功能，接收 props 而不是從 API 獲取
 */
const AnnouncementBarPreview = ({ message, isVisible, onClose, autoHide = false, autoHideDelay = 8000 }) => {
  const [showBar, setShowBar] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showModal, setShowModal] = useState(false);
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

  // 檢測是否為長內容（需要展開功能）
  const isLongContent = (text) => {
    return text && text.length > 80; // 80 個字符以上視為長內容
  };

  // 檢測是否為移動設備
  const isMobileDevice = () => {
    return window.innerWidth <= 768;
  };

  // 處理點擊公告內容
  const handleContentClick = (e) => {
    e.stopPropagation(); // 防止事件冒泡
    
    // 只在移動設備且內容較長時顯示對話框
    if (isMobileDevice() && isLongContent(message)) {
      setShowModal(true);
      
      // 暫停自動隱藏
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  // 關閉對話框
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // 處理公告內容，將 URL 轉換為連結
  const renderAnnouncementContent = (message, shouldTruncate = false) => {
    if (!message) return null;
    
    // 在移動設備上，如果內容過長，則截斷顯示
    let displayMessage = message;
    if (shouldTruncate && isMobileDevice() && isLongContent(message)) {
      displayMessage = message.substring(0, 60) + '⋯⋯';
    }
    
    // 簡單的 URL 檢測正則表達式
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    
    // 檢查是否包含 URL
    if (urlRegex.test(displayMessage)) {
      // 重置正則表達式
      urlRegex.lastIndex = 0;
      
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = urlRegex.exec(displayMessage)) !== null) {
        const url = match[0];
        const startIndex = match.index;
        
        // 添加 URL 前的文字
        if (startIndex > lastIndex) {
          parts.push(displayMessage.slice(lastIndex, startIndex));
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
            onClick={(e) => e.stopPropagation()} // 防止觸發對話框
          >
            {url.length > 40 ? url.substring(0, 37) + '⋯' : url}
          </a>
        );
        
        lastIndex = urlRegex.lastIndex;
      }
      
      // 添加最後一部分文字
      if (lastIndex < displayMessage.length) {
        parts.push(displayMessage.slice(lastIndex));
      }
      
      return parts;
    }
    
    // 如果沒有 URL，直接返回文字
    return displayMessage;
  };

  // 檢測是否包含 URL
  const hasUrlsInMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
  };

  if (!showBar) return null;

  // 檢查是否需要對話框功能
  const needsModalFeature = isMobileDevice() && isLongContent(message);

  // 計算 CSS 類名
  const messageClasses = [
    'announcement-message',
    hasUrlsInMessage(message) ? 'announcement-has-links' : '',
    needsModalFeature ? 'announcement-expandable' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <div 
        className={`announcement-bar ${isAnimating ? 'closing' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="banner"
        aria-live="polite"
      >
        <div className="announcement-content">
          <div 
            className={messageClasses}
            onClick={handleContentClick}
            style={{ cursor: needsModalFeature ? 'pointer' : 'default' }}
          >
            {renderAnnouncementContent(message, needsModalFeature)}
          </div>
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

      {/* 公告對話框 */}
      <AnnouncementModal
        isOpen={showModal}
        onClose={handleCloseModal}
        message={message}
      />
    </>
  );
};

export default AnnouncementBarPreview;