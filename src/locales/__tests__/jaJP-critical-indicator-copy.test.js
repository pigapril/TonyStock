import fs from 'fs';
import path from 'path';
import japanese from '../ja-JP/translation.json';

test('BofA and CNN thresholds preserve inclusive boundaries', () => {
  expect(japanese.sentimentIndicatorPages.bofaBullBear.pageDescription).toContain('8以上');
  expect(japanese.sentimentIndicatorPages.bofaBullBear.pageDescription).toContain('2以下');
  expect(japanese.sentimentIndicatorPages.bofaBullBear.howToRead).toContain('8.0以上');
  expect(japanese.sentimentIndicatorPages.bofaBullBear.howToRead).toContain('2.0以下');
  expect(japanese.sentimentIndicatorPages.cnnFearGreed.pageDescription).toContain('25以下');
  expect(japanese.sentimentIndicatorPages.cnnFearGreed.pageDescription).toContain('75以上');
});

test('Taiwan SIO components are not mislabeled as US index components', () => {
  const included = [
    'twVix', 'pcrRatio', 'usdTwd', 'finiFuturesNetOi',
    'marginMaintenanceRatio', 'marginShortRatio', 'marketBreadthMa20',
    'twMarketMomentum', 'etaDeviation189d',
  ];
  included.forEach(key => {
    const relation = japanese.sentimentIndicatorPages[key].relationToSio;
    expect(relation).toContain('SIO台湾株恐怖・強欲指数');
    expect(relation).not.toContain('米国株');
  });
});

test('supplemental Taiwan market indicators explicitly remain outside the weighted SIO index', () => {
  ['us10yYield', 'effectiveTradingAccounts', 'retailSentimentSmallFutures'].forEach(key => {
    const relation = japanese.sentimentIndicatorPages[key].relationToSio;
    expect(relation).toContain('加重計算には含まれていません');
    expect(relation).not.toContain('構成する入力項目');
  });
});

test('AAII and market-sentiment FAQs preserve inclusive threshold wording', () => {
  const composite = japanese.marketSentiment;
  const aaii = japanese.sentimentIndicatorPages.aaiiSurvey;
  expect(aaii.history).toContain('2,000件を超えます');
  const article2 = fs.readFileSync(path.resolve(__dirname, '../../../public/articles/2.用市場情緒綜合指數判斷買賣時機/article-2.ja-JP.ini.md'), 'utf8');
  expect(article2).toContain('差が20ポイント以上になると');
  expect(composite.enhancedDescription.content.faq.q7).toContain('15以下');
  expect(composite.enhancedDescription.content.faq.q7).toContain('96以上');
  expect(composite.enhancedDescription.content.faq.q8).toContain('15以下');
  expect(composite.enhancedDescription.content.faq.q8).toContain('5以下');
});

test('all user-facing redemption and billing copy is Japanese with matching placeholders', () => {
  const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../zh-TW/translation.json'), 'utf8'));
  const groups = ['redemption', 'payment', 'subscription', 'cardTrial', 'invoice', 'refund', 'userActions'];
  const flatten = (value, prefix = '', output = []) => {
    if (typeof value === 'string') output.push([prefix, value]);
    else if (Array.isArray(value)) value.forEach((entry, index) => flatten(entry, `${prefix}[${index}]`, output));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => flatten(entry, prefix ? `${prefix}.${key}` : key, output));
    return output;
  };
  const sourceEntries = flatten(source);
  const japaneseEntries = new Map(flatten(japanese));
  const placeholders = value => [...String(value).matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(match => match[1]).sort();

  groups.forEach(group => {
    const entries = sourceEntries.filter(([key]) => key.split('.')[0] === group);
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach(([key, sourceValue]) => {
      expect(japaneseEntries.has(key)).toBe(true);
      const targetValue = japaneseEntries.get(key);
      expect(typeof targetValue).toBe('string');
      expect(targetValue.trim()).not.toBe('');
      expect(placeholders(targetValue)).toEqual(placeholders(sourceValue));
    });
  });
});

test('all Watchlist stock-card copy is translated into Japanese with matching placeholders', () => {
  const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../zh-TW/translation.json'), 'utf8'));
  const flatten = (value, prefix = '', output = []) => {
    if (typeof value === 'string') output.push([prefix, value]);
    else if (Array.isArray(value)) value.forEach((entry, index) => flatten(entry, `${prefix}[${index}]`, output));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => flatten(entry, prefix ? `${prefix}.${key}` : key, output));
    return output;
  };
  const sourceEntries = flatten(source.watchlist.stockCard);
  const japaneseEntries = new Map(flatten(japanese));
  const placeholders = value => [...String(value).matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(match => match[1]).sort();

  expect(sourceEntries).toHaveLength(17);
  sourceEntries.forEach(([key, sourceValue]) => {
    const targetValue = japaneseEntries.get(`watchlist.stockCard.${key}`);
    expect(typeof targetValue).toBe('string');
    expect(targetValue.trim()).not.toBe('');
    expect(targetValue).not.toBe(sourceValue);
    expect(placeholders(targetValue)).toEqual(placeholders(sourceValue));
  });

  expect(japanese.watchlist.stockCard.header.symbol).toBe('銘柄コード');
  expect(japanese.watchlist.stockCard.header.sentiment).toBe('市場心理');
  expect(japanese.watchlist.stockCard.removeButton.ariaLabel).toContain('{{symbol}}');
});

