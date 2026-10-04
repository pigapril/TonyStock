import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(__dirname, '../..');
const origin = 'https://sentimentinsideout.com';
let output;
const generate = () => execFileSync(process.execPath, ['scripts/generate-seo-shells.js'], {
  cwd: root, env: { ...process.env, SEO_BUILD_DIR: output, SITE_ORIGIN: origin }, timeout: 30000
});
const meta = (html, name) => html.match(new RegExp(`(?:name|property)="${name}" content="([^"]+)"`))?.[1];

beforeAll(() => {
  output = fs.mkdtempSync(path.join(os.tmpdir(), 'sio-social-seo-'));
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><html lang="en"><head><title>Template</title></head><body><div id="root"></div></body></html>');
  generate();
}, 35000);
afterAll(() => fs.rmSync(output, { recursive: true, force: true }));

test('every indexable URL has usable PNG metadata in its first HTML response', () => {
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(urls).toHaveLength(46);
  for (const url of urls) {
    const html = fs.readFileSync(path.join(output, decodeURIComponent(new URL(url).pathname), 'index.html'), 'utf8');
    const image = meta(html, 'og:image');
    expect(image).toMatch(/^https:\/\/sentimentinsideout\.com\/images\/social\/(en|zh-TW)\/[^/]+\.png$/);
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
  expect(redirects).toContain('/en/user-account/ /__spa__.html 200');
  expect(redirects).toContain('/zh-TW/payment/* /__spa__.html 200');
  expect(redirects).not.toMatch(/^\/(en|zh-TW)\/\* .*200/m);
});


test('sharing cards use the official logo, site palette and unmodified source copy', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/images/social/manifest.json'), 'utf8'));
  const brand = fs.readFileSync(path.join(root, 'src/components/Common/BrandLogo/BrandLogo.js'), 'utf8');
  expect(brand).toContain(`BRAND_LOGO_SRC = '${manifest.logo}'`);
  expect(fs.existsSync(path.join(root, 'public', manifest.logo))).toBe(true);
  const css = fs.readFileSync(path.join(root, manifest.colorSource), 'utf8');
  expect(css).toContain(manifest.palette.primary);
  expect(css).toContain(manifest.palette.secondary);
  expect(manifest.cards).toHaveLength(28);
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
  expect(homeCards).toHaveLength(2);
  expect(snapshot.eventId).toBe('inflationBearLow');
  expect(snapshot.date).toBe('2022-10-03T00:00:00.000Z');
  expect(Math.round(snapshot.score)).toBe(4);
  expect(snapshot.sentimentKey).toBe('sentiment.extremeFear');
  for (const card of homeCards) {
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
