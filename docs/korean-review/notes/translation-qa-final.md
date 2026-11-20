# ko-KR Korean translation QA — final report

**Review and implementation status:** The 2,422 reviewed Korean resource strings and production-visible UI copy are now registered and implemented under `ko-KR`; frontend/backend tests and production build passed locally. The site has **not** been deployed. This remains an editorial/semantic review, not native-speaker certification or a Taiwan legal opinion.

## 1. Coverage

| Batch | Source coverage | Result |
|---|---:|---|
| `01-site` | 208 | All keys reviewed; 16 wording refinements selected |
| `02-price-tools` | 272 | All keys reviewed; 1 definite wording correction |
| `03-market-sentiment` | 306 unique + 173 repeated inventory rows | 306 unique keys reviewed; 4 ratio-description corrections |
| `04-momentum` | 261 | All keys reviewed; 1 RSI label correction |
| `05-admin` | 409 | All keys reviewed; 4 corrections (2 eligibility labels, 2 success messages) |
| `06-account-payment` | 434 | All keys reviewed; 2 eligibility corrections and 1 high-risk source/product disclosure issue |
| `07-redemption-errors` | 239 | All keys reviewed; 2 corrections |
| `08-indicator-pages` | 136 | All keys reviewed; no further definite Korean corrections; 2 data/source-claim blockers |
| `13-nested-array-string-leaves` | 157 | All array leaves reviewed; no definite Korean corrections; 3 source-claim blockers |

The direct-object batches total 2,265 keys. The 157 nested array leaves bring the full resource to **2,422 strings**. The additional 173 rows in `03-market-sentiment-missing.json` repeat the 306 unique market-sentiment entries; they are not additional distinct strings.

The separately inventoried hardcoded/dynamic set is **296 entries**: 244 AST candidates plus 30 market copy entries plus 22 dynamic redemption entries. All 296 received QA. The four PlanCard comparison tokens were not translated because they were code-logic strings; runtime access classification was migrated to stable semantic feature IDs instead. Production-visible market, redemption, subscription, announcement/admin, footer and action copy is localized; debug/log-only strings remain untranslated.

The complete Terms and Privacy draft and its legal metadata were also reviewed against the full Traditional Chinese source.

## 2. Core resource integrity

Latest `node docs/korean-review/build-proposal.js` result:

- Source strings: 2,422 (2,265 direct object keys + 157 nested array leaves).
- Korean candidates: 2,422/2,422; no blank candidates or missing keys.
- Placeholder mismatches: 0.
- English-fallback placeholder mismatches: 0.
- zh-CN key alignment: 2,422/2,422, with no missing or extra keys.
- English fallback resolution: all 2,422 source strings resolve; no missing fallback.
- Different source candidates are preserved as alternatives for 149 keys; none are silently discarded.
- All 2,422 entries carry `reviewed_by_delegated_editor_not_released` as an editorial provenance label; runtime Korean resources are now generated and registered separately.

Thirty-five final Korean wording decisions are centralized in `drafts/reviewed-overrides.ko-KR.json`; the proposal builder applies them at highest candidate priority while retaining the legacy candidates and alternatives. The original legacy proposal files were not overwritten.

## 3. Main language and semantic decisions

### Shared product language

- `시장 심리` = market sentiment; `투자자 심리` is reserved for references specifically about investors.
- `공포·탐욕 지수`, `시장 모멘텀`, `관심 종목`, and `LOHAS 5선 분석` are the preferred terms.
- US/Taiwan equity-market menus use `미국 증시` and `대만 증시`; TAIEX is `대만 가권지수`.
- Free and Pro plan names remain product-tier tokens (`Free 요금제`, `Pro 요금제`); brand and ticker names are preserved or rendered using common Korean company names.

### Taiwan-market finance terminology

