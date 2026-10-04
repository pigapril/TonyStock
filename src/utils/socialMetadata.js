// Shared by React and the build-time HTML generator.
const images = require('../config/socialImages.json');
const normalizeLocale = (lang) => lang === 'zh' || lang === 'zh-TW' ? 'zh-TW' : 'en';

function socialImagePath(pathname, lang, articleNumber) {
  const locale = normalizeLocale(lang);
  const route = pathname.replace(/^\/(en|zh-TW|zh)(?=\/|$)/, '').replace(/\/$/, '');
  const image = ['1', '2', '4', '5'].includes(String(articleNumber)) ? `article-${articleNumber}` :
    (images[route] || (route.startsWith('/sentiment-indicators/') ? 'sentiment-indicators' : 'home'));
  return `/images/social/${locale}/${image}.png`;
}

function canonicalUrl(rawUrl, origin) {
  const url = new URL(rawUrl, origin);
  url.search = '';
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/`;
  return url.href;
}

module.exports = { socialImagePath, canonicalUrl, normalizeLocale };
