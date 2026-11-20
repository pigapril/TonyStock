# Korean (ko-KR) Translation Review Draft

**Status: Complete translation draft for review only — not enabled in the application.**

This review is being rebuilt from the current `src/locales/zh-TW/translation.json` source. Earlier Korean proposal lists and drafts are not used as translation sources.

## Translation scope

- Source inventory: 2,422 string values, including strings inside arrays as well as object fields. Coverage includes all product pages, account and subscription flows, payments, analytics tools, support/error states and other active UI copy.
- The final review JSON must retain the source key structure and array order exactly.
- Every `{{...}}`, `{symbol}` and `%{...}` interpolation token must remain unchanged.
- Tickers, ETF and product identifiers, API and technical names, URLs, email addresses, numerical values, dates, units and factual qualifications must remain accurate.
- The Korean copy should sound natural to Korean retail-investing users rather than mirror Chinese syntax.

## Terminology proposal

| Source concept | Korean term | Notes |
|---|---|---|
| 市場情緒 / market sentiment | 시장 심리 | Use for overall market sentiment and product terminology. |
| 恐懼與貪婪指數 | 공포·탐욕 지수 | Fixed product term. |
| 樂活五線譜 | LOHAS 5선 분석 | Keep the LOHAS brand. |
| 市場動能 | 시장 모멘텀 | Use for the momentum dashboard and indicator. |
| 自選列表 / 追蹤清單 | 관심 종목 | Use for the saved/watchlist feature. |
| 個股分析 | 종목 분석 | Generic stock/asset analysis. |
| 台股 | 대만 주식시장 | Keep Taiwan clearly distinct from the US market. |
| 美股 | 미국 주식시장 | US market. |
| Pro | Pro | Product plan name; do not translate. |

Sentiment bands: `극도의 공포` / `공포` / `중립` / `탐욕` / `극도의 탐욕`.

The existing source does not yet contain a language-menu label for Korean. When the translation is approved and the locale is enabled, add a new menu item whose native name is `한국어`; this is a new locale option, not an existing source key.

## Style rules

- Explanatory text uses consistent, natural `합니다` style.
- Buttons, menus, badges and compact labels use concise Korean UI wording.
- Do not omit Korean particles or sentence endings. Avoid chained `의`, Chinese noun chains, awkward calques, unnecessary passive constructions and unsupported promotional claims.
- Follow the in-repository Korean profile at `.agents/skills/oma-translation/resources/lang/ko.md` and the project translation workflow/rubric.

## Files

`ko-KR.translation-review.json` is the merged review artifact. It currently contains all 2,422 string values from the source. The `*.draft.json` files preserve the individual review batches and their provenance. `06-terms-privacy.draft.md` is a separate legal-document draft and must not be treated as approved legal copy.

The recursive validator reports 2,422/2,422 strings, zero missing/extra keys, zero interpolation-token mismatches, zero markup mismatches, zero empty values and zero unintended CJK residuals. These automated checks establish structural coverage, not final human or legal approval; the notes in `REVIEW-NOTES.md` and `ADMIN-REVIEW-NOTES.md` must be resolved before publication.

No file in this folder is loaded by the app. Do not copy these drafts into `src/locales`, add `ko-KR` to the locale registry, generate public SEO assets or expose a Korean language switcher until the review is approved.

## External service compatibility

Payment provider payloads, ECPay, transactional emails, customer support FAQ and announcement API currently use English fallback for Korean requests. Invoice PDF output also uses English labels and Gregorian dates for that service locale. The Korean front end can be localized independently; these service-side fallbacks must remain explicit until the corresponding services have verified Korean support.

- The sponsor page is Taiwan-specific. It should not receive a Korean SEO route, hreflang entry or Korean share-card asset unless the business/legal scope is explicitly expanded.
- The article catalog can list English editions for Korean users. Do not generate Korean article detail URLs or hreflang values for Markdown articles that have not actually been translated.
