const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '../PriceAnalysis.css'), 'utf8');
const mobileLayoutStart = css.indexOf('@media (max-width: 1199px)');
const mobileLayoutEnd = css.indexOf('@media (max-width: 768px)', mobileLayoutStart);
const mobileLayoutCss = css.slice(mobileLayoutStart, mobileLayoutEnd);
const phoneLayoutCss = css.slice(mobileLayoutEnd);

describe('PriceAnalysis 手機版排序', () => {
  it('技術指標延遲載入的 placeholder 排在搜尋列與圖表之後', () => {
    expect(mobileLayoutStart).toBeGreaterThanOrEqual(0);
    expect(mobileLayoutEnd).toBeGreaterThan(mobileLayoutStart);
    expect(mobileLayoutCss).toMatch(
      /\.price-analysis-view \.pa-indicator-placeholder\s*\{[^}]*order:\s*4\s*;/
    );
  });

  it('使用教學與 H1 同列，標題說明留在下一列', () => {
    expect(mobileLayoutCss).toMatch(
      /\.price-analysis-view \.pa-intro\s*\{[^}]*display:\s*grid\s*;/
    );
    expect(mobileLayoutCss).toMatch(
      /\.price-analysis-view \.pa-tour-launch\s*\{[^}]*grid-row:\s*1\s*;/
    );
    expect(mobileLayoutCss).toMatch(
      /\.price-analysis-view \.pa-intro p\s*\{[^}]*grid-row:\s*2\s*;/
    );
  });

  it('加入追蹤清單與其他週期資訊共用同一列', () => {
    expect(phoneLayoutCss).toMatch(
      /\.price-analysis-view \.analysis-item--horizons\s*\{[^}]*grid-row:\s*3\s*;/
    );
    expect(phoneLayoutCss).toMatch(
      /\.price-analysis-view \.analysis-item--watchlist-action\s*\{[^}]*grid-row:\s*3\s*;/
    );
    expect(phoneLayoutCss).toMatch(
      /\.price-analysis-view \.analysis-item--watchlist-action \.pa-add-to-watchlist-placeholder\s*\{[^}]*width:\s*116px\s*;/
    );
  });
});
