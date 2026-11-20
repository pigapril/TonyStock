import articleCatalog from '../config/articleCatalog';

export const getArticleInfoFromSlug = (slug) => {
    // 從 slug 中提取標題
    // 例如：'1.運用樂活五線譜分析價格趨勢與情緒' -> '運用樂活五線譜分析價格趨勢與情緒'
    const title = slug.replace(/^\d+\./, '').replace(/-/g, ' ');
    return {
        title,
        slug
    };
};

// The catalog is the single source of truth for available article editions,
// localized public slugs and Markdown filenames.

export const getAllArticles = async (lang) => {
    const contentLocale = articleCatalog.every(article => article.locales[lang]) ? lang : 'en';
    const articles = await Promise.all(articleCatalog.map(async ({ originalSlug, locales }, index) => {
        const edition = locales[contentLocale];
        const displaySlug = edition.slug;
        const fileName = edition.filename;

        const filePath = `/articles/${originalSlug}/${fileName}`; // **注意：路徑仍用 originalSlug**

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn(`Article content not found for lang '${contentLocale}': ${filePath}`);
                // 即使內容找不到，也嘗試回傳基本資訊，使用正確的 displaySlug
                return {
                    id: index + 1,
                    slug: displaySlug, // **使用 displaySlug**
                    originalSlug: originalSlug, // 保留原始 slug 供內部使用
                    title: getArticleInfoFromSlug(originalSlug).title, // 初始標題
                    content: '',
                    date: '',
                    category: '',
                    lang: contentLocale
                };
            }

            const content = await response.text();
            const frontmatterRegex = /^---([\s\S]+?)---/;
            const frontmatterMatch = content.match(frontmatterRegex);
            let title = getArticleInfoFromSlug(originalSlug).title; // 預設標題
            let category = '';
            let date = '';

            if (frontmatterMatch) {
                try {
                    const yamlLines = frontmatterMatch[1].trim().split('\n');
                    yamlLines.forEach(line => {
                        const parts = line.split(':').map(p => p.trim());
                        if (parts.length >= 2) {
                            const key = parts[0].toLowerCase();
                            const value = parts.slice(1).join(':').trim();
                            if (key === 'title') title = value;
                            if (key === 'category') category = value;
                            if (key === 'date') date = value;
                        }
                    });
                } catch (e) {
                    console.error(`Error parsing frontmatter for ${originalSlug} (${lang}):`, e);
                }
            }

            return {
                id: index + 1,
                slug: displaySlug, // **使用 displaySlug** (用於連結)
                originalSlug: originalSlug, // 保留原始 slug (用於圖片等)
                title: title,
                content: content,
                date: date,
                category: category,
                    lang: contentLocale
            };
        } catch (error) {
            console.error(`Error loading article ${originalSlug} for lang ${lang}:`, error);
            return {
                id: index + 1,
                slug: displaySlug, // **使用 displaySlug**
                originalSlug: originalSlug,
                title: getArticleInfoFromSlug(originalSlug).title,
                content: '',
                date: '',
                category: '',
                    // Even when the fetch fails, keep the actual content
                    // fallback locale. Do not let an unsupported app locale
                    // (such as an unapproved ko-KR) leak into article SEO or
                    // hreflang metadata.
                    lang: contentLocale
            };
        }
    }));

    return articles;
};
