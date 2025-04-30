import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../PageContainer/PageContainer';
import { getAllArticles } from '../../utils/articleUtils';
import './Articles.css';
import { useTranslation } from 'react-i18next';

export function Articles() {
    const { t } = useTranslation();
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
        "name": t('articles.jsonLdName'),
        "description": t('articles.jsonLdDescription'),
        "url": "https://sentimentinsideout.com/articles"
    };

    return (
        <div className="articles-page">
            <PageContainer
                title={t('articles.pageTitle')}
                description={t('articles.pageDescription')}
                keywords={t('articles.keywords')}
                ogImage="/articles-og-image.png"
                ogUrl="https://sentimentinsideout.com/articles"
                jsonLd={articlesJsonLd}
            >
                <h1>{t('articles.heading')}</h1>
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