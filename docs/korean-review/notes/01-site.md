# 01-site — Korean language and product-copy review

- Coverage: 208/208 source keys in `source/01-site.json` compared with the current master proposal.
- Review result: 16 wording refinements are recorded in `drafts/reviewed-overrides.ko-KR.json`; the other 192 candidates are retained.
- Scope: navigation, language names, article metadata, account and dialog labels, footer notices, home page, historical market examples, sponsor page, legal-page metadata, and chart labels.
- No runtime locale, component, route, SEO, or production file was changed.

## Reviewed wording decisions

- Use `분석 칼럼` for 「分析專欄」; `시장 분석 칼럼` narrows the scope to market analysis unnecessarily.
- Use `미국 증시` and `대만 증시` for the US and Taiwan equity-market menu items.
- Use `중국어(번체)` for Traditional Chinese in a Korean language selector.
- Keep `시장 심리`, `공포·탐욕 지수`, `LOHAS 5선 분석`, `시장 모멘텀`, and `관심 종목` consistent with the shared glossary.
- Use `시황 = 자금 + 심리` for the site's core idea. The quotation title is rendered descriptively as `한 투기자의 고백`; this is not represented as a verified official Korean edition title.
- Localize Apple/NVIDIA/Microsoft as `애플`, `엔비디아`, and `마이크로소프트` in the illustrative watchlist; preserve ETF tickers and technical symbols.
- The home price-preview text explicitly describes the SPY price's position relative to its trendline and standard-deviation bands. This is a per-symbol price-position measure, not the SIO composite market-sentiment score. The Korean copy makes that distinction clearer than the source wording.
- The watchlist upgrade CTA uses `나만의 관심 종목 목록 만들기`, an action-oriented Korean phrase rather than a literal “unlock” construction.

## Source-copy issue to resolve separately

`home.methodology.pricePreview.description` in zh-TW and English loosely says to infer current market sentiment from a market index's level. The actual homepage preview is SPY-only and classifies its price against a trendline and ±1/±2 standard-deviation bands. The Korean candidate describes that implemented calculation rather than repeating the potentially misleading source wording. The zh-TW/EN source copy remains untouched and should be considered for a separate product-copy correction.

## Validation

- All 208 source keys matched a Korean candidate.
- The source placeholders and English fallbacks were already machine-audited; all candidate placeholders are preserved.
- The resulting master proposal remains a review artifact only. No Korean locale is registered or exposed.
