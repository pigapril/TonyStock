import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../PageContainer/PageContainer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

// 從 articleUtils.js 引入或複製 articleMappings
const articleMappings = {
    '1.用樂活五線譜分析價格趨勢與情緒': {
        enSlug: 'analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis',
        enFilename: 'Analyzing Price Trends and Sentiment with LOHAS Five-Line Analysis.en.ini.md'
    },
    '2.用市場情緒綜合指數判斷買賣時機': {
        enSlug: 'using-market-sentiment-composite-index-to-time-buys-and-sells',
        enFilename: 'using-market-sentiment-composite-index-to-time-buys-and-sells.en.ini.md'
    },
    '3.Netflix 併購華納全解析：如何利用「預期差」與「倒金字塔」策略獲利': {
        enSlug: 'netflix-acquires-warner-capitalizing-on-expectation-gap-strategy',
        enFilename: 'Netflix Acquires Warner Capitalizing on Expectation Gap Strategy.en.ini.md'
    }
};

// 建立反向映射 (英文 Slug -> 原始 Slug)
const englishSlugToOriginalMap = Object.entries(articleMappings).reduce((acc, [original, mapping]) => {
    if (mapping.enSlug) {
        acc[mapping.enSlug] = original;
    }
    return acc;
}, {});

export function ArticleDetail() {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const { slug: slugFromUrl } = useParams(); // 從 URL 獲取的 slug (可能是中文或英文)
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [meta, setMeta] = useState({});

    // 使用 useMemo 避免每次渲染都重新計算 originalSlug
    const originalSlug = useMemo(() => {
        if (currentLang === 'en' && englishSlugToOriginalMap[slugFromUrl]) {
            return englishSlugToOriginalMap[slugFromUrl];
        }
        // 如果不是英文，或者在英文模式下找不到對應的原始 slug (例如直接訪問了中文 slug 的英文 URL)，
        // 則假定 URL 中的 slug 就是原始 slug
        return slugFromUrl;
    }, [slugFromUrl, currentLang]);

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            setError(null);
            try {
                // 使用 originalSlug 來查找映射和構建路徑
                const mapping = articleMappings[originalSlug];
                let fileName;

                // 根據語言和映射決定檔案名稱
                if (currentLang === 'en' && mapping?.enFilename) {
                    fileName = mapping.enFilename;
                } else {
                    // 中文或其他語言
                    const articleName = originalSlug.replace(/^\d+\./, '');
                    fileName = `${articleName}.${currentLang}.ini.md`;
                }

                // 使用 originalSlug 構建檔案路徑
                const filePath = `/articles/${originalSlug}/${fileName}`;

                const response = await fetch(filePath);
                if (!response.ok) {
                    // 嘗試提供更明確的錯誤信息
                    throw new Error(`Article content not found. Lang: '${currentLang}', URL Slug: '${slugFromUrl}', Original Slug: '${originalSlug}', Path: ${filePath} (Status: ${response.status})`);
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
                            // 保持原樣，允許值中包含冒號
                            if (parts.length >= 2) {
                                parsedFrontmatter[parts[0].toLowerCase()] = parts.slice(1).join(':').trim();
                            }
                        });
                    } catch (e) {
                        console.error(`Error parsing frontmatter for ${originalSlug} (${currentLang}):`, e);
                    }
                    markdownContent = content.replace(frontmatterRegex, '').trim();
                    setMeta(parsedFrontmatter);
                } else {
                    setMeta({});
                }

                setArticle({
                    // 標題優先使用 frontmatter，其次是從 originalSlug 生成
                    title: parsedFrontmatter.title || originalSlug.replace(/^\d+\./, '').replace(/-/g, ' '),
                    slug: slugFromUrl, // 可以保留 URL 中的 slug
                    originalSlug: originalSlug, // 保存原始 slug
                    content: markdownContent,
                    // basePath 仍然使用 originalSlug
                    basePath: `/articles/${originalSlug}`,
                    lang: currentLang
                });
            } catch (error) {
                console.error("Could not fetch the article:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        // 檢查 originalSlug 是否有效 (如果需要)
        // 例如，如果 originalSlug 不在 articleMappings 中，可能表示 URL 無效
        if (!articleMappings[originalSlug]) {
             console.warn(`Invalid original slug derived: ${originalSlug} from URL slug: ${slugFromUrl}`);
             // 可以選擇設置錯誤狀態或導向 404
             setError(new Error(`Article not found for slug: ${slugFromUrl}`));
             setLoading(false);
        } else {
            fetchArticle();
        }
        // useEffect 的依賴項應包含 originalSlug 和 currentLang
    }, [originalSlug, currentLang, slugFromUrl]); // 加入 slugFromUrl 以確保 URL 變更時觸發

    // 自定義圖片渲染組件
    const ImageRenderer = ({ src, alt }) => {
        // 確保圖片路徑使用 article.basePath (基於 originalSlug)
        const imageSrc = src.startsWith('./') && article?.basePath
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

    // 確保 PageContainer 的 og:url 使用當前 URL
    const pageOgUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <PageContainer
            title={meta.title || article.title}
            description={meta.description || ''}
            // og:url 應反映當前頁面的實際 URL
            ogUrl={pageOgUrl}
        >
            <div className="article-detail-page">
                <Helmet>
                    {meta.keywords && <meta name="keywords" content={meta.keywords} />}
                    {/* og:locale 已在 PageContainer 中處理 */}
                </Helmet>
                <div className="article-header">
                    <h1>{article.title}</h1>
                </div>
                <div className="article-content">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
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