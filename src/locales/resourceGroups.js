// Original translation.json files remain the source of truth. Shared/cross-page
// labels stay in common; these large sections belong to specific feature routes.
const { getInitialLanguage, stripLocalePrefix } = require('./localeConfig');
const INDICATOR_PAGES = require('../components/SentimentBoard/indicatorPages.json');

const INDICATOR_GROUPS = {
  external: 'indicatorsExternal',
  us: 'indicatorsUs',
  tw: 'indicatorsTw',
  sio: 'indicatorsSio'
};

const indicatorResourcePaths = (group) => INDICATOR_PAGES
  .filter((page) => page.group === group)
  .map((page) => `sentimentIndicatorPages.${page.i18nKey}`);

const RESOURCE_GROUPS = {
  admin: ['admin'],
  momentum: ['momentumDashboard'],
  indicatorsExternal: indicatorResourcePaths('external'),
  indicatorsUs: indicatorResourcePaths('us'),
  indicatorsTw: indicatorResourcePaths('tw'),
  indicatorsSio: indicatorResourcePaths('sio'),
  indicatorsBofa: ['sentimentHistoryExamples'],
  account: ['redemption'],
  market: ['marketSentiment.descriptions', 'marketSentiment.enhancedDescription', 'marketSentiment.tw'],
  priceNotifications: ['watchlist.priceSentimentNotifications']
};

function getRouteLocaleGroups(pathname = '') {
  const route = stripLocalePrefix(pathname).replace(/\/$/, '').toLowerCase();
  if (/^\/(admin|nk-admin(?:-diagnostic)?)(?:\/|$)/.test(route)) return Object.keys(RESOURCE_GROUPS);
  if (/^\/momentum(?:\/|$)/.test(route)) return ['momentum'];
  const indicatorDetail = route.match(/^\/sentiment-indicators\/([^/]+)$/);
  if (indicatorDetail) {
    const page = INDICATOR_PAGES.find((item) => item.slug === indicatorDetail[1]);
    if (!page) return [];
    const group = INDICATOR_GROUPS[page.group];
    return group ? [...(page.slug === 'bofa-bull-bear' ? [group, 'indicatorsBofa'] : [group])] : [];
  }
  if (/^\/(market-sentiment|tw-market-sentiment)(?:\/|$)/.test(route)) return ['market'];
  if (/^\/watchlist(?:\/|$)/.test(route)) return ['priceNotifications'];
  if (/^\/(subscription-plans|user-account|payment)(?:\/|$)/.test(route)) return ['account'];
  return [];
}

module.exports = { RESOURCE_GROUPS, getRouteLocaleGroups, getInitialLanguage };
