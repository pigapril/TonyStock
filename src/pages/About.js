import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import aboutContent from '../content/about.md';

export const About = () => {
  const [content, setContent] = useState('');

  useEffect(() => {
    // 讀取 markdown 文件
    fetch(aboutContent)
      .then(response => response.text())
      .then(text => setContent(text));
  }, []);

  return (
    <div className="about-page">
      <div className="about-container">
        <div className="about-image">
          <img src="/about-image.jpg" alt="About NikuStock" />
        </div>
        
        <div className="about-content">
          
          <div className="about-text">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          
          <div className="about-footer">
            <p>Copyright © 2024 NikuStock</p>
            <p>
              網站內提供之數據、資料、分析、文字和其他內容僅供使用者作為參考，
              實際數據以官方公佈資料為準，如需轉載內容務必經本站負責人同意。
              <Link to="/legal">點此查看隱私政策及服務條款</Link>。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 