# 10–11 hardcoded UI and dynamic redemption copy — Korean proposal review

- Sources: `docs/korean-review/source/10-market-hardcoded-ui.json` (30 items) and `docs/korean-review/source/11-dynamic-redemption-copy.json` (22 items).
- Draft: `docs/korean-review/drafts/10-11-hardcoded-dynamic.ko-KR.json` (52 items).
- Every source object is retained unchanged with its Korean candidate. Review disposition/note fields record the corrections made after context checks; all candidates remain unreleased. No app source or locale resource was changed.
- Dynamic placeholders are preserved exactly, including `{{date}}`, `{{score}}`, `{{sentiment}}`, `{{hours}}`, `{{duration}}`, `{{unit}}`, `{{percentage}}`, `{{formattedAmount}}`, `{{planName}}`, `{{days}}`, and `{{minutes}}`.

## Context and terminology decisions

1. **`marketSentiment.recentReference`**
   - Final Korean: `최근 비교 기준`.
   - Context: this is the heading for the comparison strip that shows the previous day, week, month, and quarter readings; it is not a generic “reference value.”

2. **`marketPulse.dow`**
   - Final Korean: `다우존스 산업평균지수`.
   - Context: the market key is `dow`; the simplified Chinese label explicitly spells out the Dow Jones Industrial Average. The common Korean index name is therefore appropriate.

3. **`marketPulse.taiwan`** and **`marketSentiment.twBenchmarkAxis`**
   - Final Korean: `대만 가권지수` for both.
   - Context: the English source explicitly identifies TAIEX, so the Korean market-data name is sufficiently grounded and consistent.

4. **`twGaugeExplainer.section1.body`**
   - Final Korean: uses `신용융자·대주` for `融資融券`.
   - Reason: generic `신용거래` loses the distinction between margin financing and securities lending. `시장 참여도` remains broad because this sentence does not identify a specific breadth formula.

5. **`twGaugeExplainer.section2.body`**
   - Source: 「低分代表合成後偏向恐懼，高分代表偏向貪婪。」
   - Proposed Korean: 「점수가 낮을수록 종합 심리가 공포 쪽에, 높을수록 탐욕 쪽에 치우쳐 있음을 뜻합니다.」
   - Decision: retained. It accurately describes directional composite sentiment without introducing an absolute category classification.

6. **`benefit.default.highlight`**
   - Source: 「高級權限」 / “Premium Access”
   - Proposed Korean: 「프리미엄 이용 권한」
   - Decision: retained as `프리미엄 이용 권한`; this stays generic rather than claiming a named plan tier.

7. **`planName.premium`**
   - Source: 「高級方案」 / “Premium Plan”
   - Proposed Korean: 「프리미엄 요금제」
   - Decision: retained as `Premium 요금제`, matching the existing Korean plan-name helper and the app's `premium` plan type.

8. **`estimatedValue.prefix`**
   - Source: 「預估價值：{{formattedAmount}}」 / “Estimated Value: {{formattedAmount}}”
   - Final Korean: `예상 혜택 금액: {{formattedAmount}}`.
   - Reason: source context and the existing Korean formatter confirm that this is the estimated benefit amount, not an unqualified abstract value or proven savings.

## Validation

- Source item counts: 30 + 22 = 52.
- Output item count: 52.
- Every original object property and value retained; only `proposedKo` added.
- Placeholder parity: validated separately against each source item.
- No app source files or locale resources edited.

## Final candidate QA (2026-11-19)

- Independent review coverage: 30/30 market hardcoded entries and 22/22 dynamic redemption entries. All 52 IDs match the draft/master and all placeholders are preserved.
- `benefit.upgrade.description`: `{{planName}} 요금제로 업그레이드` is corrected to `{{planName}}로 업그레이드`, because the runtime formatter supplies a localized plan name that already includes `요금제`.
- `planName.free`: use `Free 요금제`, not `무료 요금제`, to preserve the product tier name and match the existing Korean plan-name helper.
- `estimatedValue.prefix`: use `예상 혜택 금액: {{formattedAmount}}`; the value is the estimated monetary benefit, not a generic abstract “value.” This matches the existing Korean formatter.
- `twGaugeExplainer.section1.body`: use `신용융자·대주` for Taiwanese `融資融券`; generic `신용거래` loses the distinction between margin financing and securities lending.
- The current market-copy resolver maps `ko-KR` to English for MarketPulse and the Taiwan gauge explainer; these candidates will not render in Korean until explicit Korean branches are wired. This is an implementation dependency, not a translation defect.
- `marketSentiment.recentReference`, `marketPulse.dow`, and the exact TAIEX display label remain source/UI context questions in the original note. Avoid assuming a different index or UI meaning without confirming the referenced data element.
- No runtime source or locale resources were edited.
