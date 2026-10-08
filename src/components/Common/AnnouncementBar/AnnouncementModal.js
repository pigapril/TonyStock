import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AnnouncementModal.css';

/**
 * 公告對話框組件
 * 用於在移動設備上顯示完整的公告內容
 */
const AnnouncementModal = ({ isOpen, onClose, message }) => {
  const { t } = useTranslation();
  // 處理 ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 處理背景點擊關閉
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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
            className="announcement-modal-link"
            title={url}
          >
            {url}
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

  if (!isOpen) return null;

  return (
    <div 
      className="announcement-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      <div className="announcement-modal">
        <div className="announcement-modal-header">
          <h3 id="announcement-modal-title" className="announcement-modal-title">
            {t('announcement.title')}
          </h3>
          <button
            className="announcement-modal-close"
            onClick={onClose}
            aria-label={t('announcement.close')}
            title={t('announcement.close')}
          >
            ×
          </button>
        </div>
        
        <div className="announcement-modal-content">
          <p className="announcement-modal-message">
            {renderAnnouncementContent(message)}
          </p>
        </div>
        
        <div className="announcement-modal-footer">
          <button
            className="announcement-modal-btn"
            onClick={onClose}
          >
            {t('announcement.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;