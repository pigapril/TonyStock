# 08-indicator-pages — revised Korean copy review

- Base candidate retained unchanged: `docs/korean-review/drafts/08-indicator-pages.ko-KR.json` (136/136 keys).
- Revised copy: `docs/korean-review/drafts/08-indicator-pages.revised.ko-KR.json` (136/136 keys), pending user approval.
- Original source: `docs/korean-review/source/08-indicator-pages.json`.
- Every dynamic placeholder is preserved; brands, CFTC/CBOE/AAII/NAAIM, tickers, score thresholds and dates remain unchanged.

## Definite corrections

1. BofA thresholds: source says 8 이상 and 2 以下. Corrected `초과/미만` to `이상/이하` in the page description and methodology.
2. CNN thresholds: source says 25 以下 and 75 以上. Corrected `미만/초과` to `이하/이상`.
3. CNN high/low breadth component: removed `52주` because the Chinese source does not specify a 52-week lookback; do not add that definition without source data evidence.
4. COT `상업적 헤저` was unnatural transliteration; normalized to `상업적 헤지거래자`.
5. Fear & Greed terminology normalized to `공포·탐욕 지수` per the shared glossary.
6. The market-fear-breadth metric is labelled `극단적 공포 종목 비율` because it is a cross-sectional share of tracked securities in the extreme-fear band, not a time-propagating diffusion measure. Its particles and references are consistent throughout the page copy.
7. Technical market breadth is labelled `시장 폭` (with notes below; do not narrow it until the underlying formula is confirmed).
8. `개인 투자자` spacing normalized.

## Semantic questions to retain for approval

- `sentimentIndicatorPages.bofaBullBear.lede`: source uses investor positioning (bull or bear). Korean says 강세/약세 포지션. Confirm whether this underlying indicator is a positioning measure, rather than the broader investor sentiment construct.
- `sentimentIndicatorPages.bofaBullBear.relationToSio`: source `分批布局` is broader than buying only. Candidate says 분할 매수. Recommended revised wording: `분할 진입` to avoid assuming long exposure.
- `sentimentIndicatorPages.bofaBullBear.whatItIs`: `글로벌 주식시장의 시장 폭` is intentionally broad. Confirm the exact breadth statistic before choosing an advance/decline-specific term.
- `sentimentIndicatorPages.cnnFearGreed.lede`: source claims it is currently the most viewed/most watched sentiment indicator. Existing candidate softens this to 널리 알려진; retain only with evidence for the source superlative.
- `sentimentIndicatorPages.cnnFearGreed.whatItIs`: source says new highs/lows with no lookback specified; revised text removes the candidate's inferred 52-week period. Confirm if data source explicitly defines 52 weeks.
- `sentimentIndicatorPages.aaiiSurvey.history`: +30/-30 and historical extremes are labelled in percentage points (`%포인트`), not percent; confirm that the stored series is expressed in percentage points.
- `sentimentIndicatorPages.naaimExposure.whatItIs`: negative exposure can mean net short exposure; confirm whether Korean UI should say 순매도 포지션 or 공매도 포지션.
- `sentimentIndicatorPages.naaimExposure.history`: leveraged long exposure is described as a stock allocation above 100%, not literal net buying activity; confirm the exact percentage/exposure interpretation against the series definition.
- `sentimentIndicatorPages.cotSp500.whatItIs/history`: confirm the exact CFTC report family and report-category mapping (Legacy/Disaggregated/TFF), especially Leveraged Funds and Asset Manager/Institutional treatment.
- `sentimentIndicatorPages.taiwanFearGreed.whatItIs`: `券資比` is rendered descriptively as `신용융자 잔고 대비 신용대주 잔고 비율`, preserving the Taiwan-specific margin-loan versus securities-lending relationship. The actual numerator/denominator still needs product-owner confirmation.
- `sentimentIndicatorPages.taiwanFearGreed.whatItIs`: market breadth formula is not specified in the source wording; keep generic 시장 폭 until validated.
- `sentimentIndicatorPages.marketFearBreadth.history`: 과거 90백분위 means the reading is above approximately 90% of historical observation days, not 90% of securities in fear. This distinction is retained.
- `sentimentIndicatorPages.marketFearBreadth.whatItIs`: universe is 28 US-market ETFs and 38 large-cap Taiwan stocks; generic 종목군 is used where source says fixed universe.
- `sentimentIndicatorPages.marketFearBreadth.relationToSio`: status field label should match the final localized UI component label; currently proposed 상태 항목.

## Validation

- Exact key parity: 136/136.
- Placeholder parity: passed in the proposal assembly step.
- All text remains a candidate, not approved product copy.

## Final cross-check (2026-11-19)

- Independent review covered 136/136 source entries; base, revised, and master candidate keys align 136/136, with no placeholder mismatches.
- No further definite Korean corrections were found. BofA/CNN thresholds, AAII percentage-point units, NAAIM net-short and leveraged-long interpretation, Taiwan margin-to-short ratio, market-fear-breadth denominator, and COT generic category wording were checked against available code/definitions.
- `sentimentIndicatorPages.cnnFearGreed.lede`: the source's “currently the most viewed” superlative is softened to `널리 알려진` in Korean because no supporting viewership/ranking evidence is available in the repository. This source claim needs owner evidence before it is strengthened.
- `sentimentIndicatorPages.cotSp500.whatItIs` and `.history`: Korean retains generic participant labels. The repository does not identify whether the upstream data uses CFTC Legacy, Disaggregated, or TFF reports, nor verify the exact mapping for Leveraged Funds and Asset Manager categories. Confirm against the actual data pipeline/workbook before narrowing the terminology or certifying the 2021 classification statement.
