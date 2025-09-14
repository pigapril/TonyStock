import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownRenderer = ({ filePath, className = '' }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 使用 fetch 載入 markdown 文件
        const response = await fetch(filePath);
        
        if (!response.ok) {
          throw new Error(`Failed to load markdown file: ${response.status}`);
        }
        
        let text = await response.text();
        
        // 移除第一行如果它看起來像是標題（避免重複顯示）
        const lines = text.split('\n');
        if (lines.length > 0 && lines[0].trim() && !lines[0].startsWith('#')) {
          // 如果第一行不是 markdown 標題格式，但看起來像標題，就移除它
          if (lines[0].length < 50 && !lines[0].includes('.')) {
            text = lines.slice(1).join('\n');
          }
        }
        
        setContent(text);
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      loadMarkdown();
    }
  }, [filePath]);

  if (loading) {
    return (
      <div className={`markdown-loading ${className}`}>
        <div className="loading-spinner">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`markdown-error ${className}`}>
        <p>載入文件時發生錯誤: {error}</p>
      </div>
    );
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          // 自定義 markdown 組件樣式
          h1: ({ children }) => <h2 className="section-title">{children}</h2>, // 將 h1 降級為 h2
          h2: ({ children }) => <h2 className="section-title">{children}</h2>,
          h3: ({ children }) => <h3 className="subsection-title">{children}</h3>,
          p: ({ children }) => <p className="legal-paragraph">{children}</p>,
          ul: ({ children }) => <ul className="legal-list">{children}</ul>,
          li: ({ children }) => <li className="legal-list-item">{children}</li>,
          strong: ({ children }) => <strong className="legal-strong">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;