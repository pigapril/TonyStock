import React, { useState, useEffect, useRef } from 'react';
import './AnnouncementBar.css';

const AnnouncementBar = () => {
  const [config, setConfig] = useState(null);
  const [showBar, setShowBar] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  // 載入公告配置
  const loadAnnouncementConfig = async () => {
    try {
      const response = await fetch('/api/public/announcement', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setConfig(result.data);
        const shouldShow = result.data.enabled && !!result.data.message;
        setShowBar(shouldShow);
      } else {
        setConfig(null);
        setShowBar(false);
      }
    } catch (err) {
      console.warn('AnnouncementBar: 載入公告配置失敗:', err);
      setConfig(null);
      setShowBar(false);
    } finally {
      setLoading(false);
    }
  };

  // 組件載入時獲取配置
  useEffect(() => {
    loadAnnouncementConfig();
  }, []);

  // 定期檢查配置更新（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnnouncementConfig();
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, []);

  // 自動隱藏功能
  useEffect(() => {
    if (showBar && config?.autoHide) {
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, config.autoHideDelay || 8000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showBar, config]);

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
      // 不需要調用 onClose，因為這是內部狀態管理
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
    if (config?.autoHide && !isAnimating) {
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, config.autoHideDelay || 8000);
    }
  };

  // 檢測訊息是否包含 emoji
  const hasEmoji = (text) => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    return emojiRegex.test(text);
  };

  // 檢測內容長度
  const isShortContent = (text) => {
    return text && text.length <= 50; // 50 個字符以內視為短內容
  };

  // 如果正在載入、沒有配置或不應該顯示，則不渲染
  if (loading || !config || !showBar) {
    return null;
  }

  // 計算 CSS 類名
  const messageClasses = [
    'announcement-message',
    hasEmoji(config.message) ? 'has-emoji' : '',
    isShortContent(config.message) ? 'short-content' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={`announcement-bar ${isAnimating ? 'closing' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="banner"
      aria-live="polite"
    >
      <div className="announcement-content">
        <p className={messageClasses}>{config.message}</p>
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

export default AnnouncementBar;