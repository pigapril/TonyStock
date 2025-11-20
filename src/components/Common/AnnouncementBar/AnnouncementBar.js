import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './AnnouncementBar.css';
import enhancedApiClient from '../../../utils/enhancedApiClient';
import AnnouncementModal from './AnnouncementModal';
import AnnouncementDevTools from './AnnouncementDevTools';
import announcementCooldownManager from '../../../utils/announcementCooldown';

const AnnouncementBar = () => {
  const { i18n } = useTranslation();
  const [config, setConfig] = useState(null);
  const [showBar, setShowBar] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const timeoutRef = useRef(null);

  /**
   * Get the appropriate message based on current language
   * Uses useMemo to recalculate when language or config changes
   */
  const getLocalizedMessage = React.useMemo(() => {
    if (!config) return '';
    
    const currentLang = i18n.language || 'zh-TW';
    const isEnglish = currentLang.startsWith('en');
    
    let selectedMessage = '';
    
    // Priority: language-specific message > fallback to other language > legacy message field
    if (isEnglish) {
      selectedMessage = config.message_en || config.message_zh || config.message || '';
    } else {
      selectedMessage = config.message_zh || config.message || config.message_en || '';
    }
    
    // 開發模式下顯示語言選擇資訊
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 語言選擇:', {
        currentLang,
        isEnglish,
        available: {
          message_zh: config.message_zh ? '✓' : '✗',
          message_en: config.message_en ? '✓' : '✗',
          message: config.message ? '✓' : '✗'
        },
        selected: selectedMessage.substring(0, 50) + '...'
      });
    }
    
    return selectedMessage;
  }, [config, i18n.language]);

  // 載入公告配置
  const loadAnnouncementConfig = async () => {
    try {
      const response = await enhancedApiClient.get('/api/public/announcement');
      const result = response.data;

      if (result.success && result.data) {
        setConfig(result.data);
        
        // 使用冷卻期管理器檢查是否應該顯示公告
        const shouldShow = announcementCooldownManager.shouldShowAnnouncement(result.data);
        setShowBar(shouldShow);
        
        // 開發模式下顯示調試資訊
        if (process.env.NODE_ENV === 'development') {
          const stats = announcementCooldownManager.getAnnouncementStats(result.data);
          console.log('📢 公告配置已載入:', {
            shouldShow,
            enabled: result.data.enabled,
            hasMessage_zh: !!result.data.message_zh,
            hasMessage_en: !!result.data.message_en,
            hasLegacyMessage: !!result.data.message,
            currentLanguage: i18n.language,
            stats
          });
        }
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
    // 清理過期的冷卻期資料
    announcementCooldownManager.cleanupExpiredData();
    
    loadAnnouncementConfig();
  }, []);

  // 定期檢查配置更新（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnnouncementConfig();
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, []);

  // 開發模式下記錄語言變化
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && config) {
      console.log('🌐 語言已切換:', {
        currentLanguage: i18n.language,
        displayingMessage: getLocalizedMessage.substring(0, 50) + '...'
      });
    }
  }, [i18n.language, config, getLocalizedMessage]);

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
    // 記錄公告關閉到冷卻期管理器
    if (config) {
      announcementCooldownManager.dismissAnnouncement(config);
    }

    setIsAnimating(true);

    // 清除自動隱藏計時器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 延遲隱藏以顯示動畫效果
    setTimeout(() => {
      setShowBar(false);
      setIsAnimating(false);
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

  // 檢測是否為長內容（需要對話框功能）
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
    if (isMobileDevice() && isLongContent(getLocalizedMessage)) {
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
      displayMessage = message.substring(0, 23) + '⋯⋯';
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

  // 如果正在載入、沒有配置或不應該顯示，則不渲染
  if (loading || !config || !showBar) {
    return null;
  }

  // 檢測是否包含 URL
  const hasUrlsInMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
  };

  // 檢查是否需要對話框功能
  const needsModalFeature = isMobileDevice() && isLongContent(getLocalizedMessage);

  // 計算 CSS 類名
  const messageClasses = [
    'announcement-message',
    hasEmoji(getLocalizedMessage) ? 'announcement-has-emoji' : '',
    isShortContent(getLocalizedMessage) ? 'announcement-short-content' : '',
    hasUrlsInMessage(getLocalizedMessage) ? 'announcement-has-links' : '',
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
            {renderAnnouncementContent(getLocalizedMessage, needsModalFeature)}
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
        message={getLocalizedMessage}
      />

      {/* 開發者工具 */}
      <AnnouncementDevTools config={config} />
    </>
  );
};

export default AnnouncementBar;