- `融資維持率` is expressed as `신용융자 담보유지비율`.
- `券資比` is expressed as `신용융자 잔고 대비 신용대주 잔고 비율`, preserving both the short-balance numerator and margin-financing denominator. The former `공매도 잔고 비율` wording was insufficiently specific.
- `融資融券` in the Taiwan-market explanation is expressed as `신용융자·대주`, not generic `신용거래`.
- `시장 폭` is retained for market breadth; it is an established Korean finance term. Fear-breadth labels are more explicit (`극단적 공포 종목 비율`) where the calculation is a proportion of securities beyond the lower -2σ band.

### Quantitative indicators

- BofA boundary labels preserve 8-or-higher and 2-or-lower conditions; CNN boundary labels preserve 25-or-lower and 75-or-higher.
- AAII changes are expressed in percentage points (`%포인트`) where the figures are differences, not percentage values.
- NAAIM negative exposure is described as a net short position (`순매도 포지션`); exposure above 100% is described as leveraged long exposure.
- No unsupported 52-week window was added to the CNN new-high/new-low description.
- RSI at or below 30 is labelled `과매도 경향`, rather than the broader and less precise `약세 경향`.

### Homepage price preview

The home-page SPY preview measures SPY's current price relative to its trendline and standard-deviation bands. It is not the SIO composite market-sentiment index. The Korean description now explains the implemented price-position calculation. The existing zh-TW/English source copy is broader and should be reviewed separately for the same product-semantic distinction; source resources were not changed in this task.

## 4. Hardcoded and dynamic copy: implementation cautions

- `PlanCard.js` items 237–240 (source IDs `:521:237`, `:522:238`, `:529:239`, `:530:240`) were literal `feature.includes()` comparison tokens, not UI labels. The implementation replaces text matching with stable semantic feature IDs and keeps the source strings untranslated. Free's limited/disabled feature behavior is verified across the four locales.
- The two redemption-formatting `{{planName}}` templates now use `{{planName}}로 업그레이드`; `(으)로` was literal grammatical notation, and the runtime plan-name helper already returns values ending in `요금제`.
- The dynamic plan-upgrade line no longer duplicates `요금제`; Free tier stays `Free 요금제`; the estimated amount label is `예상 혜택 금액`; Taiwan `融資融券` is explicitly `신용융자·대주`.
- The “recent reference” label is `최근 비교 기준`, based on its actual role above previous-day/week/month/quarter comparison snapshots.
- Forty-one redemption-formatting strings are Chinese-branch/orphan candidates; corresponding Korean formatter branches already exist. They are reference candidates, not strings to replace blindly.
- MarketPulse and the Taiwan MarketSentiment explainer now have reviewed Korean branches and Korean market labels.
- AST source classification is 80 production-facing, 78 admin/preview-only, 41 dev/debug-only, and 45 orphan/non-Korean-branch or code-logic entries. The 244 AST items must not be treated as 244 public website labels.

## 5. Legal document review

The Korean draft is a language/fidelity draft only. It is not ready to serve as published Terms or a Privacy Policy without Taiwan legal review.

### Translator-side corrections made

- §1.2 `個人或實體`: changed the narrower `개인 또는 법인` to `개인 또는 단체` to preserve the broader source meaning.
- §4 `退刷或退款`: corrected the repeated “authorization cancellation” wording to `매출 취소(카드 취소) 또는 환불`; the exact ECPay operation term still needs payment-operator confirmation.
- §4 / §6.3: display amounts plainly as `NT$2` and `NT$3,000`, with no currency conversion or unnecessary phonetic rendering.
- §9.3: corrected the actor/trigger so it says the website terminates the agreement because the user breached it, rather than suggesting the user terminates it.

### Source-owner/legal blockers retained rather than silently changed

