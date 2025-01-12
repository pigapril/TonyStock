import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import './ArticleDetail.css';

export function ArticleDetail() {
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 模擬從資料來源獲取文章
        const fetchArticle = async () => {
            setLoading(true);
            try {
                // 這裡您可以根據 slug 從 JSON 檔案、API 或 CMS 獲取文章內容
                const response = await fetch(`/api/articles/${slug}.json`); // 假設您的文章以 JSON 格式儲存
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setArticle(data);
            } catch (error) {
                console.error("Could not fetch the article:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [slug]);

    if (loading) {
        return <div>載入中...</div>;
    }

    if (error) {
        return <div>載入文章失敗：{error.message}</div>;
    }

    if (!article) {
        return <div>找不到該文章。</div>;
    }

    return (
        <div className="article-detail-page">
            <PageContainer title={article.title}>
                <h1>{article.title}</h1>
                <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />
            </PageContainer>
        </div>
    );
} 