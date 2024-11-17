import React from 'react';
import { Link } from 'react-router-dom';

export const About = () => {
  return (
    <div className="about-page">
      <div className="about-container">
        <div className="about-image">
          <img src="/about-image.jpg" alt="About NikuStock" />
        </div>
        
        <div className="about-content">
          <h1 className="about-title">關於 NikuStock</h1>
          
          <div className="about-text">
            {/* 這裡可以放主要內容 */}
          </div>
          
          <div className="about-footer">
            <p>Copyright © 2024 NikuStock</p>
            <p>
              網站內提供之數據、資料、分析、文字和其他內容僅供使用者作為參考，
              實際數據以官方公佈資料為準，如需轉載內容務必經本站負責人同意。
              <Link to="/legal">隱私政策及服務條款請點此</Link>。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 