1. **§9.4 cross-reference error:** corrected in the active Traditional Chinese, Simplified Chinese and Korean documents. Governing law/disputes now points to §13 and other matters to §14. A legal professional should still confirm that the listed survival clauses are the intended ones.
2. **§14.6 heading/body mismatch:** corrected in Traditional Chinese, Simplified Chinese and Korean. The heading now describes electronic contract formation and legal effect (`電子契約之成立與效力` / `전자계약의 성립 및 효력`). The legal sufficiency of the consent method remains subject to Taiwan counsel review.
3. Taiwan governing law, Taipei District Court, Taiwan Personal Data Protection Act naming, refund restrictions, limitation of liability, class-action waiver, one-year claim period, user-content licence, privacy disclosures, third-party processing, and consent/notice UX require Taiwan counsel's full review.
4. The NT$2 no-charge guarantee must be confirmed against actual merchant operation. The revised backend checks ECPay credit transaction state and selects authorization abandon, close-cancel then abandon, or full refund; it retries and escalates unresolved cases to a CRITICAL manual-review alert. The source and translations still promise the user will not ultimately bear the fee. ECPay `DoAction` cannot be executed in its test environment, refunds may fail if merchant balance is insufficient, and live merchant-side testing was not performed. Product/payment and legal owners must verify the guarantee and handling runbook before launch; this must not be changed only in Korean.

### Legal integrity checks

- Source and Korean draft have 24 Markdown headings and the same numbered-clause sequence (30 subclauses).
- `support@sentimentinsideout.com`: 2 occurrences in each.
- `NT$2`: 3 occurrences in each; `NT$3,000`: 1 occurrence in each.
- ECPay, Taiwan governing law, Taipei court, and Taiwan data-protection references are retained.
- Numeric values, periods, dates, time zones and section numbers were compared. The machine-check result records exact numeric-sequence parity; the legal draft still requires professional legal review.

## 6. Factual claims requiring source-owner evidence

These are not Korean grammar problems. The Korean generally preserves the source meaning, but the source assertions should be evidenced or qualified before release:

1. `sentimentIndicatorPages.cnnFearGreed.lede`: the source calls CNN Fear & Greed the “currently most viewed” sentiment indicator. The Korean uses the more cautious `널리 알려진` because no viewership/ranking evidence was found. Confirm whether the superlative is substantiated and update all source languages consistently.
2. `sentimentIndicatorPages.cotSp500.whatItIs` and `.history`: the upstream CFTC report family and mapping for participant categories are not identifiable from the repository. The Korean keeps generic labels; verify the workbook/data pipeline before asserting a specific CFTC classification or taxonomy.
3. `marketSentiment.descriptions.composite.sections[0].content`: the source compares the comprehensiveness and accuracy of SIO with CNN. The comparative-accuracy claim needs methodology/evidence.
4. `marketSentiment.descriptions.composite.sections[1].content`: the source says historical readings near 10 coincided with bear-market bottoms and implies a nearby short-term low followed by a strong recovery. Verify the sample and avoid an unsupported forward-looking inference.
5. `sentimentIndicatorPages.marketFearBreadth.bands[2].meaning`: the source claims the best subsequent one-year performance historically after the extreme trigger. Provide a documented backtest period, universe, trigger definition and sample size.

## 7. Existing project checks and release status

- `ko-KR` is registered in locale config/i18next/LanguageSwitcher/App routes; 2,422 keys are present with zero unresolved fallback and zero placeholder mismatches.
- Full frontend Jest: **107 suites / 793 tests passed**. Full backend Jest: **149 suites / 1,730 tests passed**.
- Production build: successful (compiled with existing warnings). SEO generator wrote 83 files; sitemap has 82 URLs including 18 Korean routes, and all 18 Korean shells passed canonical/hreflang/manifest/OG checks. There are no Korean article-detail or Taiwan-only sponsor URLs.
- ECPay lifecycle targeted tests cover all documented transaction states, recovery, retries and escalation. No live `DoAction` transaction or production deploy was performed.
- `git diff --check` passes for this task's edited files. There is one unrelated pre-existing whole-tree whitespace finding at `frontend/src/components/Common/Dialog/Dialog.js:112`.

## Final disposition

The reviewed Korean core resources, market copy, subscription copy, production-visible announcement/admin actions, route fallback and SEO assets are implemented locally and tested. Remaining publication gates are Taiwan legal review, live ECPay merchant validation and manual refund operations, evidence for the listed market-data claims, and optional final native-speaker proofing. Korean articles, emails/support FAQ and invoice PDFs still use clearly identified English content/fallback where no Korean source is published. No changes have been committed, pushed or deployed.
