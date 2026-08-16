/**
 * 指標常青解說頁的註冊表。
 *
 * 這些頁面是「寫一次長期有效」的內容，與每天變動的 Board 分工：Board 給當前值，
 * 這裡給判讀方式。TODOS.md:38 點名 `bofa bull & bear indicator` 這類 long-tail
 * 是 GSC 顯示可搆到的詞，這批頁面就是去接它們。
 *
 * `boardItemId` 對應 /api/sentiment-board 回傳的 item id，用來把當前值嵌進解說頁。
 * `i18nKey` 對應 translation.json 的 sentimentIndicatorPages.<key>。
 * `ctaPath` 是該頁要把讀者導向哪一個 SIO 指標頁，預設美股。
 *
 * 只有 `published: true` 的才會出現在路由、導覽與 sitemap。文案還沒寫好的頁面
 * 不該先上線吃 SEO 懲罰。新增一頁時，記得同步 scripts/generate-seo-shells.js
 * 的 ROUTES 與 public/sitemap.xml，兩邊不同步會讓 build 直接失敗。
 */
export const INDICATOR_PAGES = [
  {
    slug: 'bofa-bull-bear',
    boardItemId: 'bofa-bull-bear',
    i18nKey: 'bofaBullBear',
    published: true
  },
  {
    slug: 'cnn-fear-greed',
    boardItemId: 'cnn-fear-greed',
    i18nKey: 'cnnFearGreed',
    published: true
  },
  {
    slug: 'aaii-sentiment-survey',
    boardItemId: 'aaii-bull-bear-spread',
    i18nKey: 'aaiiSurvey',
    published: true
  },
  {
    slug: 'naaim-exposure-index',
    boardItemId: 'naaim-exposure-index',
    i18nKey: 'naaimExposure',
    published: true
  },
  {
    slug: 'cboe-put-call-ratio',
    boardItemId: 'cboe-put-call-ratio-5-day-avg',
    i18nKey: 'cboePutCall',
    published: true
  },
  {
    slug: 'cot-sp500-index',
    boardItemId: 's-p-500-cot-index',
    i18nKey: 'cotSp500',
    published: true
  },
  {
    // SIO 自家的台股指標。當前值在 Board 的 composite 區塊而非 items 裡，
    // 所以這頁沒有 boardItemId，直接把讀者導到台股專頁。
    slug: 'taiwan-fear-greed',
    boardItemId: null,
    i18nKey: 'taiwanFearGreed',
    ctaPath: 'tw-market-sentiment',
    // SIO 自算的指標，免責文案與轉載第三方讀數的頁面不同。
    ownIndicator: true,
    published: true
  }
];

export const PUBLISHED_INDICATOR_PAGES = INDICATOR_PAGES.filter((page) => page.published);

export const findIndicatorPage = (slug) =>
  PUBLISHED_INDICATOR_PAGES.find((page) => page.slug === slug) || null;
