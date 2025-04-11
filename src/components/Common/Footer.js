import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        {/* 頁尾導航區域 */}
        <div className="footer-navigation">
          <div className="footer-section">
            <h3>分析工具</h3>
            <ul>
              <li><Link to="/priceanalysis">樂活五線譜</Link></li>
              <li><Link to="/market-sentiment">市場情緒分析</Link></li>
              {/*
              <li><Link to="/googletrends">Google 搜尋熱度-單一標的</Link></li>
              <li><Link to="/googletrendsmarket">Google 搜尋熱度-整體市場</Link></li>
              */}
              <li><Link to="/watchlist">我的追蹤清單</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>其他資源</h3>
            <ul>
              <li><Link to="/articles">分析專欄</Link></li>
              <li>
                <a href="https://vocus.cc/salon/daily_chart" 
                   target="_blank" 
                   rel="noopener noreferrer">
                  關鍵圖表
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/profile.php?id=61565751412240" 
                   target="_blank" 
                   rel="noopener noreferrer">
                  Facebook 粉絲專頁
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>關於我</h3>
            <ul>
              <li><Link to="/about">關於本站</Link></li>
              <li><Link to="/legal">隱私權政策與服務條款</Link></li>
              <li><Link to="/sponsor-us">小豬撲滿</Link></li>
            </ul>
          </div>
        </div>

        {/* 版權聲明區域 */}
        <div className="footer-bottom">
          <div className="copyright">
            Copyright © 2025 Sentiment Inside Out
          </div>
          <div className="disclaimer">
            <p>
              本網站提供之數據、資料、分析結果、工具和說明內容僅供參考，任何投資行為須自行判斷並承擔風險，實際資訊需以官方公佈資料為準。本網站不負擔盈虧之法律責任。
            </p>
            <p>
              歡迎分享本網站提供之資訊連結，如需轉載內容務必經由本網站同意。聯絡信箱：<a href="mailto:support@sentimentinsideout.com">support@sentimentinsideout.com</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}; 