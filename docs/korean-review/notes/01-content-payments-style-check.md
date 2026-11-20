# 01-content-payments — substantive Korean copy style review

- Status: the 9 substantive prose entries passed the style gate and are included in the delegated editorial review; not released.
- Source draft retained unchanged: `docs/i18n/ko-KR-review/01-content-payments.draft.json`.
- This revision updates only 9 substantive prose entries. Existing labels and remaining batch keys stay in the retained draft.
- Target style: natural South Korean financial/product prose in 합니다체; short interface labels remain concise.
- Terminology: 시장 심리, 공포·탐욕, SPY, SIO and numeric scores retained.
- Protected placeholders: `{{start}}`, `{{end}}`, `{{count}}` retained exactly.

## Humanize Korean style gate

- Upstream: `epoko77-ai/im-not-ai`, Codex `humanize-korean` package, cloned into the task scratch directory; no project installation.
- Route: light, genre: report; `route_hint=light`, risk band low, risk score 0.
- Final deterministic gate: **OK**.
- Change rate: 11.27% (under 30% warning threshold).
- Numeric/name/quote/register checks: pass.
- Modality: deontic 1→1, hedge 4→4, lost pairs 0.
- Sentence touch rate 81.0% is informational only; no independent threshold triggered.
- An earlier gate run flagged a lost “참고할 수 있습니다” hedge; the copy was revised to retain this phrase and the rerun passed.

## Semantic notes

- `sentimentHistoryExamples.cases.pandemic.reading`: preserves that the exceptionally low scores cluster around the crash low and early rebound, and that they can serve as a reference when examining long-term opportunities during extreme fear. No assertion of causality was introduced.
- `sentimentHistoryExamples.cases.tightening.reading`: retains the distinction between the SIO low on 2022-10-03 and SPY's low on 2022-10-12; staged buying remains conditional.
- `about.section1Text` and `about.section2Text`: attribution and first-person viewpoint retained; no stronger performance or predictive claim added.
- `about.section3Text`: describes site purpose as helping users avoid emotionally driven chasing and panic selling, without promising prevention or outcomes.
- `about.jsonLdDescription` mirrors the visible page description by design.
