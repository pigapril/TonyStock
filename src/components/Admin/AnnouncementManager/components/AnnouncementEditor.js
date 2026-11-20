import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AnnouncementEditor.css';

const AnnouncementEditor = ({ config, onSave, onPreview, saving }) => {
  const { i18n } = useTranslation();
  const isKorean = i18n.language === 'ko-KR';
  const [formData, setFormData] = useState({
    enabled: false,
    message_zh: '',
    message_en: '',
    message: '', // Deprecated: kept for backward compatibility
    autoHide: true,
    autoHideDelay: 8000
  });

  const [validation, setValidation] = useState({
    messageLength_zh: 0,
    messageLength_en: 0,
    isValid: true,
    errors: []
  });

  // 當配置載入時更新表單數據
  useEffect(() => {
    if (config?.announcement) {
      setFormData({
        enabled: config.announcement.enabled,
        message_zh: config.announcement.message_zh || config.announcement.message || '',
        message_en: config.announcement.message_en || '',
        message: config.announcement.message || config.announcement.message_zh || '', // Fallback for backward compatibility
        autoHide: config.announcement.autoHide,
        autoHideDelay: config.announcement.autoHideDelay
      });
    }
  }, [config]);

  // 驗證表單數據
  useEffect(() => {
    const errors = [];
    const messageLength_zh = formData.message_zh.length;
    const messageLength_en = formData.message_en.length;
    const maxLength = config?.settings?.maxLength || 500;

    if (messageLength_zh > maxLength) {
      errors.push(isKorean ? `중국어 메시지 글자 수 제한 초과 (${messageLength_zh}/${maxLength})` : `中文訊息長度超過限制 (${messageLength_zh}/${maxLength})`);
    }

    if (messageLength_en > maxLength) {
      errors.push(isKorean ? `영어 메시지 글자 수 제한 초과 (${messageLength_en}/${maxLength})` : `英文訊息長度超過限制 (${messageLength_en}/${maxLength})`);
    }

    if (formData.enabled && !formData.message_zh.trim() && !formData.message_en.trim()) {
      errors.push(isKorean ? '공지를 활성화하려면 최소 한 가지 언어의 메시지를 입력해야 합니다' : '啟用公告時必須至少提供一種語言的訊息內容');
    }

    if (formData.autoHideDelay < 1000 || formData.autoHideDelay > 30000) {
      errors.push(isKorean ? '자동 숨김 시간은 1~30초 사이여야 합니다' : '自動隱藏時間必須在 1-30 秒之間');
    }

    setValidation({
      messageLength_zh,
      messageLength_en,
      isValid: errors.length === 0,
      errors
    });
  }, [formData, config, isKorean]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!validation.isValid) {
      return;
    }

    const saveData = {
      announcement: {
        ...formData,
        // Update legacy message field with Chinese version for backward compatibility
        message: formData.message_zh || formData.message_en
      },
      settings: config?.settings || {}
    };

    onSave(saveData);
  };

  const handlePreview = () => {
    onPreview(formData);
  };

  const maxLength = config?.settings?.maxLength || 500;

  return (
    <div className="announcement-editor">
      <h2>{isKorean ? '공지 수정' : '編輯公告'}</h2>

      {/* 啟用開關 */}
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => handleInputChange('enabled', e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">
            {formData.enabled ? (isKorean ? '공지가 활성화되었습니다' : '公告已啟用') : (isKorean ? '공지가 비활성화되었습니다' : '公告已停用')}
          </span>
        </label>
      </div>

      {/* 中文訊息輸入 */}
      <div className="form-group">
        <label htmlFor="message_zh">
          {isKorean ? '공지 메시지 (중국어)' : '公告訊息 (中文)'}
          <span className="language-badge">{isKorean ? '🇹🇼 번체 중국어' : '🇹🇼 繁體中文'}</span>
        </label>
        <textarea
          id="message_zh"
          value={formData.message_zh}
          onChange={(e) => handleInputChange('message_zh', e.target.value)}
          placeholder={isKorean ? '중국어 공지 내용을 입력하세요...' : '輸入中文公告內容...'}
          className={`message-input ${validation.messageLength_zh > maxLength ? 'error' : ''}`}
          rows={4}
        />
        <div className="announcement-editor-input-footer">
          <span className={`char-count ${validation.messageLength_zh > maxLength ? 'error' : ''}`}>
            {validation.messageLength_zh}/{maxLength}
          </span>
          {validation.messageLength_zh > maxLength && (
            <span className="announcement-editor-error-text">{isKorean ? '글자 수 제한 초과' : '超過字數限制'}</span>
          )}
        </div>
      </div>

      {/* 英文訊息輸入 */}
      <div className="form-group">
        <label htmlFor="message_en">
          {isKorean ? '공지 메시지 (영어)' : '公告訊息 (英文)'}
          <span className="language-badge">🇺🇸 English</span>
        </label>
        <textarea
          id="message_en"
          value={formData.message_en}
          onChange={(e) => handleInputChange('message_en', e.target.value)}
          placeholder="Enter English announcement message..."
          className={`message-input ${validation.messageLength_en > maxLength ? 'error' : ''}`}
          rows={4}
        />
        <div className="announcement-editor-input-footer">
          <span className={`char-count ${validation.messageLength_en > maxLength ? 'error' : ''}`}>
            {validation.messageLength_en}/{maxLength}
          </span>
          {validation.messageLength_en > maxLength && (
            <span className="announcement-editor-error-text">{isKorean ? '글자 수 제한 초과' : '超過字數限制'}</span>
          )}
        </div>
      </div>

      {/* 自動隱藏設定 */}
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={formData.autoHide}
            onChange={(e) => handleInputChange('autoHide', e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">{isKorean ? '공지 자동 숨김' : '自動隱藏公告'}</span>
        </label>
      </div>

      {/* 自動隱藏延遲時間 */}
      {formData.autoHide && (
        <div className="form-group">
          <label htmlFor="autoHideDelay">{isKorean ? '자동 숨김 시간 (초)' : '自動隱藏時間 (秒)'}</label>
          <div className="announcement-editor-delay-input-container">
            <input
              type="range"
              id="autoHideDelay"
              min="1"
              max="30"
              value={formData.autoHideDelay / 1000}
              onChange={(e) => handleInputChange('autoHideDelay', parseInt(e.target.value) * 1000)}
              className="announcement-editor-delay-slider"
            />
            <span className="announcement-editor-delay-value">{formData.autoHideDelay / 1000}{isKorean ? '초' : '秒'}</span>
          </div>
        </div>
      )}

      {/* 驗證錯誤 */}
      {validation.errors.length > 0 && (
        <div className="announcement-editor-validation-errors">
          {validation.errors.map((error, index) => (
            <div key={index} className="announcement-editor-error-item">
              <span className="announcement-editor-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="announcement-editor-actions">
        <button
          type="button"
          onClick={handlePreview}
          className="announcement-editor-btn announcement-editor-announcement-editor-btn-secondary"
          disabled={!formData.message_zh.trim() && !formData.message_en.trim()}
        >
          {isKorean ? '미리보기' : '預覽效果'}
        </button>
        
        <button
          type="button"
          onClick={handleSave}
          className="announcement-editor-btn announcement-editor-announcement-editor-btn-primary"
          disabled={!validation.isValid || saving}
        >
          {saving ? (isKorean ? '저장 중...' : '儲存中...') : (isKorean ? '설정 저장' : '儲存設定')}
        </button>
      </div>

      {/* 使用提示 */}
      <div className="announcement-editor-tips">
        <h4>{isKorean ? '사용 안내' : '使用提示'}</h4>
        <ul>
          <li>{isKorean ? '공지는 웹사이트 상단에 표시되며 이모지를 지원합니다' : '公告會顯示在網站頂部，支援 emoji 表情符號'}</li>
          <li>{isKorean ? <>메시지 길이는 다음 글자 수 이내로 설정하는 것을 권장합니다: {maxLength}자 이내</> : <>建議訊息長度控制在 {maxLength} 字元以內</>}</li>
          <li>{isKorean ? '시스템은 사용자의 언어 설정에 따라 해당 언어의 공지를 자동으로 표시합니다' : '系統會根據使用者的語言設定自動顯示對應的公告內容'}</li>
          <li>{isKorean ? '한 가지 언어만 입력하면 해당 언어가 모든 사용자에게 기본 공지로 표시됩니다' : '如果只填寫一種語言，該語言將作為所有使用者的預設公告'}</li>
          <li>{isKorean ? '자동 숨김 기능을 사용하면 공지가 사용자 이용을 지나치게 방해하지 않습니다' : '自動隱藏功能可以避免公告過於干擾用戶'}</li>
          <li>{isKorean ? '변경 사항은 즉시 적용되며 웹사이트를 다시 배포할 필요가 없습니다' : '修改後會立即生效，無需重新部署網站'}</li>
        </ul>
      </div>
    </div>
  );
};

export default AnnouncementEditor;
