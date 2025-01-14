export const getArticleInfoFromSlug = (slug) => {
    // 從 slug 中提取標題
    // 例如：'1.運用樂活五線譜分析價格趨勢與情緒' -> '運用樂活五線譜分析價格趨勢與情緒'
    const title = slug.replace(/^\d+\./, '').replace(/-/g, ' ');
    return {
        title,
        slug
    };
};

export const getAllArticles = async () => {
    const articleSlugs = [
        '1.用樂活五線譜分析價格趨勢與情緒',
        '2.用市場情緒綜合指數判斷買賣時機'
    ];

    // 讀取每篇文章的內容
    const articles = await Promise.all(articleSlugs.map(async (slug, index) => {
        const articleName = slug.replace(/^\d+\./, '');
        try {
            const response = await fetch(`/articles/${slug}/${articleName}.ini.md`);
            const content = await response.text();
            const dateMatch = content.match(/文章發佈時間：(\d{4})\/(\d{1,2})\/(\d{1,2})\s*$/m);
            const categoryMatch = content.match(/文章分類：(.+)$/m);
            
            return {
                id: index + 1,
                ...getArticleInfoFromSlug(slug),
                content,
                date: dateMatch ? `${dateMatch[1]} 年 ${dateMatch[2]} 月 ${dateMatch[3]} 日` : '',
                category: categoryMatch ? categoryMatch[1] : ''  // 如果沒有分類，預設空白
            };
        } catch (error) {
            console.error(`Error loading article ${slug}:`, error);
            return {
                id: index + 1,
                ...getArticleInfoFromSlug(slug),
                content: '',
                date: '',
                category: ''
            };
        }
    }));

    return articles;
}; 