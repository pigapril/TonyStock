import React, { useState, useEffect } from 'react';
import AnnouncementEditor from './components/AnnouncementEditor';
import AnnouncementPreview from './components/AnnouncementPreview';
import apiClient from '../../../api/apiClient';
import './AnnouncementManager.css';

const AnnouncementManager = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // 載入當前配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/announcement');

      if (response.data.success) {
        setConfig(response.data.data);
      } else {
        throw new Error(response.data.message || '載入配置失敗');
      }
    } catch (err) {
      console.error('載入公告配置失敗:', err);
      setError('載入配置失敗: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newConfig) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.put('/api/admin/announcement', newConfig);

      if (response.data.success) {
        setConfig(response.data.data);
        setSuccess('公告配置已成功更新！');
        
        // 3秒後清除成功訊息
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.message || '儲存失敗');
      }
    } catch (err) {
      console.error('儲存公告配置失敗:', err);
      setError('儲存失敗: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (announcementData) => {
    try {
      const response = await apiClient.post('/api/admin/announcement/preview', { 
        announcement: announcementData 
      });

      if (response.data.success) {
        setPreviewData(response.data.data);
      } else {
        throw new Error(response.data.message || '預覽生成失敗');
      }
    } catch (err) {
      console.error('生成預覽失敗:', err);
      setError('預覽失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="announcement-mgr-container">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="announcement-mgr-container">
      <div className="announcement-mgr-header">
        <h1>公告管理</h1>
        <p className="subtitle">管理網站頂部的公告欄內容</p>
      </div>

      {error && (
        <div className="announcement-mgr-alert announcement-mgr-alert-error">
          <span className="announcement-mgr-alert-icon">⚠️</span>
          <span className="announcement-mgr-alert-message">{error}</span>
          <button 
            className="announcement-mgr-alert-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="announcement-mgr-alert announcement-mgr-alert-success">
          <span className="announcement-mgr-alert-icon">✅</span>
          <span className="announcement-mgr-alert-message">{success}</span>
          <button 
            className="announcement-mgr-alert-close"
            onClick={() => setSuccess(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="announcement-mgr-content">
        <div className="announcement-mgr-editor-section">
          <AnnouncementEditor
            config={config}
            onSave={handleSave}
            onPreview={handlePreview}
            saving={saving}
          />
        </div>

        <div className="announcement-mgr-preview-section">
          <AnnouncementPreview
            config={config}
            previewData={previewData}
          />
        </div>
      </div>

      {config && (
        <div className="announcement-mgr-config-info">
          <h3>配置資訊</h3>
          <div className="announcement-mgr-info-grid">
            <div className="announcement-mgr-info-item">
              <label>最後更新:</label>
              <span>{new Date(config.announcement.lastUpdated).toLocaleString('zh-TW')}</span>
            </div>
            <div className="announcement-mgr-info-item">
              <label>更新者:</label>
              <span>{config.announcement.updatedBy}</span>
            </div>
            <div className="announcement-mgr-info-item">
              <label>配置版本:</label>
              <span>{config.settings.version}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManager;