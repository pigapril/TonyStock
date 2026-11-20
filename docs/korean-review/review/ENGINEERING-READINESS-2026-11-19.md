# ko-KR Engineering Readiness — 2026-11-19

**Status:** Engineering preparation only. Korean copy remains unapproved; `ko-KR` is not registered, selectable or publicly routable. No production deploy, commit or push was performed.

## 1. Translation review boundary

- `source/01-site.json`: 208 source keys.
- `review/01-site-review-candidate.json` and `.md`: 208/208 reviewed; no missing, extra or duplicate keys; 13 recommendations differ from the prior candidate; all 208 entries remain `pending_user_approval`.
- `review/01-site-independent-qa.json` preserves the separate full-batch QA output.
- Existing complete proposal: 2,422 zh-TW string leaves, with a Korean candidate for every entry. Its current machine status is `reviewed_by_delegated_editor_not_released` for all 2,422 entries: none are approved or released to production. This status is retained as found; it is not rewritten as user approval.
- Existing hardcoded/dynamic proposal: 296 items. Its status is mixed: 292 are `reviewed_by_delegated_editor_not_released` and 4 are `blocked_until_stable_feature_ids`; none are released. Preserve these source statuses rather than relabeling them as approved.
- Next translation review batch is `source/02-price-tools.json` (272 keys), followed by the existing market sentiment, momentum, account/payment, redemption, admin and legal sequence. The 296 hardcoded/dynamic items remain a separate review stream.

## 2. Plan and permission behavior

`PlanCard` already derives Free/Pro behavior from stable `plan.id` values rather than the translated display name. A regression test now supplies a Pro ID with a deliberately misleading `name: 'Free'` and verifies that the Pro trial entry remains selected. No plan permissions or production card behavior was changed.

## 3. Direct market UI copy

Added `src/components/MarketSentimentIndex/marketLocaleCopy.js` as the single resolver for direct-generated market UI copy. Existing en, zh-TW and zh-CN strings remain explicit. Legacy `zh` resolves to zh-TW; any unsupported/unapproved locale resolves to English. The resolver is used by `marketConfigs`, MarketSentimentIndex, MarketSentimentGauge, SharedSentimentHistoryChart and MarketPulse. Taiwan and US gauge/benchmark names remain market-specific. No Korean wording has been added.

## 4. Frontend test failures fixed

- Market sentiment CTA no longer advertises a free trial to a signed-in account while that account's eligibility request is still pending. The CTA appears only after a successful eligibility result for that exact account.
- Jest now transforms Axios ESM JavaScript only, while retaining CRA's CSS transform rules. A broad transform-ignore exception initially affected `react-datepicker` CSS and was narrowed before the full suite was rerun.
- The two deferred market sentiment tests now include the real `DialogProvider`, required by the component's `useDialog` hook.
- The Taiwan deferred-loading test uses a non-intersecting JSDOM `IntersectionObserver`, since JSDOM has no real layout. The test still verifies that history/detail requests occur only after the relevant UI activation.
- Article retrieval failures now retain the actual fallback content locale (`en`) in article metadata instead of falsely marking an unsupported route locale. This prevents missing English Markdown from creating false Korean article-language metadata.

## 5. Payment, callback and email locale contracts

The app route locale and third-party service/email locale are separate fields:

- Payment/ECPay language remains `en` for Korean requests because the provider currently supports only `en` and `zh-TW`.
- The validated `returnLocale` is persisted in checkout order metadata and copied to subscription metadata on normal ECPay subscription creation and recovery.
- No-card free trials and bound-card subscriptions also persist `returnLocale` independently from the outbound service language.
- Bound-card trial-start, reminder and subscriber notification emails retain English templates while their subscription-management links use the saved route locale.
- The generic recurring-payment failure and expiry notification paths now use `notificationReturnLocale` for the link while `notificationLanguage` continues to select the email template. Older records without `returnLocale` fall back to their stored service locale.
- `normalizeReturnLocale` accepts only `en`, `zh-TW`, `zh-CN` and `ko-KR`; unknown values cannot become arbitrary URL path segments.
- Invoice PDF output remains English for unsupported service locales, with Gregorian dates and Taipei time. Traditional Chinese invoice date presentation remains unchanged.

