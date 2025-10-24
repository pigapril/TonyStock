import React, { useState, useEffect, useRef } from 'react';
import './AnnouncementBar.css';
import enhancedApiClient from '../../../utils/enhancedApiClient';

const AnnouncementBar = () => {
  const [config, setConfig] = useState(null);
  const [showBar, setShowBar] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  // 載入公告配置
  const loadAnnouncementConfig = async () => {
    try {
      const response = await enhancedApiClient.get('/api/public/announcement');
      const result = response.data;
      
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

  // 處理公告內容，將 URL 轉換為連結
  const renderAnnouncementContent = (message) => {
    if (!message) return null;
    
    console.log('AnnouncementBar: 處理訊息:', message);
    console.log('AnnouncementBar: 訊息長度:', message.length);
    console.log('AnnouncementBar: 訊息字符碼:', [...message].map(c => c.charCodeAt(0)));
    
    // 簡單的 URL 檢測正則表達式
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    
    // 嘗試更寬鬆的檢測
    const simpleCheck = message.includes('https://') || message.includes('http://');
    console.log('AnnouncementBar: 簡單檢測結果:', simpleCheck);
    
    // 檢查是否包含 URL
    const hasUrl = urlRegex.test(message);
    console.log('AnnouncementBar: URL 檢測結果:', hasUrl);
    
    if (hasUrl) {
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

  // 如果正在載入、沒有配置或不應該顯示，則不渲染
  if (loading || !config || !showBar) {
    return null;
  }

  // 檢測是否包含 URL
  const hasUrlsInMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
  };

  // 計算 CSS 類名
  const messageClasses = [
    'announcement-message',
    hasEmoji(config.message) ? 'has-emoji' : '',
    isShortContent(config.message) ? 'short-content' : '',
    hasUrlsInMessage(config.message) ? 'has-links' : ''
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
        <p className={messageClasses}>
          {renderAnnouncementContent(config.message)}
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

export default AnnouncementBar;