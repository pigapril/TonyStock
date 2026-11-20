#!/usr/bin/env node
// Asset authoring: NODE_PATH=<workspace runtime packages> node scripts/generate-social-images.js
// Committed PNGs are used at build time; production does not require sharp.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { DEFAULT_LOCALE, LOCALE_CODES, getLocaleConfig, getLocaleResourceChain } = require('../src/locales/localeConfig');
const { resolveRequiredKeyFromChain } = require('../src/locales/localeKeyResolution');
const ARTICLE_CATALOG = require('../src/config/articleCatalog');
const ROOT = path.resolve(__dirname, '..');
const heroSnapshot = require('../src/config/socialHeroSnapshot.json');
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const strings = Object.fromEntries(LOCALE_CODES.map(lang => [lang, require(`../src/locales/${lang}/translation.json`)]));
const readKey = (lang, key) => resolveRequiredKeyFromChain(
  lang, key, strings, getLocaleResourceChain
).value;

// Copy is sourced from existing page headings/subtitles, never rewritten for cards.
const pages = {
  home: ['home.hero.title', 'home.hero.subtitle', 'images/social/sources/home-2022-bear-low-{lang}.jpg'],
  priceanalysis: ['priceAnalysis.heading', 'priceAnalysis.subtitle', 'articles/1.用樂活五線譜分析價格趨勢與情緒/image-cover.png'],
  'sentiment-indicators': ['sentimentBoard.heading', 'sentimentBoard.pageDescription'],
  'market-sentiment': ['marketSentiment.pageTitle', 'marketSentiment.pageSubtitle', 'images/market-sentiment/sentiment-gauge-feature.png'],
  'tw-market-sentiment': ['marketSentiment.tw.pageTitle', 'marketSentiment.tw.pageSubtitle'],
  momentum: ['momentumDashboard.title', 'momentumDashboard.subtitle', 'articles/5.市場動能儀表板使用指南/image-cover.svg'],
  watchlist: ['watchlist.pageTitle', 'watchlist.pageSubtitle', 'images/watchlist-preview{locale}.png'],
  articles: ['articles.heading', 'articles.intro'],
  about: ['about.heading', 'about.pageDescription'],
  'sponsor-us': ['sponsorUs.heading', 'sponsorUs.pageDescription']
};
function frontmatter(source) {
  const fields = {};
  const block = source.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!block) throw new Error('Missing article metadata');
  for (const line of block[1].split('\n')) {
    const match = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (match) fields[match[1].toLowerCase()] = match[2];
  }
  return fields;
}

