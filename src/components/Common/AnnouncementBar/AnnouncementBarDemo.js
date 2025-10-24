/**
 * 公告欄 URL 連結功能示例
 * 用於測試和展示 URL 連結功能
 */

import React, { useState } from 'react';
import AnnouncementBarPreview from './AnnouncementBarPreview';
import './AnnouncementBar.css';

const AnnouncementBarDemo = () => {
  const [currentExample, setCurrentExample] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const examples = [
    {
      title: '基本 HTTP URL',
      message: '🎉 歡迎訪問我們的官網 https://example.com 了解更多資訊！'
    },
    {
      title: 'www 格式 URL',
      message: '📈 查看最新股市分析 www.stockanalysis.com 獲取專業見解'
    },
    {
      title: '多個 URL',
      message: '🔗 訪問 https://docs.example.com 查看文檔，或到 www.support.com 獲取支援'
    },
    {
      title: '長 URL 自動縮短',
      message: '📊 詳細報告請見 https://reports.example.com/quarterly/2024/detailed-financial-analysis-report.html'
    },
    {
      title: 'FTP 連結',
      message: '📁 下載檔案 ftp://files.example.com/downloads/latest-version.zip'
    },
    {
      title: '混合內容',
      message: '🚀 新功能上線！訪問 https://features.example.com 體驗，問題回報至 www.bugs.example.com'
    },
    {
      title: '純文字（無連結）',
      message: '📢 系統維護通知：今晚 23:00-01:00 進行例行維護，請提前保存工作'
    }
  ];

  const handleNext = () => {
    setCurrentExample((prev) => (prev + 1) % examples.length);
    setIsVisible(true);
  };

  const handlePrevious = () => {
    setCurrentExample((prev) => (prev - 1 + examples.length) % examples.length);
    setIsVisible(true);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleShow = () => {
    setIsVisible(true);
  };

  const currentMsg = examples[currentExample];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>公告欄 URL 連結功能示例</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>當前示例: {currentMsg.title}</h3>
        <p><strong>原始文字:</strong> {currentMsg.message}</p>
        
        <div style={{ marginTop: '10px' }}>
          <button onClick={handlePrevious} style={{ marginRight: '10px' }}>
            ← 上一個
          </button>
          <button onClick={handleNext} style={{ marginRight: '10px' }}>
            下一個 →
          </button>
          {!isVisible && (
            <button onClick={handleShow} style={{ marginLeft: '10px' }}>
              顯示公告
            </button>
          )}
        </div>
        
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          示例 {currentExample + 1} / {examples.length}
        </p>
      </div>

      {/* 公告欄預覽 */}
      <div style={{ position: 'relative', minHeight: '100px', border: '1px dashed #ccc', borderRadius: '8px' }}>
        {isVisible ? (
          <AnnouncementBarPreview
            message={currentMsg.message}
            isVisible={isVisible}
            onClose={handleClose}
            autoHide={false}
          />
        ) : (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#999',
            fontStyle: 'italic'
          }}>
            公告已關閉，點擊「顯示公告」重新顯示
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>功能說明</h3>
        <ul>
          <li><strong>自動檢測 URL:</strong> 支援 http://, https://, ftp:// 和 www. 格式</li>
          <li><strong>安全連結:</strong> 所有連結都會在新視窗開啟，並包含安全屬性</li>
          <li><strong>智能縮短:</strong> 長 URL 會自動縮短顯示，但連結到完整地址</li>
          <li><strong>響應式設計:</strong> 在不同螢幕尺寸下都有良好的顯示效果</li>
          <li><strong>無障礙支援:</strong> 包含適當的 ARIA 標籤和鍵盤導航支援</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>使用方法</h3>
        <p>在公告管理後台輸入包含 URL 的文字，系統會自動將 URL 轉換為可點擊的連結。</p>
        <p><strong>支援的 URL 格式:</strong></p>
        <ul>
          <li>https://example.com</li>
          <li>http://example.com</li>
          <li>www.example.com</li>
          <li>ftp://files.example.com</li>
        </ul>
      </div>
    </div>
  );
};

export default AnnouncementBarDemo;