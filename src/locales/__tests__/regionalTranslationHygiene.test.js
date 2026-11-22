const zhCN = require('../zh-CN/translation.json');
const zhHK = require('../zh-HK/translation.json');
const koKR = require('../ko-KR/translation.json');

function stringLeaves(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach(child => stringLeaves(child, output));
  else if (value && typeof value === 'object') Object.values(value).forEach(child => stringLeaves(child, output));
  return output;
}

describe('regional Chinese translation hygiene', () => {
  test('zh-HK contains no known substring-replacement corruption', () => {
    const values = stringLeaves(zhHK);
    const text = values.join('\n');

    expect(text).toContain('認沽／認購期權比率');
    expect(text).not.toContain('移動平移動平均線');
    expect(text).not.toContain('新新台幣');
    expect(text).not.toContain('買認沽期權比');
    expect(text).not.toMatch(/期權(?:的)?認沽／認購期權比率/);
    expect(text).not.toContain('...');
  });

  test('zh-CN uses Mainland Chinese quotation marks and ellipses', () => {
    const values = stringLeaves(zhCN);
    const text = values.join('\n');

    expect(text).not.toMatch(/[「」『』]/);
    expect(text).not.toContain('...');
    expect(zhCN.priceAnalysis.chart.loading.fetching).toBe('加载中……');
  });

  test('zh-CN keeps comma-separated SEO keyword metadata parseable', () => {
    expect(zhCN.articles.keywords).toMatch(/,/);
    expect(zhCN.pageContainer.defaultKeywords).toMatch(/,/);
    expect(zhCN.sentimentBoard.keywords).toMatch(/,/);
  });

  test('ko-KR does not contain chained genitives that hide sentence relations', () => {
    expect(stringLeaves(koKR).join('\n')).not.toMatch(/\S+의\s+\S+의\s+\S+/);
  });
});
