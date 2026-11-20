import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import PageContainer from '../PageContainer/PageContainer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ArticleDetail.css';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { socialImagePath, canonicalUrl, SITE_ORIGIN, SITE_NAME } from '../../utils/socialMetadata';
import imageDimensions from '../../config/articleImageDimensions.json';
import articleCatalog from '../../config/articleCatalog';

// 判斷 markdown 連結是否指向站內。相對路徑與本站絕對網址都算，
// 回傳可交給 React Router 的路徑；外部連結回傳 null。
const SITE_ORIGINS = ['https://sentimentinsideout.com', 'https://www.sentimentinsideout.com'];
const toInternalPath = (href) => {
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return null;
    if (href.startsWith('/')) return href;
    const origin = SITE_ORIGINS.find((site) => href.startsWith(site));
    return origin ? href.slice(origin.length) || '/' : null;
};

// 新增一個通用的 ID 處理函數
const generateId = (text) => {
    return text
        .toLowerCase()
        .replace(/[()]/g, '')  // 移除括號
        .replace(/[/]/g, '')  // 移除斜線
        .replace(/\s+/g, '-')  // 空格轉換為連字符
        .replace(/[^a-z0-9\u1100-\u11FF\uAC00-\uD7AF\u4E00-\u9FFF-]/g, ''); // 保留英文、數字、漢字與韓文
};

const articleByOriginalSlug = Object.fromEntries(
    articleCatalog.map(article => [article.originalSlug, article])
);
const articleSlugLookup = Object.fromEntries(
    articleCatalog.flatMap(article => Object.entries(article.locales).map(([locale, edition]) => [
        edition.slug,
        { originalSlug: article.originalSlug, locale },
    ]))
);

// 文章改名後舊網址仍在外面流通，這裡把舊 slug 導到現在的網址，避免已發出去的連結變成
// 「找不到文章」。第 4 篇的樣本量統一為 1,156 萬筆；保留先前 576 萬與 1,155 萬網址的轉址。
const renamedSlugs = {
    '4.樂活五線譜576萬筆台美股資料實測結果分析': 'lohas-five-line-analysis-tested-on-11-6-million-daily-bars',
    '4.樂活五線譜1155萬筆台美股資料實測結果分析': 'lohas-five-line-analysis-tested-on-11-6-million-daily-bars',
    'lohas-five-line-analysis-tested-on-5-8-million-daily-bars':
        'lohas-five-line-analysis-tested-on-11-6-million-daily-bars'
};

