import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(__dirname, '../../public');
const origin = 'https://sentimentinsideout.com';

describe('SEO URL contracts', () => {
  const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const redirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  it('advertises only final, canonical URLs for the four distinct UI locales', () => {
    expect(locs).toHaveLength(85);
    expect(locs.every((url) => ['en', 'zh-TW', 'zh-CN', 'ko-KR'].some(locale => url.startsWith(`${origin}/${locale}/`))))
      .toBe(true);
    expect(locs.every((url) => url.endsWith('/'))).toBe(true);
    expect(sitemap).not.toMatch(/hreflang="zh"|https:\/\/sentimentinsideout\.com\/zh\//);
    expect(locs).not.toContain(`${origin}/en/sponsor-us/`);
    expect(locs).toContain(`${origin}/zh-TW/sponsor-us/`);
    expect(locs.some(url => /\/(?:en|zh-TW|zh-CN|ko-KR)\/watchlist\/$/.test(url))).toBe(false);
    const homeBlocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)]
      .map(([block]) => block)
      .filter(block => /<loc>https:\/\/sentimentinsideout\.com\/(?:en|zh-TW|zh-CN|ko-KR)\/<\/loc>/.test(block));
    expect(homeBlocks).toHaveLength(4);
    homeBlocks.forEach(block => {
      expect(block).toContain(`hreflang="x-default" href="${origin}/"`);
    });
    const sponsor = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)]
      .map(([block]) => block)
      .find(block => block.includes(`<loc>${origin}/zh-TW/sponsor-us/</loc>`));
    expect(sponsor).toContain(`hreflang="zh-TW" href="${origin}/zh-TW/sponsor-us/"`);
    expect(sponsor).toContain(`hreflang="x-default" href="${origin}/zh-TW/sponsor-us/"`);
    expect(sponsor).not.toContain('hreflang="en"');
    expect(redirects).toContain('/zh/* /zh-TW/:splat 301!');
    expect(redirects).toContain('/:locale/watchlist /__spa__.html 200');
    expect(redirects).toContain('/:locale/watchlist/ /__spa__.html 200');
  });

  it('links indicator language alternates to URLs in the sitemap', () => {
    const indicatorBlocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)]
      .map(([block]) => block)
      .filter((block) => /<loc>[^<]*\/sentiment-indicators\/[^<]+<\/loc>/.test(block));
    expect(indicatorBlocks).toHaveLength(32);
    const canonical = new Set(locs);

    for (const block of indicatorBlocks) {
      for (const lang of ['en', 'zh-TW', 'zh-CN', 'ko-KR']) {
        const alternate = block.match(new RegExp(`hreflang="${lang}"\\s+href="([^"]+)"`));
        expect(alternate).not.toBeNull();
        expect(canonical.has(alternate[1])).toBe(true);
      }
    }
  });

  it('redirects wrong-language article slugs directly to published pages', () => {
    const canonical = new Set(locs);
    const articleRules = redirects.split('\n')
      .filter((line) => /^\/(?:en|zh-TW|zh)\/articles\//.test(line) && line.endsWith('301!'));
    expect(articleRules).toHaveLength(26);

    for (const rule of articleRules) {
      const [from, to, status] = rule.split(/\s+/);
      expect(status).toBe('301!');
      expect(from).not.toBe(to);
      expect(canonical.has(`${origin}${to}`)).toBe(true);
    }
  });

  it('publishes each active article in all four locales with reciprocal alternates', () => {
    const articleBlocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)]
      .map(([block]) => block)
      .filter((block) => /<loc>[^<]*\/articles\/[^/<]+\/?<\/loc>/.test(block));
    expect(articleBlocks).toHaveLength(16);

    const canonical = new Set(locs);
    for (const block of articleBlocks) {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
      expect(loc).toBeTruthy();
      for (const lang of ['en', 'zh-TW', 'zh-CN', 'ko-KR']) {
        const alternate = block.match(new RegExp(`hreflang="${lang}"\\s+href="([^"]+)"`));
        expect(alternate).not.toBeNull();
        expect(canonical.has(alternate[1])).toBe(true);
      }
      expect(block).toContain('hreflang="x-default"');
    }
  });

  it('uses the 11.56-million sample size in the Traditional Chinese public article slug', () => {
    const expected = `${origin}/zh-TW/articles/${encodeURIComponent('4.樂活五線譜1156萬筆台美股資料實測結果分析')}/`;
    expect(locs).toContain(expected);
    expect(locs).not.toContain(`${origin}/zh-TW/articles/${encodeURIComponent('4.樂活五線譜1155萬筆台美股資料實測結果分析')}/`);
    expect(redirects).toContain(`/zh-TW/articles/${encodeURIComponent('4.樂活五線譜1155萬筆台美股資料實測結果分析')} ${new URL(expected).pathname} 301!`);
  });
});
