export const getArticleInfoFromSlug = (slug) => {
    // 從 slug 中提取標題
    // 例如：'1.運用樂活五線譜分析價格趨勢與情緒' -> '運用樂活五線譜分析價格趨勢與情緒'
    const title = slug.replace(/^\d+\./, '').replace(/-/g, ' ');
    return {
        title,
        slug
    };
};

// **新增：定義 Slug 映射**
// 將原始 slug (資料夾名稱) 映射到其對應的英文 slug 和英文檔名
const articleMappings = {
    '1.用樂活五線譜分析價格趨勢與情緒': {
        enSlug: 'analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis', // 您的英文 URL Slug
        enFilename: 'Analyzing Price Trends and Sentiment with LOHAS Five-Line Analysis.en.ini.md'
    },
    '2.用市場情緒綜合指數判斷買賣時機': {
        enSlug: 'using-market-sentiment-composite-index-to-time-buys-and-sells', // 您的英文 URL Slug
        enFilename: 'using-market-sentiment-composite-index-to-time-buys-and-sells.en.ini.md'
    },
    '3.Netflix 併購華納全解析：如何利用「預期差」與「倒金字塔」策略獲利': {
        enSlug: 'netflix-acquires-warner-capitalizing-on-expectation-gap-strategy',
        enFilename: 'Netflix Acquires Warner Capitalizing on Expectation Gap Strategy.en.ini.md'
    }
    // 未來新增的文章也加在這裡
};

// 獲取所有原始 slugs (資料夾名稱)
const originalArticleSlugs = Object.keys(articleMappings);

export const getAllArticles = async (lang) => {
    // 讀取每篇文章的內容
    const articles = await Promise.all(originalArticleSlugs.map(async (originalSlug, index) => {
        const mapping = articleMappings[originalSlug];
        let displaySlug = originalSlug; // 預設使用原始 slug
        let fileName;

        // 根據語言決定要顯示的 slug 和檔案名稱
        if (lang === 'en' && mapping?.enSlug && mapping?.enFilename) {
            displaySlug = mapping.enSlug; // 英文模式下使用英文 slug
            fileName = mapping.enFilename;
        } else {
            // 中文或其他語言，使用原始 slug 和對應語言的檔名
            const articleName = originalSlug.replace(/^\d+\./, '');
            fileName = `${articleName}.${lang}.ini.md`;
        }

        const filePath = `/articles/${originalSlug}/${fileName}`; // **注意：路徑仍用 originalSlug**

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn(`Article content not found for lang '${lang}': ${filePath}`);
                // 即使內容找不到，也嘗試回傳基本資訊，使用正確的 displaySlug
                return {
                    id: index + 1,
                    slug: displaySlug, // **使用 displaySlug**
                    originalSlug: originalSlug, // 保留原始 slug 供內部使用
                    title: getArticleInfoFromSlug(originalSlug).title, // 初始標題
                    content: '',
                    date: '',
                    category: '',
                    lang: lang
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
                lang: lang
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
                lang: lang
            };
        }
    }));

    return articles;
}; 