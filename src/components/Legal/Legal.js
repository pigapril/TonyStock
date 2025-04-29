import React from 'react';
import './Legal.css';

export const Legal = () => {
  return (
    <div className="legal-page">
      <h1 className="legal-title">隱私權政策與服務條款</h1>
      
      {/* 隱私權政策部分 */}
      <div className="legal-section">
        <h2 className="section-title">隱私權政策</h2>
        
        <div className="subsection">
          <h3 className="subsection-title">1. 資料收集</h3>
          <div className="subsection-content">
            <p>本網站只收集必要的用戶資料：</p>
            <ul className="legal-list">
              <li>Google 帳號基本資料（用戶名稱）</li>
              <li>電子郵件地址</li>
              <li>個人資料照片</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <h3 className="subsection-title">2. 資料使用目的</h3>
          <div className="subsection-content">
            <p>本網站使用這些資料來：</p>
            <ul className="legal-list">
              <li>提供個人化的服務：如股票代碼追蹤</li>
              <li>發送重要通知</li>
              <li>改善用戶體驗</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <h3 className="subsection-title">3. 資料保護</h3>
          <div className="subsection-content">
            <p>我們採取以下措施保護您的資料：</p>
            <ul className="legal-list">
              <li>使用加密技術保護資料傳輸</li>
              <li>定期進行安全性檢查</li>
              <li>嚴格控制資料存取權限</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <h3 className="subsection-title">4. 用戶權利</h3>
          <div className="subsection-content">
            <p>您擁有以下權利：</p>
            <ul className="legal-list">
              <li>查看您的個人資料</li>
              <li>更新或修正您的資料</li>
              <li>要求刪除您的帳號和資料</li>
              <li>隨時撤銷授權</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 服務條款部分 */}
      <div className="legal-section">
        <h2 className="section-title">服務條款</h2>

        <div className="subsection">
          <h3 className="subsection-title">1. 服務說明</h3>
          <div className="subsection-content">
            <p>Sentiment Inside Out 提供：</p>
            <ul className="legal-list">
              <li>股市資訊追蹤</li>
              <li>市場分析工具</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <h3 className="subsection-title">2. 使用規範</h3>
          <div className="subsection-content">
            <p>用戶須同意：</p>
            <ul className="legal-list">
              <li>提供真實且準確的資訊</li>
              <li>保護帳號安全</li>
              <li>遵守相關法律規定</li>
              <li>不進行任何惡意行為</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <h3 className="subsection-title">3. 免責聲明</h3>
          <div className="subsection-content">
            <p>本服務：</p>
            <ul className="legal-list">
              <li>不提供投資建議</li>
              <li>不保證資訊即時性和準確性</li>
              <li>不對投資損失負責</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 