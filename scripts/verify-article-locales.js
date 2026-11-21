#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ARTICLE_CATALOG = require('../src/config/articleCatalog');
const { LOCALE_CODES } = require('../src/locales/localeConfig');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_ARTICLE_IDS = ['1', '2', '4', '5'];
const REQUIRED_LOCALES = ['en', 'zh-TW', 'zh-HK', 'zh-CN', 'ko-KR'];
const LOCALE_PATTERN = LOCALE_CODES.join('|');

function readFrontmatter(source, filename) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  if (!match) throw new Error(`Missing frontmatter: ${filename}`);
  const fields = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    fields[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  for (const key of ['title', 'category', 'date', 'description', 'keywords']) {
    if (!fields[key]) throw new Error(`Missing ${key} in ${filename}`);
  }
  return fields;
}

function validate() {
  const ids = ARTICLE_CATALOG.map(article => article.id);
  if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_ARTICLE_IDS)) {
    throw new Error(`Published article inventory changed: expected ${EXPECTED_ARTICLE_IDS.join(',')}, found ${ids.join(',')}`);
  }
  if (REQUIRED_LOCALES.some(locale => !LOCALE_CODES.includes(locale))) {
    throw new Error(`A required article locale is not enabled: ${REQUIRED_LOCALES.join(', ')}`);
  }

  let total = 0;
  for (const article of ARTICLE_CATALOG) {
    const folder = path.join(ROOT, 'public/articles', article.originalSlug);
    for (const locale of REQUIRED_LOCALES) {
      const edition = article.locales[locale];
      if (!edition) throw new Error(`Article ${article.id} has no ${locale} catalog entry`);
      const filename = path.join(folder, edition.filename);
      if (!fs.existsSync(filename)) throw new Error(`Missing ${locale} article ${article.id}: ${filename}`);
      const source = fs.readFileSync(filename, 'utf8');
      const fields = readFrontmatter(source, filename);
      const body = source.replace(/^---\s*\n[\s\S]*?\n---\s*/, '');
      if (body.trim().length < 400) throw new Error(`Article ${article.id} ${locale} body is unexpectedly short`);

      const images = [...body.matchAll(/!\[[^\]]*\]\(\.\/([^\s)]+)(?:\s+[^)]*)?\)/g)].map(match => match[1]);
      for (const image of images) {
        if (!fs.existsSync(path.join(folder, image))) throw new Error(`Missing image ${image} in article ${article.id} (${locale})`);
      }

      const links = [...body.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
      for (const href of links) {
        if (href.startsWith('./') || href.startsWith('#') || href.startsWith('mailto:')) continue;
        let pathname = href;
        if (/^https?:\/\//i.test(href)) {
          let url;
          try { url = new URL(href); } catch (_) { continue; }
          if (!['sentimentinsideout.com', 'www.sentimentinsideout.com'].includes(url.hostname)) continue;
          pathname = url.pathname;
        }
        const routeLocale = pathname.match(new RegExp(`^/(${LOCALE_PATTERN})/`))?.[1];
        if (routeLocale && routeLocale !== locale) {
          throw new Error(`Wrong-locale internal link in article ${article.id} (${locale}): ${href}`);
        }
        if (pathname.startsWith('/')) {
          const hasLocalePrefix = new RegExp(`^/(${LOCALE_PATTERN})/`).test(pathname);
          if (!hasLocalePrefix) throw new Error(`Unlocalized internal link in article ${article.id} (${locale}): ${href}`);
        }
      }

      if (locale === 'ko-KR') {
        const hangulCount = (body.match(/[\uAC00-\uD7AF]/g) || []).length;
        if (hangulCount < 100) throw new Error(`Korean article ${article.id} has too little Hangul (${hangulCount} characters)`);
      }
      if (locale === 'zh-CN' && /\/zh-TW\//.test(body)) {
        throw new Error(`Simplified Chinese article ${article.id} contains a Traditional Chinese route`);
      }
      if (locale === 'zh-HK' && /\/zh-TW\//.test(body)) {
        throw new Error(`Hong Kong article ${article.id} contains a Taiwan locale route`);
      }
      if (/\{\{[^}]+\}\}|\[TODO\]|\[TRANSLATE\]/i.test(body)) {
        throw new Error(`Unresolved translation marker in article ${article.id} (${locale})`);
      }

      total += 1;
      console.log(`OK ${locale} article ${article.id}: ${fields.title}`);
    }
  }
  console.log(`Article locale validation passed: ${total} complete editions (${ARTICLE_CATALOG.length} articles × ${REQUIRED_LOCALES.length} locales).`);
}

try {
  validate();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
