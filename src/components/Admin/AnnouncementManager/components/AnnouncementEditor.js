import React, { useState, useEffect } from 'react';
import './AnnouncementEditor.css';

const AnnouncementEditor = ({ config, onSave, onPreview, saving }) => {
  const [formData, setFormData] = useState({
    enabled: false,
    message: '',
    autoHide: true,
    autoHideDelay: 8000
  });

  const [validation, setValidation] = useState({
    messageLength: 0,
    isValid: true,
    errors: []
  });

  // 當配置載入時更新表單數據
  useEffect(() => {
    if (config?.announcement) {
      setFormData({
        enabled: config.announcement.enabled,
        message: config.announcement.message,
        autoHide: config.announcement.autoHide,
        autoHideDelay: config.announcement.autoHideDelay
      });
    }
  }, [config]);

  // 驗證表單數據
  useEffect(() => {
    const errors = [];
    const messageLength = formData.message.length;
    const maxLength = config?.settings?.maxLength || 200;

    if (messageLength > maxLength) {
      errors.push(`訊息長度超過限制 (${messageLength}/${maxLength})`);
    }

    if (formData.enabled && !formData.message.trim()) {
      errors.push('啟用公告時必須提供訊息內容');
    }

    if (formData.autoHideDelay < 1000 || formData.autoHideDelay > 30000) {
      errors.push('自動隱藏時間必須在 1-30 秒之間');
    }

    setValidation({
      messageLength,
      isValid: errors.length === 0,
      errors
    });
  }, [formData, config]);

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
      announcement: formData,
      settings: config?.settings || {}
    };

    onSave(saveData);
  };

  const handlePreview = () => {
    onPreview(formData);
  };

  const maxLength = config?.settings?.maxLength || 200;

  return (
    <div className="announcement-editor">
      <h2>編輯公告</h2>

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
            {formData.enabled ? '公告已啟用' : '公告已停用'}
          </span>
        </label>
      </div>

      {/* 訊息輸入 */}
      <div className="form-group">
        <label htmlFor="message">公告訊息</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          placeholder="輸入公告內容..."
          className={`message-input ${validation.messageLength > maxLength ? 'error' : ''}`}
          rows={4}
        />
        <div className="announcement-editor-input-footer">
          <span className={`char-count ${validation.messageLength > maxLength ? 'error' : ''}`}>
            {validation.messageLength}/{maxLength}
          </span>
          {validation.messageLength > maxLength && (
            <span className="announcement-editor-error-text">超過字數限制</span>
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
          <span className="toggle-text">自動隱藏公告</span>
        </label>
      </div>

      {/* 自動隱藏延遲時間 */}
      {formData.autoHide && (
        <div className="form-group">
          <label htmlFor="autoHideDelay">自動隱藏時間 (秒)</label>
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
            <span className="announcement-editor-delay-value">{formData.autoHideDelay / 1000}秒</span>
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
          disabled={!formData.message.trim()}
        >
          預覽效果
        </button>
        
        <button
          type="button"
          onClick={handleSave}
          className="announcement-editor-btn announcement-editor-announcement-editor-btn-primary"
          disabled={!validation.isValid || saving}
        >
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      {/* 使用提示 */}
      <div className="announcement-editor-tips">
        <h4>使用提示</h4>
        <ul>
          <li>公告會顯示在網站頂部，支援 emoji 表情符號</li>
          <li>建議訊息長度控制在 {maxLength} 字元以內</li>
          <li>自動隱藏功能可以避免公告過於干擾用戶</li>
          <li>修改後會立即生效，無需重新部署網站</li>
        </ul>
      </div>
    </div>
  );
};

export default AnnouncementEditor;