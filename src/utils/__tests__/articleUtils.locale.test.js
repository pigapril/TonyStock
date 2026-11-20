import { getAllArticles } from '../articleUtils';
import articleCatalog from '../../config/articleCatalog';

describe('localized article catalog and content loading', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each(['en', 'zh-TW', 'zh-CN', 'ko-KR'])(
    'loads all four active articles from the real %s Markdown editions', async (locale) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => `---\ntitle: ${locale} article\ncategory: Guide\ndate: 2026-01-01\n---\n${locale} body`,
      });

      const articles = await getAllArticles(locale);

      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect(articles).toHaveLength(4);
      expect(articles.every(article => article.lang === locale)).toBe(true);
      expect(articles.every(article => article.content.includes(`${locale} body`))).toBe(true);
      expect(articles.map(article => article.slug)).toEqual(
        articleCatalog.map(article => article.locales[locale].slug)
      );
      articleCatalog.forEach((article, index) => {
        expect(global.fetch.mock.calls[index][0]).toBe(
          `/articles/${article.originalSlug}/${article.locales[locale].filename}`
        );
      });
    }
  );

  it('uses English as the explicit fallback for unsupported application locales', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '---\ntitle: English article\ncategory: Guide\ndate: 2026-01-01\n---\nEnglish body',
    });

    const articles = await getAllArticles('fr-FR');

    expect(articles).toHaveLength(4);
    expect(articles.every(article => article.lang === 'en')).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toContain('.en.ini.md');
  });

  it('keeps the declared source language when article retrieval fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const articles = await getAllArticles('ko-KR');

    expect(articles).toHaveLength(4);
    expect(articles.every(article => article.lang === 'ko-KR')).toBe(true);
    expect(articles.every(article => article.content === '')).toBe(true);
  });

  it('keeps the intentionally delisted Netflix article out of the active catalog', () => {
    expect(articleCatalog.map(article => article.id)).toEqual(['1', '2', '4', '5']);
    expect(articleCatalog.some(article => article.originalSlug.startsWith('3.'))).toBe(false);
  });
});
