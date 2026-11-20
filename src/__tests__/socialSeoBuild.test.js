import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(__dirname, '../..');
const origin = 'https://sentimentinsideout.com';
const articleCatalog = require('../config/articleCatalog');
let output;
const generate = () => {
  const env = { ...process.env, SEO_BUILD_DIR: output, SITE_ORIGIN: origin };
  execFileSync(process.execPath, ['scripts/add-ko-sitemap-locale.js'], { cwd: root, env, timeout: 30000 });
  execFileSync(process.execPath, ['scripts/generate-seo-shells.js'], { cwd: root, env, timeout: 30000 });
};
const meta = (html, name) => html.match(new RegExp(`(?:name|property)="${name}" content="([^"]+)"`))?.[1];

beforeAll(() => {
  output = fs.mkdtempSync(path.join(os.tmpdir(), 'sio-social-seo-'));
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><html lang="en"><head><title>Template</title><link rel="preload" as="image" href="/logo.avif" fetchpriority="high" type="image/avif" /></head><body><div id="root"></div></body></html>');
  generate();
}, 35000);
afterAll(() => fs.rmSync(output, { recursive: true, force: true }));

test('every indexable URL has usable PNG metadata in its first HTML response', () => {
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(urls.some(url => new URL(url).pathname.startsWith('/ko-KR/'))).toBe(true);
  expect(urls).not.toContain(`${origin}/en/sponsor-us/`);
  expect(urls).toContain(`${origin}/zh-TW/sponsor-us/`);
  for (const block of sitemap.match(/<url>[\s\S]*?<\/url>/g) || []) {
    for (const alternate of block.matchAll(/hreflang="(en|zh-TW|zh-CN|ko-KR)"\s+href="([^"]+)"/g)) {
      expect(urls).toContain(alternate[2]);
    }
  }
  const articleUrls = urls.filter(url => /^\/(?:en|zh-TW|zh-CN|ko-KR)\/articles\/[^/]+\/?$/.test(new URL(url).pathname));
  expect(articleUrls).toHaveLength(16);
  for (const locale of ['en', 'zh-TW', 'zh-CN', 'ko-KR']) {
    expect(articleUrls.filter(url => new URL(url).pathname.startsWith(`/${locale}/`))).toHaveLength(4);
  }
  for (const url of urls) {
    const shellPath = path.join(output, decodeURIComponent(new URL(url).pathname), 'index.html');
    expect(fs.existsSync(shellPath)).toBe(true);
    const html = fs.readFileSync(shellPath, 'utf8');
    const image = meta(html, 'og:image');
    expect(image).toMatch(/^https:\/\/sentimentinsideout\.com\/images\/social\/(en|zh-TW|zh-CN|ko-KR)\/[^/]+\.png$/);
    expect(meta(html, 'twitter:image')).toBe(image);
    expect(meta(html, 'og:url')).toBe(url);
    expect(meta(html, 'og:type')).toMatch(/^(website|article)$/);
    expect(meta(html, 'og:image:alt')).toBeTruthy();
    const bytes = fs.readFileSync(path.join(root, 'public', new URL(image).pathname));
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
  }
});

test('localized HTML shells use matching install metadata and English article charts', () => {
  for (const lang of ['en', 'zh-TW', 'zh-CN', 'ko-KR']) {
    const html = fs.readFileSync(path.join(output, lang, 'index.html'), 'utf8');
    expect(html).toContain(`rel="manifest" href="/manifest.${lang}.json"`);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', `manifest.${lang}.json`), 'utf8'));
    expect(manifest.lang).toBe(lang);
    expect(manifest.start_url).toBe(`/${lang}/`);
    expect(manifest.id).toBe('/');
    if (lang === 'en') expect(manifest.description).not.toMatch(/[\u3400-\u9fff]/);
  }
  const localizedHome = fs.readFileSync(path.join(output, 'zh-TW/index.html'), 'utf8');
  expect(localizedHome).toContain(`hreflang="x-default" href="${origin}/"`);
  const rootHome = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  expect(rootHome).toContain(`hreflang="x-default" href="${origin}/"`);
  expect(rootHome).toContain('rel="preload" as="image" href="/home-hero-sio.svg" fetchpriority="high" type="image/svg+xml"');
  const translatedPriceAnalysis = fs.readFileSync(path.join(output, 'zh-TW/priceanalysis/index.html'), 'utf8');
  expect(translatedPriceAnalysis).toContain(`hreflang="x-default" href="${origin}/en/priceanalysis/`);
  expect(translatedPriceAnalysis).toContain('rel="preload" as="image" href="/logo.avif" fetchpriority="high" type="image/avif"');
  expect(translatedPriceAnalysis).not.toContain('/home-hero-sio.svg');
  for (const lang of ['en', 'zh-TW', 'zh-CN', 'ko-KR']) {
    const homepage = fs.readFileSync(path.join(output, lang, 'index.html'), 'utf8');
    const priceAnalysis = fs.readFileSync(path.join(output, lang, 'priceanalysis/index.html'), 'utf8');
    expect(homepage).toContain('rel="preload" as="image" href="/home-hero-sio.svg" fetchpriority="high" type="image/svg+xml"');
    expect(priceAnalysis).toContain('rel="preload" as="image" href="/logo.avif" fetchpriority="high" type="image/avif"');
    expect(priceAnalysis).not.toContain('/home-hero-sio.svg');
  }
  const article = fs.readFileSync(path.join(output, 'en/articles/lohas-five-line-analysis-tested-on-11-6-million-daily-bars/index.html'), 'utf8');
  for (const n of [1, 2, 3, 4]) expect(article).toContain(`image${n}-en.png`);
  expect(article).not.toMatch(/image[1-4]\.png/);
});