Customer support FAQ/chatbot payloads and announcement data do not currently have verified Korean templates. These services intentionally use English fallback while the Korean app UI will remain separately localized once approved. Email notifications likewise use English fallback. These are provider/service limitations, not approval to display Traditional or Simplified Chinese as Korean.

## 6. SEO, articles, manifests and social assets

- The official locale registry and language switcher contain only en, zh-TW and zh-CN. `ko-KR` exists only as an Intl-formatting locale and is not a canonical app locale.
- The SEO shell generator still builds only the three supported locales. The build sitemap contains zero ko-KR URLs and zero ko-KR hreflang entries; no Korean manifest, static shell, Open Graph locale, sitemap URL or social-card image is emitted.
- The build's zh-CN home shell retains `lang="zh-CN"`, `/manifest.zh-CN.json` and `og:locale="zh_CN"`.
- Article Markdown currently exists in English and Traditional Chinese. Unsupported locales receive English article content, and both successful and failed fetch fallback objects retain `lang='en'`. Do not create Korean article-detail URLs, canonical links or hreflang until actual Korean Markdown is approved and added.
- The sponsor page is Taiwan-specific and stays outside any future Korean SEO/social rollout unless the business/legal scope is explicitly changed.

## 7. Legal-source finding — section 9.4

The production source `public/docs/T&C/zh-tw_T&C_20261008.md` is byte-identical to `source/12-legal-terms.source.zh-TW.md`.

Section 9.4 says that section 11 is “準據法與爭議解決” and section 13 is “其他事項”. The actual headings are:

| Number | Actual heading |
|---|---|
| 11 | 不可抗力 |
| 13 | 準據法與爭議解決 |
| 14 | 其他事項 |

Therefore both references in 9.4 have incorrect section number/title pairings: its reference to 11 as governing law is wrong, and its reference to 13 as other matters is wrong (other matters is section 14). The legal source, Korean draft and this engineering review preserve the source wording pending legal-owner review. No legal clause, numbering or legal effect was edited, and no legal approval is implied.

## 8. Verification

- Frontend full Jest suite after the deferred-detail activation fix: **106 suites, 780 tests passed**. All originally reported three failures are resolved; no tests were skipped or weakened.
- Backend notification/payment/checkout/callback/trial/bound-card targeted suite: **11 suites, 93 tests passed** after the separate return-locale metadata additions.
- Frontend free-trial/article fallback/market-copy tests after their final changes: **3 suites, 14 tests passed**. Backend invoice and customer-support fallback suites were checked earlier; the latest 11-suite run covers all changed notification/payment routes.
- `generate-locale-resources.js --check`, `verify-i18n-keys.js` and `git diff --check` passed at final verification. Registered locales remain en, zh-TW and zh-CN; across 2,422 source string leaves, unresolved fallback keys = 0 and placeholder mismatches = 0.
- Production build completed with exit code 0 (`Compiled with warnings`). Warnings are existing ESLint/legacy dependency/browser-data warnings; there were no compile errors.
- `generate-seo-shells.js` wrote 65 files and passed its coverage check: **63 active sitemap URLs**, 3 locales × 19 public routes, with reciprocal hreflang. A legacy English sponsor URL exists only inside an XML comment; stripping comments leaves the intended Taiwan-only sponsor URL as the sole active entry.
- No ko-KR registry/menu/public route/manifest/sitemap/hreflang/social asset was added.

## 9. Still pending

- User approval of all 208 site-copy entries, then the next 272 price-tools entries and remaining translation batches.
- Human review and approval of the complete 2,422-string Korean proposal, all 296 hardcoded/dynamic candidates and the separate full legal document.
- Legal-owner decision on the source section 9.4 cross-reference.
- Korean service/email/FAQ/chatbot/announcement templates remain future work; until then, English service fallback is intentional.
- Engineering readiness checks are complete for this round. Do not enable or deploy Korean during translation review.
