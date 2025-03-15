import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import ReactMarkdown from 'react-markdown';
import { getArticleInfoFromSlug } from '../utils/articleUtils';
import './ArticleDetail.css';
import { Helmet } from 'react-helmet-async';

// 新增一個通用的 ID 處理函數
const generateId = (text) => {
    return text
        .toLowerCase()
        .replace(/[()]/g, '')  // 移除括號
        .replace(/[\/]/g, '')  // 移除斜線
        .replace(/\s+/g, '-')  // 空格轉換為連字符
        .replace(/[^a-z0-9\u4E00-\u9FFF-]/g, ''); // 只保留英文、數字、中文和連字符
};

export function ArticleDetail() {
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [meta, setMeta] = useState({});

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            try {
                const articleName = slug.replace(/^\d+\./, '');
                const response = await fetch(`/articles/${slug}/${articleName}.ini.md`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const content = await response.text();
                
                // 解析 Frontmatter
                const frontmatterRegex = /^---([\s\S]+?)---/;
                const frontmatterMatch = content.match(frontmatterRegex);
                let frontmatter = {};
                let markdownContent = content;

                if (frontmatterMatch) {
                    try {
                        frontmatter = JSON.parse(frontmatterMatch[1]); // 嘗試解析 JSON
                    } catch (e) {
                        // 如果 JSON 解析失敗，嘗試 YAML 簡易解析
                        const yamlLines = frontmatterMatch[1].trim().split('\n');
                        yamlLines.forEach(line => {
                            const parts = line.split(':').map(p => p.trim());
                            if (parts.length === 2) {
                                frontmatter[parts[0]] = parts[1];
                            }
                        });
                    }
                    markdownContent = content.replace(frontmatterRegex, '').trim(); // 移除 frontmatter
                    setMeta(frontmatter); // 設定 meta state
                }

                setArticle({
                    ...getArticleInfoFromSlug(slug),
                    content: markdownContent,
                    basePath: `/articles/${slug}`
                });
            } catch (error) {
                console.error("Could not fetch the article:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [slug]);

    // 自定義圖片渲染組件
    const ImageRenderer = ({ src, alt }) => {
        const imageSrc = src.startsWith('./') 
            ? `${article.basePath}/${src.slice(2)}` 
            : src;
        
        return (
            <>
                <img 
                    src={imageSrc} 
                    alt={alt} 
                    loading="lazy"
                    className="article-image"
                    onClick={() => setSelectedImage(imageSrc)}
                />
                {selectedImage && (
                    <div 
                        className="image-modal"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="modal-content">
                            <img 
                                src={selectedImage} 
                                alt={alt} 
                                className="modal-image"
                            />
                        </div>
                    </div>
                )}
            </>
        );
    };

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
            <Helmet>
                <title>{meta.title || article.title}</title>
                <meta name="description" content={meta.description} />
                <meta name="keywords" content={meta.keywords} />
            </Helmet>
            <PageContainer>
                <div className="article-header">
                    <h1>{article.title}</h1>
                </div>
                <div className="article-content">
                    <ReactMarkdown 
                        components={{
                            img: ImageRenderer,
                            h2: ({node, ...props}) => {
                                const title = Array.isArray(node.children) && node.children[0]?.value ? node.children[0].value : '';
                                const id = generateId(title);
                                console.log("h2 title:", title, "generated id:", id);
                                return <h2 id={id} {...props} />;
                            },
                            h3: ({node, ...props}) => {
                                const title = Array.isArray(node.children) && node.children[0]?.value ? node.children[0].value : '';
                                const id = generateId(title);
                                console.log("h3 title:", title, "generated id:", id);
                                return <h3 id={id} {...props} />;
                            },
                            a: ({node, ...props}) => {
                                if (props.href?.startsWith('#')) {
                                    const href = props.href.slice(1);
                                    const decodedHref = decodeURIComponent(href);
                                    const id = generateId(decodedHref);
                                    console.log("link href:", href, "target id:", id);
                                    return (
                                        <a
                                            {...props}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const element = document.getElementById(id);
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth' });
                                                } else {
                                                    console.warn("Element not found with id:", id);
                                                }
                                            }}
                                        />
                                    );
                                }
                                return <a {...props} />;
                            }
                        }}
                    >
                        {article.content}
                    </ReactMarkdown>
                </div>
            </PageContainer>
        </div>
    );
} 