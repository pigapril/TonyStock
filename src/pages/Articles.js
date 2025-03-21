import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import { getAllArticles } from '../utils/articleUtils';
import './Articles.css';

export function Articles() {
    const [articles, setArticles] = useState([]);

    useEffect(() => {
        const loadArticles = async () => {
            const articleList = await getAllArticles();
            setArticles(articleList);
        };
        loadArticles();
    }, []);

    // 定義結構化數據
    const articlesJsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "分析專欄",
        "description": "深入分析市場趨勢和投資策略以及如何使用網站工具判斷市場情緒。",
        "url": "https://sentimentinsideout.com/articles"
    };

    return (
        <div className="articles-page">
            <PageContainer
                title="分析專欄"
                description="深入分析市場趨勢和投資策略以及如何使用網站工具判斷市場情緒。"
                keywords="市場分析,投資策略,市場情緒,投資文章,金融分析,教學"
                ogImage="/articles-og-image.png"
                ogUrl="https://sentimentinsideout.com/articles"
                jsonLd={articlesJsonLd}
            >
                <h1>分析專欄</h1>
                <ul className="articles-list">
                    {articles.map(article => (
                        <li key={article.id} className="article-item">
                            <Link to={`/articles/${article.slug}`}>
                                <div className="article-cover">
                                    <img 
                                        src={`/articles/${article.slug}/image-cover.png`}
                                        alt={article.title}
                                        loading="lazy"
                                    />
                                </div>
                                <div className="article-content">
                                    <div className="article-tag">{article.category}</div>
                                    <h3>{article.title}</h3>
                                    <div className="article-date">{article.date}</div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </PageContainer>
        </div>
    );
} 