// Preserve words and punctuation; only introduce line breaks for the image layout.
function wrap(text, width, size) {
  const measure = (value) => [...value].reduce((sum, char) => sum +
    (/\s/.test(char) ? 0.3 : /[ilI.,'!:;|]/.test(char) ? 0.28 : /[A-ZMW]/.test(char) ? 0.68 : /[\x00-\x7f]/.test(char) ? 0.53 : 1), 0) * size;
  const lines = [];
  for (const paragraph of text.split(/\n/)) {
    const tokens = paragraph.match(/[\x21-\x7e]+\s*|[^\x21-\x7e]/gu) || [];
    let line = '';
    for (const token of tokens) {
      if (line.trim() && measure(line + token) > width) {
        lines.push(line.trim());
        line = '';
      }
      line += token;
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines;
}
function textMarkup(lines, x, y, size, color, weight = 400) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.3 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}

async function render(record, palette, logo) {
  const { name, lang, title, description = '', artwork, category = '', date = '' } = record;
  const width = name === 'home' && artwork ? 600 : artwork ? 650 : 1040;
  // Match Home's renderTitleWithBreaks for the existing full-width separator.
  const displayTitle = name === 'home' ? title.replace(/｜/g, '\n') : title;
  let titleSize = 54;
  let lines = wrap(displayTitle, width, titleSize);
  while (lines.length > 3 && titleSize > 40) lines = wrap(displayTitle, width, --titleSize);
  let descriptionSize = 27;
  let descriptionLines = wrap(description, width, descriptionSize);
  const titleY = category ? 234 : 220;
  const descriptionY = titleY + (lines.length - 1) * titleSize * 1.3 + 62;
  while (descriptionLines.length && descriptionY + (descriptionLines.length - 1) * descriptionSize * 1.3 > 505 && descriptionSize > 20) {
    descriptionLines = wrap(description, width, --descriptionSize);
  }
  if (descriptionLines.length && descriptionY + (descriptionLines.length - 1) * descriptionSize * 1.3 > 510) {
    throw new Error(`Copy does not fit without truncation: ${lang}/${name}`);
  }
  let graphic = '';
  if (artwork) {
    const input = sharp(path.join(ROOT, 'public', artwork));
    if (name === 'home') {
      // Retain the sharing-card layout; only the right-hand artwork uses the real hero.
      const crop = heroSnapshot.artworkCrop[lang];
      if (!crop) throw new Error(`Missing homepage hero crop for locale: ${lang}`);
      const image = await input.extract(crop).resize(420, 420, {
        fit: 'contain', background: palette.background
      }).png().toBuffer();
      graphic = `<image x="716" y="120" width="420" height="420" href="data:image/png;base64,${image.toString('base64')}"/>`;
    } else {
      const image = await input.resize(360, 280, {
        fit: 'contain', background: palette.card
      }).png().toBuffer();
      graphic = `<rect x="750" y="190" width="380" height="300" rx="14" fill="${palette.card}"/><image x="760" y="200" width="360" height="280" href="data:image/png;base64,${image.toString('base64')}"/>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="brand"><stop stop-color="${palette.primary}"/><stop offset="1" stop-color="${palette.secondary}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="${palette.background}"/>
  <rect width="1200" height="10" fill="url(#brand)"/>
  <image x="64" y="58" width="370" height="55" href="data:image/png;base64,${logo}"/>
  <g font-family="PingFang TC, Helvetica Neue, sans-serif">
  ${category ? textMarkup([category], 64, 172, 21, palette.primary, 600) : ''}
  ${textMarkup(lines, 64, titleY, titleSize, palette.ink, 600)}
  ${textMarkup(descriptionLines, 64, descriptionY, descriptionSize, palette.muted)}
  ${graphic}
  <path d="M64 546 H1136" stroke="${palette.border}"/>
  ${textMarkup(['sentimentinsideout.com'], 64, 590, 22, palette.primary)}
  ${date ? `<text x="1136" y="590" text-anchor="end" font-size="20" fill="${palette.muted}">${escape(date)}</text>` : ''}
  </g></svg>`;
  const file = path.join(ROOT, 'public/images/social', lang, `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(path.relative(ROOT, file));
}

(async () => {
  // Use the same asset as BrandLogo; a new logo is never drawn for sharing cards.
  const brandSource = fs.readFileSync(path.join(ROOT, 'src/components/Common/BrandLogo/BrandLogo.js'), 'utf8');
  const logoPath = brandSource.match(/BRAND_LOGO_SRC = '([^']+)'/)[1];
  const logo = fs.readFileSync(path.join(ROOT, 'public', logoPath)).toString('base64');
  const css = fs.readFileSync(path.join(ROOT, 'src/components/Common/global-styles.css'), 'utf8');
  const token = name => css.match(new RegExp(`${name}:\\s*([^;]+)`))?.[1].trim();
  const gradient = css.match(/--gradient-brand:\s*linear-gradient\([^;]+/)[0].match(/#[a-fA-F0-9]{6}/g);
  const palette = {
    background: token('--color-bg-page'), card: token('--color-bg-card'),
    primary: gradient[0], secondary: gradient[1], border: token('--color-border-divider'),
    ink: token('--color-text-primary'), muted: token('--color-text-secondary')
  };
  const dimensions = {};
  const records = [];
  for (const { originalSlug } of ARTICLE_CATALOG) {
    const dir = path.join(ROOT, 'public/articles', originalSlug);
    for (const file of fs.readdirSync(dir).filter(name => /\.(png|webp|jpg|svg)$/i.test(name))) {
      const { width, height } = await sharp(path.join(dir, file)).metadata();
      dimensions[`/articles/${originalSlug}/${file}`] = { width, height };
    }
  }
  fs.writeFileSync(path.join(ROOT, 'src/config/articleImageDimensions.json'), JSON.stringify(dimensions, null, 2) + '\n');
  for (const lang of LOCALE_CODES) {
    for (const [name, [titleKey, descriptionKey, asset]] of Object.entries(pages)) {
      // Only English and Traditional Chinese have localized in-product
      // artwork. Other locales use text-led cards rather than embedding
      // screenshots whose UI copy belongs to a different language.
      if (lang === 'zh-CN' && name === 'sponsor-us') continue;
      if (lang === 'ko-KR' && name === 'sponsor-us') continue;
      const useArtwork = lang === 'en' || lang === 'zh-TW';
      const artworkPath = useArtwork
        ? asset?.replace('{locale}', getLocaleConfig(lang)?.socialAssetSuffix ?? (lang === DEFAULT_LOCALE ? '-en' : `-${lang}`)).replace('{lang}', lang)
        : undefined;
      records.push({ name, lang, title: readKey(lang, titleKey), description: readKey(lang, descriptionKey),
        titleKey, descriptionKey,
        ...(name === 'home' && useArtwork && { captureUrl: `https://sentimentinsideout.com/${lang}/`, heroSnapshot }),
        ...(artworkPath && { artwork: artworkPath }) });
    }
  }
  // Only complete editions in the article catalog produce share cards. Build
  // therefore fails early if an advertised locale is missing its Markdown.
  for (const { id, originalSlug, locales } of ARTICLE_CATALOG) {
    for (const lang of LOCALE_CODES) {
      const edition = locales[lang];
      if (!edition) continue;
      const source = `articles/${originalSlug}/${edition.filename}`;
      const meta = frontmatter(fs.readFileSync(path.join(ROOT, 'public', source), 'utf8'));
      const useLocalizedArtwork = lang === 'en' || lang === 'zh-TW';
      records.push({ name: `article-${id}`, lang, title: meta.title,
        category: meta.category, date: meta.date, source,
        ...(useLocalizedArtwork && { artwork: `articles/${originalSlug}/image-cover.${originalSlug.startsWith('5.') ? 'svg' : 'png'}` }) });
    }
  }
  for (const record of records) await render(record, palette, logo);
  fs.writeFileSync(path.join(ROOT, 'public/images/social/manifest.json'), JSON.stringify({
    logo: logoPath, colorSource: 'src/components/Common/global-styles.css', palette, cards: records
  }, null, 2) + '\n');
})().catch(error => {console.error(error);process.exit(1);});
