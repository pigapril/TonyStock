import React, { useState, useEffect } from 'react';
import announcementCooldownManager from '../../../utils/announcementCooldown';

/**
 * 公告系統開發者工具
 * 僅在開發模式下顯示，用於測試冷卻期功能
 */
const AnnouncementDevTools = ({ config }) => {
  const [stats, setStats] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateStats = () => {
    if (config) {
      setStats(announcementCooldownManager.getAnnouncementStats(config));
    }
  };

  useEffect(() => {
    updateStats();
  }, [config]);

  const handleClearCurrent = () => {
    if (config) {
      announcementCooldownManager.clearAnnouncementData(config);
      updateStats();
      alert('當前公告記錄已清除！');
    }
  };

  const handleClearAll = () => {
    announcementCooldownManager.clearAllAnnouncementData();
    updateStats();
    alert('所有公告記錄已清除！');
  };

  if (process.env.NODE_ENV !== 'development' || !config) {
    return null;
  }

  const cooldownPeriods = announcementCooldownManager.getCooldownPeriods();

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      maxWidth: '320px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '10px' : '0'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <strong>🔧 公告開發工具</strong>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <strong>當前公告統計:</strong>
            {stats ? (
              <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                <div>關閉次數: {stats.dismissCount}</div>
                <div>最後關閉: {stats.lastDismissed ? new Date(stats.lastDismissed).toLocaleString() : '無'}</div>
                <div>下次顯示: {stats.nextShowTime ? new Date(stats.nextShowTime).toLocaleString() : '無'}</div>
                <div>冷卻中: {stats.isInCooldown ? '是' : '否'}</div>
                {stats.announcementId && (
                  <div style={{ fontSize: '10px', color: '#ccc', marginTop: '5px' }}>
                    ID: {stats.announcementId.substring(0, 30)}...
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginLeft: '10px', color: '#ccc' }}>無資料</div>
            )}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>冷卻期設定:</strong>
            <div style={{ marginLeft: '10px', marginTop: '5px' }}>
              {cooldownPeriods.map((period, index) => (
                <div key={index}>第{index + 1}次: {period}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button
              onClick={handleClearCurrent}
              style={{
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              清除當前
            </button>
            <button
              onClick={handleClearAll}
              style={{
                backgroundColor: '#ff4757',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              清除全部
            </button>
            <button
              onClick={updateStats}
              style={{
                backgroundColor: '#5352ed',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              重新整理
            </button>
          </div>

          <div style={{
            marginTop: '10px',
            fontSize: '10px',
            color: '#ccc',
            borderTop: '1px solid #333',
            paddingTop: '5px'
          }}>
            💡 手動驗證腳本已搬到 `frontend/scripts/verification/announcementCooldownVerification.js`
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementDevTools;
