import React, { useState, useEffect } from 'react';
import AnnouncementBarPreview from '../../../Common/AnnouncementBar/AnnouncementBarPreview';
import './AnnouncementPreview.css';

const AnnouncementPreview = ({ config, previewData }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);

  // 當有預覽數據時更新預覽配置
  useEffect(() => {
    if (previewData?.preview) {
      setPreviewConfig(previewData.preview);
      setShowPreview(true);
    }
  }, [previewData]);

  // 當配置變更時更新預覽
  useEffect(() => {
    if (config?.announcement && !previewData) {
      setPreviewConfig(config.announcement);
      setShowPreview(config.announcement.enabled);
    }
  }, [config, previewData]);

  const handleClosePreview = () => {
    setShowPreview(false);
    // 延遲重新顯示以模擬真實的關閉效果
    setTimeout(() => {
      if (previewConfig?.enabled) {
        setShowPreview(true);
      }
    }, 1000);
  };

  const resetPreview = () => {
    setShowPreview(false);
    setTimeout(() => {
      if (previewConfig?.enabled) {
        setShowPreview(true);
      }
    }, 100);
  };

  return (
    <div className="announcement-preview-container">
      <div className="announcement-preview-header">
        <h2>即時預覽</h2>
        <div className="announcement-preview-controls">
          <button
            onClick={resetPreview}
            className="announcement-preview-control-btn"
            title="重新載入預覽"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="announcement-preview-main-container">
        <div className="announcement-preview-frame">
          <div className="announcement-preview-mock-website">
            {/* 模擬網站標題欄 */}
            <div className="announcement-preview-mock-header">
              <div className="announcement-preview-mock-logo">SentimentInsideOut</div>
              <div className="announcement-preview-mock-nav">
                <span>首頁</span>
                <span>分析</span>
                <span>訂閱</span>
              </div>
            </div>

            {/* 公告欄預覽區域 */}
            <div className="announcement-preview-area">
              {previewConfig && showPreview ? (
                <AnnouncementBarPreview
                  message={previewConfig.message}
                  isVisible={true}
                  onClose={handleClosePreview}
                  autoHide={previewConfig.autoHide}
                  autoHideDelay={previewConfig.autoHideDelay}
                />
              ) : (
                <div className="announcement-preview-no-announcement">
                  {previewConfig?.enabled ? (
                    <p>公告已關閉 (點擊重新載入按鈕查看)</p>
                  ) : (
                    <p>公告已停用</p>
                  )}
                </div>
              )}
            </div>

            {/* 模擬網站內容 */}
            <div className="announcement-preview-mock-content">
              <div className="announcement-preview-mock-section">
                <h3>股市情緒分析</h3>
                <p>這裡是網站的主要內容區域...</p>
              </div>
            </div>
          </div>
        </div>

        {/* 預覽資訊 */}
        {previewConfig && (
          <div className="announcement-preview-info">
            <h4>預覽資訊</h4>
            <div className="announcement-preview-info-list">
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">狀態:</span>
                <span className={`info-value status ${previewConfig.enabled ? 'enabled' : 'disabled'}`}>
                  {previewConfig.enabled ? '已啟用' : '已停用'}
                </span>
              </div>
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">訊息長度:</span>
                <span className="announcement-preview-info-value">{previewConfig.message?.length || 0} 字元</span>
              </div>
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">自動隱藏:</span>
                <span className="announcement-preview-info-value">
                  {previewConfig.autoHide ? `${previewConfig.autoHideDelay / 1000}秒後` : '關閉'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 驗證結果 */}
        {previewData?.validation && (
          <div className="announcement-preview-validation-info">
            <h4>驗證結果</h4>
            <div className="announcement-preview-validation-status">
              <span className={`status-indicator ${previewData.validation.isValid ? 'valid' : 'invalid'}`}>
                {previewData.validation.isValid ? '✅' : '❌'}
              </span>
              <span>
                {previewData.validation.isValid ? '配置有效' : '配置無效'}
              </span>
            </div>
            <div className="announcement-preview-validation-details">
              <span>字元數: {previewData.validation.messageLength}/{previewData.validation.maxLength}</span>
            </div>
          </div>
        )}
      </div>

      {/* 預覽說明 */}
      <div className="announcement-preview-notes">
        <h4>預覽說明</h4>
        <ul>
          <li>預覽會即時反映您的設定變更</li>
          <li>自動隱藏功能在預覽中正常運作</li>
          <li>點擊 🔄 按鈕可以重新載入預覽</li>
          <li>實際效果可能因瀏覽器而略有差異</li>
        </ul>
      </div>
    </div>
  );
};

export default AnnouncementPreview;