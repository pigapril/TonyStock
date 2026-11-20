# 03-market-sentiment — Korean language and finance terminology review

- Source inventory: 306 unique keys in `source/03-market-sentiment.json` plus 173 repeated records in `source/03-market-sentiment-missing.json`.
- Coverage: all 306 unique keys matched a Korean candidate; the 173 supplemental records duplicate keys and zh-TW values already present in the main batch.
- Definite corrections are recorded in `drafts/reviewed-overrides.ko-KR.json`.

## Definite terminology correction

Taiwanese `券資比` is not simply a short-selling balance ratio. It describes the securities-lending balance relative to the margin-financing balance. The previous Korean `공매도 잔고 비율` dropped the denominator and obscured the Taiwan-specific relationship. It is replaced with `신용융자 잔고 대비 신용대주 잔고 비율` in:

- `marketSentiment.tw.pageDescription`
- `marketSentiment.tw.keywords`
- `marketSentiment.tw.faq.a2`
- `marketSentiment.tw.faq.q6`

The related margin-maintenance term is standardized as `신용융자 담보유지비율` in the reviewed Taiwan-market copy. The backend indicator configuration confirms the margin-to-short ratio is short balance divided by margin-financing balance.

## Terminology retained

- `시장 폭` is retained for market breadth. It is a recognizable Korean financial term; in explanatory text the candidate also describes participation across rising and falling securities.
- `시장 심리` is used for market sentiment, reserving `투자자 심리` for cases explicitly referring to investors.
- SIO, BofA, AAII, NAAIM, CBOE, tickers, and technical identifiers remain unchanged.

## Validation

- 306/306 unique keys matched; the 173 supplemental rows are duplicates, not extra strings.
- No placeholder mismatches were found in the audited batch.
- All edits are candidate-only; the Chinese/English source and runtime code remain untouched.
