# 09-hardcoded-ui Korean review notes

**Status:** all 244 candidates received delegated editorial QA; not released. No runtime code, official locale, or source inventory was changed.

## Inventory and classification

The source inventory contains 244 AST candidates. The JSON draft preserves every source object and its translation candidate; reviewed entries also carry review disposition/status notes where needed.

| Classification | Count | Source items / evidence |
|---|---:|---|
| Production user-facing candidates | 80 | Items 99–102 (footer disclaimer, redemption consent, sponsor alt text); 103–166 (market sentiment labels, explanations, and market index names); 218–227 (subscription loading/error fallback and free-trial dialog copy); 236 (upgrade button fallback); 241 (monthly price display). These item ranges are 1-based positions in the source array. |
| Admin-only | 78 | Items 1–76 are in `Admin/AnnouncementManager`; items 77–78 are the close-button `aria-label` and `title` in `Common/AnnouncementBar/AnnouncementBarPreview.js`. That component's source comment explicitly says it is used by the admin preview, so those two entries are not public announcement UI. |
| Dev/debug only | 41 | Items 79–98 are in `AnnouncementDevTools.js`, which returns `null` outside `NODE_ENV === 'development'`; items 208–217 and 228–235 are `console.log` / `console.error` diagnostics in subscription components; items 242–244 are the cooldown log and its formatted value, called only by the development-only diagnostic path. |
| Orphan / non-Korean-branch candidates | 45 | Items 167–207 are Chinese-only literals in `utils/redemptionFormatting.js`; the same functions already have explicit `ko-KR` branches, so these source literals are not the active Korean output path. Items 237–240 in `PlanCard.js` are `feature.includes()` comparison tokens, not visible labels; translating them without ensuring exact parity with the Korean feature strings can change free-plan restriction logic. |

**Count check:** 80 + 78 + 41 + 45 = 244.

## Semantic questions and implementation cautions

1. **Taiwan market naming:** The proposal uses `대만 시장` as the general market term, `대만 가권지수` for TAIEX, and `대만 시장 공포·탐욕 지수` for the composite. Confirm whether product terminology should consistently use `대만 주식시장` instead of the shorter `대만 시장`, and whether the product name should include `주식시장`.
2. **Credit-market terminology:** `融資融券` is Taiwan-specific margin financing / short-selling terminology. The draft uses `신용융자·대주`; confirm whether Korean readers familiar with Taiwan markets would prefer Taiwan-local terminology such as `융자·융권` instead.
3. **Options and index labels:** `選擇權` is rendered as `옵션`; TAIEX as `대만 가권지수`; KOSPI, Nikkei 225, Hang Seng, Shanghai Composite, Dow Jones Industrial Average, and FTSE 100 use their common Korean market names. Confirm any house style for index names. For `樂活五線譜`, the proposed matching label is `로하스 5선 차트`; confirm whether the product name should instead use an established Korean brand term.
4. **MarketPulse locale wiring:** `MarketPulse.js` currently chooses `zh` for any Chinese locale and English for all other locales. The proposed Korean index names are production UI candidates, but the current component has no Korean-name branch; this JSON alone does not activate them.
5. **MarketSentimentIndex locale wiring:** Several literals use `zh-TW` / `zh-CN` branches and otherwise fall back to English. The Korean proposals are candidate copy for a future `ko-KR` branch, not currently rendered Korean text.
6. **Redemption formatter duplicates:** The 41 `redemptionFormatting.js` entries are Chinese branch strings. The functions already contain explicit `ko-KR` output for relative time, time units, extension, discount, benefit, countdown, plan naming, and estimated benefit amount. Treat these entries as reference/orphan candidates rather than replacing the existing Korean branches. Proposed wording is aligned where practical with the existing Korean behavior.
7. **PlanCard feature comparison tokens:** Items 237–240 are not UI copy. `PlanCard.js` compares feature text against exact Chinese and English substrings to determine disabled/limited Free-plan features. Korean feature labels will not match unless the logic is updated with the exact Korean strings or, preferably, stable feature identifiers. Do not apply these proposed strings as a blind text-only replacement.
8. **Subscription fallback strings:** The loading, error, trial dialog, and upgrade strings are `t(key, fallback)` values. They are displayed when the relevant locale key is unavailable; the Korean proposal can serve as fallback/reference copy, but the locale key should remain the source of truth when a Korean locale is introduced.
9. **Temporary free-trial claim:** The trial dialog says all Pro features are currently free and that charging will begin later. Confirm that this offer and future-pricing statement are still accurate before any production use.
10. **Currency:** The hardcoded comparison price keeps `NT$` intentionally; translating the UI language should not silently convert the underlying TWD amount to KRW.
11. **Footer legal wording:** The source distinguishes sharing links from reproducing site content. The proposal preserves that distinction; confirm the final legal wording against the site's approved Korean terms and contact address.
12. **Placeholders and dynamic values:** Keep every `{{...}}` expression exactly as supplied, including expression-style placeholders and `plan.id` / billing-period tokens. Do not translate identifiers such as `SubscriptionPlansPage`, `PlanCard`, `PaymentPage`, `planAdjustments`, `pricingData`, or `hasRedemptionDiscount` inside diagnostic strings.

## Translation conventions

- Body copy uses natural Korean finance/product language; compact controls use concise noun or action labels.
- The requested CJK source labels and market names are translated, not carried over as Simplified Chinese strings.
- Numerals, date/amount values, `NT$`, emojis, code identifiers, and interpolation placeholders are retained where they carry meaning.
- No `src/locales/ko-KR` official locale file currently exists in this checkout. No official locale, runtime, component, or source file was edited. Both output files remain pending approval.

## Final candidate QA (2026-11-19)

- Independent review coverage: 244/244 AST entries. All 244 IDs align with the source inventory and draft; placeholder parity passed.
- `src/utils/redemptionFormatting.js:399:185` and `:399:186`: `{{planName}}(으)로 업그레이드` was corrected to `{{planName}}로 업그레이드`. The actual plan-name helper already returns `Free/Pro/Premium 요금제`; the literal `(으)` notation is not valid user-facing text, and `로` is the correct particle for these vowel-ending plan-name strings.
- Four `PlanCard.js` items (source array entries 237–240; IDs `:521:237`, `:522:238`, `:529:239`, `:530:240`) are marked `blocked_until_stable_feature_ids`. They are `feature.includes()` comparison tokens, not visible UI labels. Do not replace them with Korean copy until the Free-plan feature detection is migrated to stable identifiers or all locale strings are mapped consistently.
- The 41 redemption-formatting entries remain reference/orphan candidates because existing Korean-specific branches already exist; they must not be blindly substituted for the Chinese source branch.
- The 80 production-facing, 78 admin/preview, 41 dev/debug, and 45 orphan/non-Korean-branch or logic-token classifications are preserved; this 244-item set is not 244 public website labels.