test('all localized SEO shells append the site name only once', () => {
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

  for (const url of urls) {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const shellPath = path.join(output, pathname, 'index.html');
    const html = fs.readFileSync(shellPath, 'utf8');
    const title = html.match(/<title data-rh="true">([^<]+)<\/title>/)?.[1] || '';
    const brandCount = (title.match(/Sentiment Inside Out/g) || []).length;

    expect(title).toBeTruthy();
    expect(brandCount).toBe(1);
    expect(title).not.toMatch(/\s-\s(?:Market Sentiment Analysis|市場情緒分析|市场情绪分析|시장 심리 분석)$/);
  }
});

test('all Korean sitemap descriptions stay within Naver’s recommended 80 characters', () => {
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => match[1])
    .filter(url => new URL(url).pathname.startsWith('/ko-KR/'));

  expect(urls).toHaveLength(37);
  const descriptions = urls.map(url => {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const html = fs.readFileSync(path.join(output, pathname, 'index.html'), 'utf8');
    const description = meta(html, 'description');
    expect(description).toBeTruthy();
    expect(Array.from(description).length).toBeLessThanOrEqual(80);
    return description;
  });

  expect(new Set(descriptions).size).toBe(descriptions.length);
});

test('each active article has localized static content and four reciprocal hreflang targets', () => {
  for (const article of articleCatalog) {
    const editions = Object.entries(article.locales);
    expect(editions).toHaveLength(4);
    for (const [locale, edition] of editions) {
      const shellPath = path.join(output, locale, 'articles', edition.slug, 'index.html');
      expect(fs.existsSync(shellPath)).toBe(true);
      const html = fs.readFileSync(shellPath, 'utf8');
      expect(html).toContain('<article class=\"article-detail-page\" data-seo-article=\"true\">');
      expect(html).toContain(`inLanguage\":\"${locale}\"`);
      expect(html).toContain(`hreflang=\"${locale}\"`);
      for (const [alternateLocale, alternateEdition] of editions) {
        expect(html).toContain(`hreflang=\"${alternateLocale}\"`);
        expect(html).toContain(`/${alternateLocale}/articles/${encodeURIComponent(alternateEdition.slug)}/`);
      }
    }
  }
});

test('articles contain readable text, crawlable links and translated metadata without JavaScript', () => {
  const html = fs.readFileSync(path.join(output, 'en/articles/analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis/index.html'), 'utf8');
  expect(html).toContain('data-seo-article="true"');
  expect(html).toMatch(/<h1>Analyzing Price Trends/);
  expect(html).toMatch(/<a href=/);
  expect(html).toMatch(/<img src="\/articles\//);
  expect(html).toMatch(/<img[^>]+width="\d+"[^>]+height="\d+"/);
  expect(meta(html, 'og:type')).toBe('article');
  expect(html).toContain('hreflang="zh-TW"');
  expect(html).toContain('"@type":"Article"');
  expect(html).toContain('"mainEntityOfPage":"https://sentimentinsideout.com/en/articles/');
});

test('repeated generation does not duplicate social metadata or article schemas', () => {
  generate();
  for (const file of ['index.html', 'en/articles/market-momentum-dashboard-guide/index.html']) {
    const html = fs.readFileSync(path.join(output, file), 'utf8');
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html.match(/name="twitter:image"/g)).toHaveLength(1);
    if (file.includes('articles')) expect(html.match(/"@type":"Article"/g)).toHaveLength(1);
  }
});

