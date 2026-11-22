# Hong Kong Traditional Chinese Target-Locale Profile (`zh-HK`)

Load this file together with `zh.md` and `../translation-rubric.md` whenever
the target locale is `zh-HK`. This profile narrows the general Traditional
Chinese rules to Hong Kong written Chinese and the product's Taiwan-market
financial context. It is not a Cantonese transcription guide and does not
authorize a mechanical Taiwan-to-Hong-Kong word replacement pass.

## Locale and register

- Use Traditional Chinese characters and natural Hong Kong written Chinese.
- Default to clear, contemporary written Chinese. Do not force colloquial
  Cantonese particles or phonetic Cantonese into ordinary navigation, labels,
  explanations, SEO metadata, or financial content.
- A customer-support reply may be warmer and more conversational, but retain
  the product's chosen `你` / `您` relationship consistently within that
  conversation. Email and legal copy follow their own approved surface register.
- Prefer established Hong Kong vocabulary where it is genuinely used by Hong
  Kong readers. Do not replace a correct Taiwan-market technical name when the
  page is explicitly describing Taiwan data, regulation, or market structure.

## Product vocabulary

| Concept | Preferred `zh-HK` wording |
|---|---|
| Watchlist | 自選清單 |
| Stock ticker / code | 股份代號 |
| Email | 電郵 |
| Subscription plan | 訂閱計劃 / Pro 計劃 |
| Network | 網絡 |
| Market close / closing price | 收市 / 收市價 |
| Market open / opening price | 開市 / 開市價 |
| Change / price movement | 升跌 / 升跌幅 |
| Return | 回報 / 回報率 |
| Profit / revenue | 盈利 / 收入 |

Choose contextually; do not replace every occurrence mechanically. For
example, `收入` may mean revenue in one context and income in another.

## Taiwan-market financial terminology

Use Hong Kong-recognized market vocabulary for general financial concepts:

| Concept | Preferred wording |
|---|---|
| Put / Call options | 認沽／認購期權 |
| Put/Call Ratio | 認沽／認購期權比率 |
| Options | 期權 |
| Yield | 孳息率 |
| High-yield bonds | 高孳息債券 |
| Credit spread | 信貸息差 |
| Credit rating / risk | 信貸評級 / 信貸風險 |
| Position / exposure | 持倉 / 持倉比重 |
| Long / short position | 好倉 / 淡倉 |
| Strike price | 行使價 |
| Stop loss / take profit | 止蝕 / 止賺 |

Preserve Taiwan-specific names and concepts where the content is about Taiwan:
for example, 台股, 台灣加權股價指數, 融資維持率, 券資比, 外資期貨淨未平倉,
and Taiwan-specific calculation or exchange names. Do not substitute a Hong
Kong regulatory product, exchange, margin rule, or market statistic for a
Taiwan source. In explanatory prose, use 台灣股市 when that is clearer for a
Hong Kong reader; keep established product labels and data names intact.

For Taiwan-dollar references, use `新台幣` when the full currency name is
needed. A source already containing `新台幣` must remain unchanged; never
produce `新新台幣` by applying a substring replacement.

## Technical terms and safe transformations

- Prefer `移動平均線` for a moving average. A bare `均線` may be expanded to
  `移動平均線`, but the substring `均線` inside `平均線` must not be replaced
  again. Never produce `移動平移動平均線`.
- Translate Put/Call as a ratio of put-option and call-option activity, not as
  an instruction to buy puts. Never render `買賣權比` as `買認沽期權比`.
- Keep product tier names, ticker symbols, API names, formulas, placeholders,
  and exchange identifiers unchanged unless the project explicitly localizes
  their display text.
- Prefer phrase-level, key-aware terminology rules over global substring
  replacement. Every automated transform must be idempotent and covered by a
  regression check for duplicated prefixes, repeated words, and altered
  financial meaning.

## Punctuation and typography

- Use `「」` for primary quotations and `『』` for quotations inside them.
- Use full-width Chinese punctuation in Chinese prose. Preserve ASCII commas
  when they are structural delimiters in comma-separated SEO keyword fields or
  another explicitly machine-parsed value.
- Use `……` for a Chinese ellipsis rather than `...`.
- Retain clear spacing around Latin abbreviations, tickers, and product names
  according to the surrounding project resource convention; do not alternate
  spacing styles within one surface.

## `zh-HK` self-check

- [ ] Traditional Chinese script throughout; no Simplified Chinese leakage.
- [ ] Written Hong Kong Chinese, not unrequested phonetic Cantonese.
- [ ] Established Hong Kong UI and financial terms used where appropriate.
- [ ] Taiwan-specific financial names and calculations remain accurate.
- [ ] Put/Call Ratio keeps both put and call sides and remains a ratio.
- [ ] `移動平均線` and `新台幣` are not double-replaced.
- [ ] Quotation marks, punctuation, ellipses, and Latin spacing follow this profile.
- [ ] Automated transformations are idempotent and pass regression checks.
- [ ] Meaning, actors, numbers, dates, currency, URLs, placeholders, and
      resource structure remain unchanged.

This profile supports linguistic review; it does not certify native-speaker
review or legal approval.
