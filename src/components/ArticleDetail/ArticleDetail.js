import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../PageContainer/PageContainer';
import ReactMarkdown from 'react-markdown';
import './ArticleDetail.css';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

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
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [meta, setMeta] = useState({});

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            setError(null);
            try {
                const articleName = slug.replace(/^\d+\./, '');
                const fileName = `${articleName}.${currentLang}.ini.md`;
                const filePath = `/articles/${slug}/${fileName}`;

                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Article not found for lang '${currentLang}': ${filePath} (Status: ${response.status})`);
                }
                const content = await response.text();
                
                const frontmatterRegex = /^---([\s\S]+?)---/;
                const frontmatterMatch = content.match(frontmatterRegex);
                let parsedFrontmatter = {};
                let markdownContent = content;

                if (frontmatterMatch) {
                    try {
                        const yamlLines = frontmatterMatch[1].trim().split('\n');
                        yamlLines.forEach(line => {
                            const parts = line.split(':').map(p => p.trim());
                            if (parts.length === 2) {
                                parsedFrontmatter[parts[0].toLowerCase()] = parts[1];
                            }
                        });
                    } catch (e) {
                        console.error(`Error parsing frontmatter for ${slug} (${currentLang}):`, e);
                    }
                    markdownContent = content.replace(frontmatterRegex, '').trim();
                    setMeta(parsedFrontmatter);
                } else {
                    setMeta({});
                }

                setArticle({
                    title: parsedFrontmatter.title || slug.replace(/^\d+\./, '').replace(/-/g, ' '),
                    slug: slug,
                    content: markdownContent,
                    basePath: `/articles/${slug}`,
                    lang: currentLang
                });
            } catch (error) {
                console.error("Could not fetch the article:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [slug, currentLang]);

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
        return <PageContainer title={t('articleDetail.loadingTitle')} description={t('articleDetail.loadingDescription')}><div>{t('common.loading')}</div></PageContainer>;
    }

    if (error) {
        return <PageContainer title={t('articleDetail.errorTitle')} description={t('articleDetail.errorDescription')}>
            <div>{t('articleDetail.errorText')}{error.message}</div>
        </PageContainer>;
    }

    if (!article) {
        return <PageContainer title={t('articleDetail.notFoundTitle')} description={t('articleDetail.notFoundDescription')}>
            <div>{t('articleDetail.notFoundText')}</div>
        </PageContainer>;
    }

    return (
        <PageContainer 
            title={meta.title || article.title} 
            description={meta.description || ''}
        >
            <div className="article-detail-page">
                <Helmet>
                    {meta.keywords && <meta name="keywords" content={meta.keywords} />}
                    <meta property="og:locale" content={currentLang === 'zh' ? 'zh_TW' : 'en_US'} />
                </Helmet>
                <div className="article-header">
                    <h1>{article.title}</h1>
                </div>
                <div className="article-content">
                    <ReactMarkdown 
                        components={{
                            img: ImageRenderer,
                            h2: ({node, ...props}) => {
                                const titleText = Array.isArray(node.children) && node.children[0]?.value ? node.children[0].value : '';
                                const id = generateId(titleText);
                                return <h2 id={id} {...props} />;
                            },
                            h3: ({node, ...props}) => {
                                const titleText = Array.isArray(node.children) && node.children[0]?.value ? node.children[0].value : '';
                                const id = generateId(titleText);
                                return <h3 id={id} {...props} />;
                            },
                            a: ({node, ...props}) => {
                                if (props.href?.startsWith('#')) {
                                    const href = props.href.slice(1);
                                    try {
                                        const decodedHref = decodeURIComponent(href);
                                        const id = generateId(decodedHref);
                                        return (
                                            <a
                                                {...props}
                                                href={`#${id}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const element = document.getElementById(id);
                                                    if (element) {
                                                        element.scrollIntoView({ behavior: 'smooth' });
                                                        window.history.pushState(null, '', `#${id}`);
                                                    } else {
                                                        console.warn("Element not found with id:", id);
                                                    }
                                                }}
                                            />
                                        );
                                    } catch (e) {
                                        console.error("Error decoding or generating ID for anchor:", href, e);
                                        return <a {...props} />;
                                    }
                                }
                                return <a {...props} target="_blank" rel="noopener noreferrer"/>;
                            }
                        }}
                    >
                        {article.content}
                    </ReactMarkdown>
                </div>
            </div>
        </PageContainer>
    );
} 