test('Watchlist access, category counts, and homepage ETF labels are translated', () => {
  expect(japanese.protectedRoute.watchlistUpgradeRequired)
    .toBe('ウォッチリスト機能を利用するには、Proプランへのアップグレードが必要です。');
  expect(japanese.priceAnalysis.addToWatchlist.categoryTotal_other)
    .toBe('{{count}}件のカテゴリー');
  expect(japanese.priceAnalysis.addToWatchlist.stockCount_other)
    .toBe('{{count}}銘柄');
  expect(japanese.home.story.blocks.watchlist.items.voo).toBe('S&P 500連動ETF');
});

test('Japanese UI uses natural market-sentiment and SaaS contract terminology', () => {
  const serialized = JSON.stringify(japanese);
  expect(serialized).not.toMatch(/購読|株価心理|価格心理/);
  expect(japanese.subscription.userAccount.cancelSubscription).toBe('自動更新を停止');
  expect(japanese.subscription.userAccount.cancelConfirmMessage)
    .toContain('停止後も{{endDate}}までは、すべての機能を引き続きご利用いただけます。');
  expect(japanese.subscription.userAccount.cancelledNotice)
    .toContain('Proプランは{{endDate}}までご利用いただけます。');
  expect(japanese.payment.security.renewal)
    .toContain('次回更新日の前に、アカウントから契約内容の確認や自動更新の停止ができます。');
  expect(japanese.watchlist.priceSentimentNotifications.description)
    .toContain('選択した市場心理の状態に達した銘柄があれば');
  expect(japanese.watchlist.priceSentimentNotifications.scheduleValue)
    .toContain('台北時間の午前7時');
});

test('Japanese product copy, articles, and social metadata use the approved LOHAS Five-Line brand name', () => {
  const articlePaths = [
    '../../../public/articles/1.用樂活五線譜分析價格趨勢與情緒/article-1.ja-JP.ini.md',
    '../../../public/articles/2.用市場情緒綜合指數判斷買賣時機/article-2.ja-JP.ini.md',
    '../../../public/articles/4.樂活五線譜1155萬筆台美股資料實測結果分析/article-4.ja-JP.ini.md',
    '../../../public/articles/5.市場動能儀表板使用指南/article-5.ja-JP.ini.md',
  ];
  const oldBrandPattern = /5線チャート|5線分析/;
  const stripApprovedDescriptor = value => value.replace(/LOHAS Five-Line（5線チャート）/g, '');
  const serializedLocale = JSON.stringify(japanese);
  expect(stripApprovedDescriptor(serializedLocale)).not.toMatch(oldBrandPattern);
  expect(japanese.priceAnalysis.heading).toBe('LOHAS Five-Line（5線チャート）');
  expect(japanese.priceAnalysis.pageTitle).toContain('LOHAS Five-Line（5線チャート）');
  expect(japanese.watchlist.infoTooltip).toContain('LOHAS Five-Line（5線チャート）');
  expect(japanese.sentimentIndicatorPages.marketFearBreadth.whatItIs)
    .toContain('LOHAS Five-Line（5線チャート）');

  articlePaths.forEach((relativePath, index) => {
    const article = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
    expect(stripApprovedDescriptor(article)).not.toMatch(oldBrandPattern);
    expect(article).not.toMatch(/<escape>|<\/escape>/);
    if (index < 3) expect(article).toContain('LOHAS Five-Line');
    if (index === 0 || index === 2) expect(article).toContain('LOHAS Five-Line（5線チャート）');
    if (index === 1) expect(article).toContain('LOHAS Five-Line（5線チャート）');
  });

  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/images/social/manifest.json'), 'utf8'));
  const japaneseCards = manifest.cards.filter(card => card.lang === 'ja-JP');
  expect(japaneseCards).toHaveLength(13);
  japaneseCards.forEach(card => {
    expect(stripApprovedDescriptor(`${card.title || ''} ${card.description || ''}`)).not.toMatch(oldBrandPattern);
  });
  const cardByName = name => japaneseCards.find(card => card.name === name);
  japaneseCards.forEach(card => {
    expect(`${card.title || ''} ${card.description || ''}`).not.toMatch(/株価心理|価格心理|購読/);
  });
  expect(cardByName('watchlist').description).toContain('複数銘柄の市場心理');
  expect(cardByName('priceanalysis').title).toContain('LOHAS Five-Line（5線チャート）');
  expect(cardByName('articles').description).toContain('LOHAS Five-Line（5線チャート）');
  expect(cardByName('article-1').title).toContain('LOHAS Five-Line（5線チャート）');
  expect(cardByName('article-4').title).toContain('LOHAS Five-Line（5線チャート）');
});
