// Original translation.json files remain the source of truth. Shared/cross-page
// labels stay in common; these large sections belong to specific feature routes.
const RESOURCE_GROUPS = {
  admin: ['admin'],
  momentum: ['momentumDashboard'],
  indicators: ['sentimentIndicatorPages'],
  account: ['redemption'],
  market: ['marketSentiment.descriptions', 'marketSentiment.enhancedDescription', 'marketSentiment.tw'],
  price: ['priceAnalysis.description', 'priceAnalysis.tour']
};

function getRouteLocaleGroups(pathname = '') {
  const route = pathname.replace(/^\/(en|zh-TW|zh)(?=\/|$)/i, '').replace(/\/$/, '').toLowerCase();
  if (/^\/(admin|nk-admin(?:-diagnostic)?)(?:\/|$)/.test(route)) return Object.keys(RESOURCE_GROUPS);
  if (/^\/momentum(?:\/|$)/.test(route)) return ['momentum'];
  if (/^\/sentiment-indicators(?:\/|$)/.test(route)) return ['indicators', 'market'];
  if (/^\/(market-sentiment|tw-market-sentiment)(?:\/|$)/.test(route)) return ['market'];
  if (/^\/(priceanalysis|watchlist)(?:\/|$)/.test(route)) return ['price'];
  if (/^\/(subscription-plans|user-account|payment)(?:\/|$)/.test(route)) return ['account'];
  return [];
}

module.exports = { RESOURCE_GROUPS, getRouteLocaleGroups };
