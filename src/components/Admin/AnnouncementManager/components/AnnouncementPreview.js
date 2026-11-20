import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AnnouncementBarPreview from '../../../Common/AnnouncementBar/AnnouncementBarPreview';
import './AnnouncementPreview.css';

const AnnouncementPreview = ({ config, previewData }) => {
  const { i18n } = useTranslation();
  const isKorean = i18n.language === 'ko-KR';
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);
  const [previewLanguage, setPreviewLanguage] = useState('zh-TW'); // Default to Chinese

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

  // Get message based on preview language
  const getPreviewMessage = () => {
    if (!previewConfig) return '';
    
    if (previewLanguage === 'en') {
      return previewConfig.message_en || previewConfig.message_zh || previewConfig.message || '';
    } else {
      return previewConfig.message_zh || previewConfig.message || previewConfig.message_en || '';
    }
  };

  return (
    <div className="announcement-preview-container">
      <div className="announcement-preview-header">
        <h2>{isKorean ? '실시간 미리보기' : '即時預覽'}</h2>
        <div className="announcement-preview-controls">
          <div className="language-switcher">
            <button
              onClick={() => setPreviewLanguage('zh-TW')}
              className={`lang-btn ${previewLanguage === 'zh-TW' ? 'active' : ''}`}
              title={isKorean ? '중국어 버전 미리보기' : '預覽中文版本'}
            >
              {isKorean ? '🇹🇼 중국어' : '🇹🇼 中文'}
            </button>
            <button
              onClick={() => setPreviewLanguage('en')}
              className={`lang-btn ${previewLanguage === 'en' ? 'active' : ''}`}
              title={isKorean ? '영어 버전 미리보기' : '預覽英文版本'}
            >
              🇺🇸 English
            </button>
          </div>
          <button
            onClick={resetPreview}
            className="announcement-preview-control-btn"
            title={isKorean ? '미리보기 새로고침' : '重新載入預覽'}
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
                <span>{isKorean ? '홈' : '首頁'}</span>
                <span>{isKorean ? '분석' : '分析'}</span>
                <span>{isKorean ? '구독' : '訂閱'}</span>
              </div>
            </div>

            {/* 公告欄預覽區域 */}
            <div className="announcement-preview-area">
              {previewConfig && showPreview ? (
                <AnnouncementBarPreview
                  message={getPreviewMessage()}
                  isVisible={true}
                  onClose={handleClosePreview}
                  autoHide={previewConfig.autoHide}
                  autoHideDelay={previewConfig.autoHideDelay}
                />
              ) : (
                <div className="announcement-preview-no-announcement">
                  {previewConfig?.enabled ? (
                    <p>{isKorean ? '공지가 닫혔습니다 (새로고침 버튼을 눌러 확인하세요)' : '公告已關閉 (點擊重新載入按鈕查看)'}</p>
                  ) : (
                    <p>{isKorean ? '공지가 비활성화되었습니다' : '公告已停用'}</p>
                  )}
                </div>
              )}
            </div>

            {/* 模擬網站內容 */}
            <div className="announcement-preview-mock-content">
              <div className="announcement-preview-mock-section">
                <h3>{isKorean ? '주식 시장 심리 분석' : '股市情緒分析'}</h3>
                <p>{isKorean ? '여기는 웹사이트의 주요 콘텐츠 영역입니다...' : '這裡是網站的主要內容區域...'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 預覽資訊 */}
        {previewConfig && (
          <div className="announcement-preview-info">
            <h4>{isKorean ? '미리보기 정보' : '預覽資訊'}</h4>
            <div className="announcement-preview-info-list">
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">{isKorean ? '상태:' : '狀態:'}</span>
                <span className={`info-value status ${previewConfig.enabled ? 'enabled' : 'disabled'}`}>
                  {previewConfig.enabled ? (isKorean ? '활성화됨' : '已啟用') : (isKorean ? '비활성화됨' : '已停用')}
                </span>
              </div>
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">{isKorean ? '현재 언어:' : '當前語言:'}</span>
                <span className="announcement-preview-info-value">{previewLanguage === 'zh-TW' ? (isKorean ? '번체 중국어' : '繁體中文') : 'English'}</span>
              </div>
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">{isKorean ? '메시지 길이:' : '訊息長度:'}</span>
                <span className="announcement-preview-info-value">{getPreviewMessage()?.length || 0} {isKorean ? '자' : '字元'}</span>
              </div>
              <div className="announcement-preview-info-row">
                <span className="announcement-preview-info-label">{isKorean ? '자동 숨김:' : '自動隱藏:'}</span>
                <span className="announcement-preview-info-value">
                  {previewConfig.autoHide ? (isKorean ? `${previewConfig.autoHideDelay / 1000}초 후` : `${previewConfig.autoHideDelay / 1000}秒後`) : (isKorean ? '닫힘' : '關閉')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 驗證結果 */}
        {previewData?.validation && (
          <div className="announcement-preview-validation-info">
            <h4>{isKorean ? '검증 결과' : '驗證結果'}</h4>
            <div className="announcement-preview-validation-status">
              <span className={`status-indicator ${previewData.validation.isValid ? 'valid' : 'invalid'}`}>
                {previewData.validation.isValid ? '✅' : '❌'}
              </span>
              <span>
                {previewData.validation.isValid ? (isKorean ? '설정이 유효합니다' : '配置有效') : (isKorean ? '설정이 유효하지 않습니다' : '配置無效')}
              </span>
            </div>
            <div className="announcement-preview-validation-details">
              <span>{isKorean ? '글자 수:' : '字元數:'} {previewData.validation.messageLength}/{previewData.validation.maxLength}</span>
            </div>
          </div>
        )}
      </div>

      {/* 預覽說明 */}
      <div className="announcement-preview-notes">
        <h4>{isKorean ? '미리보기 안내' : '預覽說明'}</h4>
        <ul>
          <li>{isKorean ? '미리보기에는 설정 변경 사항이 실시간으로 반영됩니다' : '預覽會即時反映您的設定變更'}</li>
          <li>{isKorean ? '미리보기에서도 자동 숨김 기능이 정상적으로 작동합니다' : '自動隱藏功能在預覽中正常運作'}</li>
          <li>{isKorean ? '🔄 버튼을 누르면 미리보기를 새로고침할 수 있습니다' : '點擊 🔄 按鈕可以重新載入預覽'}</li>
          <li>{isKorean ? '실제 표시 결과는 브라우저에 따라 다소 다를 수 있습니다' : '實際效果可能因瀏覽器而略有差異'}</li>
        </ul>
      </div>
    </div>
  );
};

export default AnnouncementPreview;
