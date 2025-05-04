export const getArticleInfoFromSlug = (slug) => {
    // 從 slug 中提取標題
    // 例如：'1.運用樂活五線譜分析價格趨勢與情緒' -> '運用樂活五線譜分析價格趨勢與情緒'
    const title = slug.replace(/^\d+\./, '').replace(/-/g, ' ');
    return {
        title,
        slug
    };
};

export const getAllArticles = async (lang) => {
    const articleSlugs = [
        '1.用樂活五線譜分析價格趨勢與情緒',
        '2.用市場情緒綜合指數判斷買賣時機'
        // 未來新增的文章 slug 也放這裡
    ];

    // 讀取每篇文章的內容
    const articles = await Promise.all(articleSlugs.map(async (slug, index) => {
        const articleName = slug.replace(/^\d+\./, '');
        // 根據語言代碼拼接檔案名稱
        const fileName = `${articleName}.${lang}.ini.md`;
        const filePath = `/articles/${slug}/${fileName}`;

        try {
            const response = await fetch(filePath);
            // 如果找不到特定語言檔案，可以考慮回退到預設語言或拋出錯誤
            if (!response.ok) {
                // 簡單處理：如果找不到，返回空內容
                console.warn(`Article not found for lang '${lang}': ${filePath}`);
                 return {
                    id: index + 1,
                    ...getArticleInfoFromSlug(slug),
                    content: '',
                    date: '',
                    category: '',
                    lang: lang // 可以加上語言標記
                };
                // 或者拋出錯誤: throw new Error(`Article not found: ${filePath}`);
            }

            const content = await response.text();
            // 從內容中解析 frontmatter (如果需要列表頁顯示的話)
            const frontmatterRegex = /^---([\s\S]+?)---/;
            const frontmatterMatch = content.match(frontmatterRegex);
            let title = getArticleInfoFromSlug(slug).title; // 預設標題
            let category = '';
            let date = ''; // 初始化日期

            if (frontmatterMatch) {
                 try {
                    const yamlLines = frontmatterMatch[1].trim().split('\n');
                    yamlLines.forEach(line => {
                        const parts = line.split(':').map(p => p.trim());
                        if (parts.length >= 2) { // 允許多個冒號，取第一個之前和之後的部分
                            const key = parts[0].toLowerCase(); // key 轉小寫
                            const value = parts.slice(1).join(':').trim(); // 處理值中可能包含冒號的情況
                            if (key === 'title') title = value;
                            if (key === 'category') category = value;
                            if (key === 'date') date = value; // 直接從 frontmatter 讀取 date
                        }
                    });
                } catch (e) {
                    console.error(`Error parsing frontmatter for ${slug} (${lang}):`, e);
                }
            }

            // 移除備用的中文正則表達式解析，因為我們現在強制使用 frontmatter
            // const dateMatch = content.match(/文章發佈時間：(\d{4})\/(\d{1,2})\/(\d{1,2})\s*$/m);
            // const categoryMatch = content.match(/文章分類：(.+)$/m);
            // if (!date && dateMatch) {
            //      date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`; // 格式化為 YYYY-MM-DD
            // }
            //  if (!category && categoryMatch) {
            //      category = categoryMatch[1];
            //  }


            return {
                id: index + 1,
                slug: slug,
                title: title,
                content: content, // 列表頁可能不需要完整內容，但先保留
                date: date, // 使用從 frontmatter 解析的日期
                category: category,
                lang: lang // 可以加上語言標記
            };
        } catch (error) {
            console.error(`Error loading article ${slug} for lang ${lang}:`, error);
            return {
                id: index + 1,
                ...getArticleInfoFromSlug(slug),
                content: '',
                date: '',
                category: '',
                lang: lang
            };
        }
    }));

    // 過濾掉讀取失敗的文章 (如果上面選擇返回 null 的話)
    // return articles.filter(article => article !== null);
    return articles;
}; 