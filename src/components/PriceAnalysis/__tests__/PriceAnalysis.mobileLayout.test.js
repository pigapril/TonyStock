const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '../PriceAnalysis.css'), 'utf8');
const mobileLayoutStart = css.indexOf('@media (max-width: 1199px)');
const mobileLayoutEnd = css.indexOf('@media (max-width: 768px)', mobileLayoutStart);
const mobileLayoutCss = css.slice(mobileLayoutStart, mobileLayoutEnd);

describe('PriceAnalysis 手機版排序', () => {
  it('技術指標延遲載入的 placeholder 排在搜尋列與圖表之後', () => {
    expect(mobileLayoutStart).toBeGreaterThanOrEqual(0);
    expect(mobileLayoutEnd).toBeGreaterThan(mobileLayoutStart);
    expect(mobileLayoutCss).toMatch(
      /\.price-analysis-view \.pa-indicator-placeholder\s*\{[^}]*order:\s*4\s*;/
    );
  });
});
