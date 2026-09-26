import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(__dirname, '../../public');
const origin = 'https://sentimentinsideout.com';

describe('SEO URL contracts', () => {
  const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
  const redirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  it('advertises only final, canonical URLs for the two distinct locales', () => {
    expect(locs).toHaveLength(40);
    expect(locs.every((url) => url.startsWith(`${origin}/en/`) || url.startsWith(`${origin}/zh-TW/`)))
      .toBe(true);
    expect(locs.every((url) => url.endsWith('/'))).toBe(true);
    expect(sitemap).not.toMatch(/hreflang="zh"|https:\/\/sentimentinsideout\.com\/zh\//);
    expect(redirects).toContain('/zh/* /zh-TW/:splat 301!');
  });

  it('links indicator language alternates to URLs in the sitemap', () => {
    const indicatorBlocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)]
      .map(([block]) => block)
      .filter((block) => /<loc>[^<]*\/sentiment-indicators\/[^<]+<\/loc>/.test(block));
    expect(indicatorBlocks).toHaveLength(16);
    const canonical = new Set(locs);

    for (const block of indicatorBlocks) {
      for (const lang of ['en', 'zh-TW']) {
        const alternate = block.match(new RegExp(`hreflang="${lang}"\\s+href="([^"]+)"`));
        expect(alternate).not.toBeNull();
        expect(canonical.has(alternate[1])).toBe(true);
      }
    }
  });

  it('redirects wrong-language article slugs directly to published pages', () => {
    const canonical = new Set(locs);
    const articleRules = redirects.split('\n')
      .filter((line) => /^\/(?:en|zh-TW|zh)\/articles\//.test(line));
    expect(articleRules).toHaveLength(16);

    for (const rule of articleRules) {
      const [from, to, status] = rule.split(/\s+/);
      expect(status).toBe('301!');
      expect(from).not.toBe(to);
      expect(canonical.has(`${origin}${to}`)).toBe(true);
    }
  });
});
