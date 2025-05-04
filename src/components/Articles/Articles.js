import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../PageContainer/PageContainer';
import { getAllArticles } from '../../utils/articleUtils';
import './Articles.css';
import { useTranslation } from 'react-i18next';

export function Articles() {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadArticles = async () => {
            setLoading(true);
            setError(null);
            try {
                const articleList = await getAllArticles(currentLang);
                setArticles(articleList);
            } catch (err) {
                console.error("Failed to load articles:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        loadArticles();
    }, [currentLang]);

    const articlesJsonLd = useMemo(() => ({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": t('articles.jsonLdName'),
        "description": t('articles.jsonLdDescription'),
        "url": `${window.location.origin}/${currentLang}/articles`,
        "inLanguage": currentLang
    }), [t, currentLang]);

    if (loading) {
        return (
            <PageContainer title={t('articles.pageTitle')} description={t('articles.pageDescription')}>
                <div>{t('common.loading')}</div>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer title={t('articles.pageTitle')} description={t('articles.pageDescription')}>
                <div>{t('common.errorLoading')}</div>
            </PageContainer>
        );
    }

    return (
        <div className="articles-page">
            <PageContainer
                title={t('articles.pageTitle')}
                description={t('articles.pageDescription')}
                keywords={t('articles.keywords')}
                ogImage="/articles-og-image.png"
                ogUrl={`${window.location.origin}/${currentLang}/articles`}
                jsonLd={articlesJsonLd}
            >
                <h1>{t('articles.heading')}</h1>
                <ul className="articles-list">
                    {articles.filter(article => article.content).map(article => (
                        <li key={article.id} className="article-item">
                            <Link to={`/${currentLang}/articles/${article.slug}`}>
                                <div className="article-cover">
                                    <img 
                                        src={`/articles/${article.originalSlug}/image-cover.png`}
                                        alt={article.title}
                                        loading="lazy"
                                    />
                                </div>
                                <div className="article-content">
                                    <div className="article-tag">{article.category || t('articles.noCategory')}</div>
                                    <h3>{article.title}</h3>
                                    <div className="article-date">{article.date || t('articles.noDate')}</div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </PageContainer>
        </div>
    );
} 