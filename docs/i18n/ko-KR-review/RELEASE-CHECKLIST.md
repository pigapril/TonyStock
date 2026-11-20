# ko-KR implementation checklist — execute only after translation approval

This file records work required to enable Korean later. Nothing below is authorized before the complete review JSON and legal document have been approved.

## Locale registry and runtime resources

- Add `ko-KR` to the single locale registry with native label `한국어`, `intlLocale: 'ko-KR'`, writing-system metadata as appropriate, text-led social asset suffix, and fallback chain `['en']`.
- Browser detection must map `ko`, `ko-KR`, and all `ko-*` BCP-47 variants to `ko-KR`; explicit URL locale takes precedence.
- Register Korean in i18next supported languages and generated common/route loaders only after approval. Do not make a Korean request fall back to `zh-TW` or `zh-CN`.
- Add `한국어` to the language switcher only at release time.
- Preserve existing `/zh/*` compatibility and do not invent a legacy Korean URL alias. New canonical route prefix is `/ko-KR/*`.
- Generate Korean route resource chunks from the approved full review JSON, then verify exact source key, placeholder, array and markup parity.

## Dates, numbers, currency, finance and formatting

- Use `Intl` locale `ko-KR` for dates, time, numbers, percentages and numeric formatting; retain TWD/NT$ as the charged currency and never convert prices.
- Preserve stock tickers, ETF symbols, CBOE/AAII/NAAIM/COT/VIX/API identifiers and every source unit/threshold.
- Ensure Taiwan-specific indicator labels remain distinguishable from Korean market-system concepts.
- Re-run payment, subscription, invoice, trial, redemption and chart formatting tests for `ko-KR`.

## External services and backend language contracts

- Until each provider explicitly supports Korean, keep payment/ECPay payloads, transactional email, customer support FAQ, chatbot instructions, announcement data and invoice PDFs on explicit English fallback.
- Keep Korean application locale separate from service locale; do not let English backend content change the Korean front-end language.
- When a provider adds Korean, implement and test the provider-specific template/contract before changing the fallback.

## SEO, routes and assets

- Add Korean locale static shells, `404`, manifest and canonical route only after approval.
- Generate `lang="ko-KR"`, `og:locale="ko_KR"`, self-canonical and reciprocal hreflang entries only for pages whose Korean copy exists.
- Add Korean sitemap URLs and `x-default` mappings for real localized public routes only; verify reciprocal hreflang and canonical uniqueness.
- Generate text-led Korean social images unless genuine Korean screenshots exist. Never reuse Chinese-language screenshots.
- Exclude the Taiwan-specific sponsor page from Korean SEO, hreflang, manifest links and social assets unless its geographic/legal scope is explicitly expanded.
- Article index may link to actual English articles. Do not create `/ko-KR/articles/...` detail routes, canonical URLs or hreflang entries without translated Markdown content.

## Legal publication

- Obtain a legal review of `06-terms-privacy.draft.md` before publication.
- Resolve the source document's section 9.4 cross-reference to section 14 (other matters) versus its current reference to section 13 (governing law/disputes) in the legal source of truth, then propagate the approved correction consistently.
- Confirm the Taiwanese governing-law, Taipei court, Taiwan Personal Data Protection Act, NT$2 authorization, refund clauses and NT$3,000 liability cap remain legally equivalent.

## Final release gates

- Full recursive translation validator: 2,422 source string values, zero missing/extra keys, zero placeholder or markup mismatches, zero unintended blank values, array order/type preserved.
- Human review of natural Korean grammar (particles/endings), financial terminology, UI consistency, numbers/currency, factual qualifications and CJK residuals.
- Route/browser detection, menu, fallback, SEO/hreflang, static shells, manifest, social assets and legal page tests pass.
- Targeted front-end and backend regression tests pass for the Korean paths and all current locales.
- Production build succeeds; inspect warnings separately and verify no regression to en, zh-TW or zh-CN.
- Confirm `ko-KR` is absent from registry and public assets until all gates and explicit approval are complete.