test('unknown URLs use a noindex 404 while interactive entry points retain their SPA rules', () => {
  const config = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  const redirects = fs.readFileSync(path.join(root, 'public/_redirects'), 'utf8');
  const notFound = fs.readFileSync(path.join(output, '404.html'), 'utf8');
  expect(config).toMatch(/from = "\/\*"\s+to = "\/404.html"\s+status = 404/);
  expect(notFound).toContain('name="robots" content="noindex, follow"');
  expect(notFound).toContain('<html lang="en">');
  expect(notFound).toContain('<h1>Page not found</h1>');
  expect(notFound).not.toMatch(/[\u3400-\u9fff\uac00-\ud7af]/);
  expect(redirects).toContain('/:locale/user-account/ /__spa__.html 200');
  expect(redirects).toContain('/:locale/watchlist /__spa__.html 200');
  expect(redirects).toContain('/:locale/watchlist/ /__spa__.html 200');
  expect(redirects).toContain('/:locale/payment/* /__spa__.html 200');
  const spaFallback = fs.readFileSync(path.join(output, '__spa__.html'), 'utf8');
  expect(spaFallback).toContain('name="robots" content="noindex, follow"');
  expect(spaFallback).toContain('data-rh="true" name="robots"');
  expect(fs.existsSync(path.join(output, 'ko-KR/watchlist/index.html'))).toBe(false);
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
  expect(sitemap).not.toMatch(/<loc>[^<]*\/(?:en|zh-TW|zh-CN|ko-KR)\/watchlist\//);
  expect(redirects).not.toMatch(/^\/(en|zh-TW)\/.*\/__spa\.html 200/m);
  expect(redirects).not.toMatch(/^\/:locale\/\* .*200/m);
});


test('sharing cards use the official logo, site palette and unmodified source copy', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/images/social/manifest.json'), 'utf8'));
  const brand = fs.readFileSync(path.join(root, 'src/components/Common/BrandLogo/BrandLogo.js'), 'utf8');
  expect(brand).toContain(`BRAND_LOGO_SRC = '${manifest.logo}'`);
  expect(fs.existsSync(path.join(root, 'public', manifest.logo))).toBe(true);
  const css = fs.readFileSync(path.join(root, manifest.colorSource), 'utf8');
  expect(css).toContain(manifest.palette.primary);
  expect(css).toContain(manifest.palette.secondary);
  expect(manifest.cards).toHaveLength(54);
  expect(manifest.cards.filter(card => String(card.name).startsWith('article-'))).toHaveLength(16);
  for (const card of manifest.cards) {
    if (card.source) {
      const article = fs.readFileSync(path.join(root, 'public', card.source), 'utf8');
      expect(card.title).toBe(article.match(/^title: (.+)$/m)[1]);
      expect(card.category).toBe(article.match(/^category: (.+)$/m)[1]);
      expect(card.date).toBe(article.match(/^date: (.+)$/m)[1]);
    } else {
      const copy = JSON.parse(fs.readFileSync(path.join(root, `src/locales/${card.lang}/translation.json`), 'utf8'));
      const get = key => key.split('.').reduce((node, part) => node[part], copy);
      expect(card.title).toBe(get(card.titleKey));
      expect(card.description).toBe(get(card.descriptionKey));
    }
    if (card.artwork) expect(fs.existsSync(path.join(root, 'public', card.artwork))).toBe(true);
  }
});


test('homepage sharing images use the real hero at the selected 2022 bear-market low', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/images/social/manifest.json'), 'utf8'));
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'src/config/socialHeroSnapshot.json'), 'utf8'));
  const homeCards = manifest.cards.filter(card => card.name === 'home');
  expect(homeCards).toHaveLength(4);
  expect(snapshot.eventId).toBe('inflationBearLow');
  expect(snapshot.date).toBe('2022-10-03T00:00:00.000Z');
  expect(Math.round(snapshot.score)).toBe(4);
  expect(snapshot.sentimentKey).toBe('sentiment.extremeFear');
  for (const card of homeCards) {
    if (card.lang === 'zh-CN' || card.lang === 'ko-KR') {
      expect(card.title).toBeTruthy();
      expect(card.description).toBeTruthy();
      expect(card.artwork).toBeUndefined();
      expect(card.captureUrl).toBeUndefined();
      continue;
    }
    expect(card.heroSnapshot).toEqual(snapshot);
    expect(card.captureUrl).toBe(`https://sentimentinsideout.com/${card.lang}/`);
    expect(card.artwork).toBe(`images/social/sources/home-2022-bear-low-${card.lang}.jpg`);
    const bytes = fs.readFileSync(path.join(root, 'public', card.artwork));
    expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
    const copy = JSON.parse(fs.readFileSync(path.join(root, `src/locales/${card.lang}/translation.json`), 'utf8'));
    const get = key => key.split('.').reduce((node, part) => node[part], copy);
    expect(get(snapshot.titleKey)).toBeTruthy();
    expect(get(snapshot.descriptionKey)).toBeTruthy();
    expect(get(snapshot.sentimentKey)).toBeTruthy();
  }
});