export function ArticleDetail() {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const { slug: slugFromUrl } = useParams(); // 從 URL 獲取的 slug (可能是中文或英文)
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [meta, setMeta] = useState({});

    const renamedTo = renamedSlugs[slugFromUrl];

    // 使用 useMemo 避免每次渲染都重新計算 originalSlug
    const originalSlug = useMemo(
        () => articleSlugLookup[slugFromUrl]?.originalSlug || slugFromUrl,
        [slugFromUrl]
    );
    const articleConfig = articleByOriginalSlug[originalSlug];
    const articleEdition = articleConfig?.locales[currentLang];
    const expectedSlug = articleEdition?.slug;

    useEffect(() => {
        if (!articleEdition) return undefined;
        const fetchArticle = async () => {
            setLoading(true);
            setError(null);
            try {
                const filePath = `/articles/${originalSlug}/${articleEdition.filename}`;

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
                            const separator = line.indexOf(':');
                            if (separator !== -1) {
                                const key = line.slice(0, separator).trim().toLowerCase();
                                parsedFrontmatter[key] = line.slice(separator + 1).trim();
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
        // 例如，如果 originalSlug 不在已發布文章目錄中，可能表示 URL 無效
                if (!articleConfig) {
             console.warn(`Invalid original slug derived: ${originalSlug} from URL slug: ${slugFromUrl}`);
             // 可以選擇設置錯誤狀態或導向 404
             setError(new Error(`Article not found for slug: ${slugFromUrl}`));
             setLoading(false);
        } else {
            fetchArticle();
        }
        // useEffect 的依賴項應包含 originalSlug 和 currentLang
    }, [originalSlug, currentLang, slugFromUrl, articleEdition, articleConfig]);

    if (renamedTo) {
        const renamedArticle = Object.values(articleByOriginalSlug).find(article => (
            article.locales.en.slug === renamedTo
        ));
        const targetSlug = renamedArticle?.locales[currentLang]?.slug || renamedTo;
        return <Navigate to={`/${currentLang}/articles/${encodeURIComponent(targetSlug)}/`} replace />;
    }

    if (articleEdition && expectedSlug !== slugFromUrl) {
        return <Navigate to={`/${currentLang}/articles/${encodeURIComponent(expectedSlug)}/`} replace />;
    }

    if (!articleEdition && currentLang !== 'en') {
        const englishSlug = articleConfig?.locales.en.slug || slugFromUrl;
        return <Navigate to={`/en/articles/${encodeURIComponent(englishSlug)}/`} replace />;
    }

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
                    {...imageDimensions[imageSrc]}
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
        return <PageContainer title={t('articleDetail.loadingTitle')} description={t('articleDetail.loadingDescription')} includeHreflang={false}><div>{t('common.loading')}</div></PageContainer>;
    }

    if (error) {
        return <PageContainer title={t('articleDetail.errorTitle')} description={t('articleDetail.errorDescription')} includeHreflang={false} robots="noindex, follow">
            <div>{t('articleDetail.errorText')}{error.message}</div>
        </PageContainer>;
    }

    if (!article) {
        return <PageContainer title={t('articleDetail.notFoundTitle')} description={t('articleDetail.notFoundDescription')} includeHreflang={false} robots="noindex, follow">
            <div>{t('articleDetail.notFoundText')}</div>
        </PageContainer>;
    }

    // 確保 PageContainer 的 og:url 使用當前 URL
    const pageOgUrl = typeof window !== 'undefined'
        ? canonicalUrl(window.location.pathname, SITE_ORIGIN)
        : '';

    return (
        <PageContainer
            title={meta.title || article.title}
            description={meta.description || ''}
            ogImage={socialImagePath('', currentLang, article.originalSlug.split('.')[0])}
            ogImageWidth={1200}
            ogImageHeight={630}
            ogType="article"
            jsonLd={{
                '@context': 'https://schema.org', '@type': 'Article',
                headline: article.title, description: meta.description, inLanguage: currentLang,
                datePublished: meta.date, dateModified: meta.updated || meta.date,
                url: pageOgUrl, mainEntityOfPage: pageOgUrl,
                image: new URL(socialImagePath('', currentLang, article.originalSlug.split('.')[0]), SITE_ORIGIN).href,
                author: { '@type': 'Organization', name: SITE_NAME },
                publisher: { '@type': 'Organization', name: SITE_NAME }
            }}
            // og:url 應反映當前頁面的實際 URL
            ogUrl={pageOgUrl}
            includeHreflang={false}
        >
            <div className="article-detail-page">
                <Helmet>
                    {meta.keywords && <meta name="keywords" content={meta.keywords} />}
                    {/* Only real editions in the shared article catalog are advertised. */}
                    {Object.entries(articleConfig.locales).map(([locale, edition]) => <link key={locale} rel="alternate" hrefLang={locale}
                        href={`${SITE_ORIGIN}/${locale}/articles/${encodeURIComponent(edition.slug)}/`} />)}
                    <link rel="alternate" hrefLang="x-default"
                        href={`${SITE_ORIGIN}/en/articles/${encodeURIComponent(articleConfig.locales.en.slug)}/`} />
                </Helmet>
                <div className="article-header">
                    <h1>{article.title}</h1>
                </div>
                <div className="article-content">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            img: ImageRenderer,
                            // 補充說明用小字。react-markdown 沒有開 rehype-raw，文章裡寫 <small>
                            // 會被原樣印出來，所以改成「註：」開頭的段落，在這裡套 class。
                            p: ({ node, children, ...props }) => {
                                const first = node?.children?.[0];
                                const text = first?.type === 'text' ? first.value : '';
                                const isNote = text.startsWith('註：') || text.startsWith('Note: ');
                                // 開頭的重點摘要：這一段當標頭，緊接的清單當內容，CSS 把兩者接成一塊。
                                const isSummary = text === '重點摘要' || text === 'In short';
                                const cls = isNote ? 'article-note' : isSummary ? 'article-summary' : undefined;
                                return <p className={cls} {...props}>{children}</p>;
                            },
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
                                                href={`${window.location.pathname}#${id}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const element = document.getElementById(id);
                                                    if (element) {
                                                        element.scrollIntoView({ behavior: 'smooth' });
                                                        window.history.pushState(null, '', `${window.location.pathname}#${id}`);
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
                                // 站內連結走 React Router，維持 SPA 導航並留在同一分頁。
                                // 原本一律 target="_blank" + 原生 <a>，會讓內部連結整頁重載又跳新分頁。
                                const internalPath = toInternalPath(props.href);
                                if (internalPath) {
                                    const { href, ...rest } = props;
                                    return <Link {...rest} to={internalPath} />;
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
