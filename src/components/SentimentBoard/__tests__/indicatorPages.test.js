import registry from '../indicatorPages.json';
import zhTW from '../../../locales/zh-TW/translation.json';
import en from '../../../locales/en/translation.json';
import zhCN from '../../../locales/zh-CN/translation.json';
import koKR from '../../../locales/ko-KR/translation.json';

const locales = [zhTW, en, zhCN, koKR];
const boardPages = registry.filter(page => ['external', 'us', 'tw'].includes(page.group));
const referencePages = registry.filter(page => page.compositeRole === 'reference');

describe('sentiment indicator explainer registry', () => {
  it('registers 22 board indicators plus the two SIO-owned explainer pages', () => {
    expect(registry).toHaveLength(24);
    expect(registry.filter(page => page.group === 'external')).toHaveLength(2);
    expect(registry.filter(page => page.group === 'us')).toHaveLength(8);
    expect(registry.filter(page => page.group === 'tw')).toHaveLength(12);
    expect(registry.filter(page => page.group === 'sio')).toHaveLength(2);
    expect(boardPages).toHaveLength(22);
    expect(registry.every(page => page.published === true)).toBe(true);
  });

  it('uses unique routes and unique board item identifiers', () => {
    expect(new Set(registry.map(page => page.slug)).size).toBe(registry.length);
    const itemIds = boardPages.map(page => page.boardItemId);
    expect(itemIds.every(Boolean)).toBe(true);
    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(registry.find(page => page.slug === 'taiwan-fear-greed').boardItemId).toBeNull();
  });

  it('keeps non-composite Taiwan references distinct from weighted SIO inputs', () => {
    expect(referencePages.map(page => page.i18nKey).sort()).toEqual([
      'effectiveTradingAccounts', 'retailSentimentSmallFutures', 'us10yYield'
    ]);
    expect(referencePages.every(page => page.group === 'tw')).toBe(true);
  });

  it('declares units and scale multipliers for percentage-valued readings', () => {
    const bySlug = Object.fromEntries(registry.map(page => [page.slug, page]));
    [
      'market-momentum', 'junk-bond-spread', 'pcr-ratio', 'us-10y-yield',
      'margin-maintenance-ratio', 'margin-short-ratio', 'market-breadth-ma20',
      'tw-market-momentum'
    ].forEach(slug => expect(bySlug[slug].unit).toBe('%'));
    expect(bySlug['safe-haven-demand']).toMatchObject({ unit: '%', displayMultiplier: 100 });
    expect(bySlug['eta-deviation-189d']).toMatchObject({ unit: '%', displayMultiplier: 100 });
    expect(bySlug['usd-twd'].unit).toBe('TWD/USD');
    expect(bySlug['retail-sentiment-small-futures'].unit).toBeUndefined();
  });

  it.each([
    ['Traditional Chinese', zhTW],
    ['English', en],
    ['Simplified Chinese', zhCN],
    ['Korean', koKR]
  ])('has complete explainer copy for all 24 pages in %s', (language, dictionary) => {
    registry.forEach(page => {
      const copy = dictionary.sentimentIndicatorPages[page.i18nKey];
      expect(copy).toBeDefined();
      [
        'shortName', 'pageTitle', 'pageDescription', 'keywords', 'heading', 'lede',
        'whatItIsTitle', 'whatItIs', 'howToReadTitle', 'howToRead', 'historyTitle',
        'history', 'relationToSioTitle', 'relationToSio', 'relationToSioCta', 'source'
      ].forEach(key => {
        expect(typeof copy[key]).toBe('string');
        expect(copy[key].trim()).not.toBe('');
      });
    });
  });
});
