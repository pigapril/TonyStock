import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import './Articles.css'; // 您可以創建一個 CSS 檔案來設定樣式

export function Articles() {
    // 假設您的文章資料儲存在這裡
    const articles = [
        {
            id: 1,
            title: '新手入門：如何使用樂活五線譜分析股價',
            slug: 'how-to-use-price-analysis',
            description: '了解如何使用樂活五線譜判斷股價的超買超賣。',
        },
        {
            id: 2,
            title: '解讀市場情緒：掌握投資的風向球',
            slug: 'understanding-market-sentiment',
            description: '學習如何解讀市場情緒綜合指數，輔助您的投資決策。',
        },
        // ... 其他文章
    ];

    return (
        <div className="articles-page">
            <h1>使用指南</h1>
            <ul className="articles-list">
                {articles.map(article => (
                    <li key={article.id} className="article-item">
                        <Link to={`/articles/${article.slug}`}>
                            <h3>{article.title}</h3>
                            <p>{article.description}</p>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
} 