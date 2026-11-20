# 06-account-payment — Korean payment and subscription UX review

- Coverage: 434/434 source keys matched and reviewed; no placeholder mismatches.
- Definite corrections are recorded in `drafts/reviewed-overrides.ko-KR.json`.

## Correction

`freeTrial.errors.notEligible` and `cardTrial.errors.notEligible` now use `무료 체험은 이전에 구독한 적이 없는 계정에만 제공됩니다.` The previous `최초 구독 계정` can be read as a newly subscribing account or a currently active subscriber. The backend eligibility check excludes any account with a prior subscription record, so the revised wording is more explicit.

## High-risk product/legal disclosure issue — not a translation error

The source and current translations for `cardTrial.disclosure.verification` and `cardUpdate.disclosure.verification` say the NT$2 card-verification amount will not be charged. The backend does not guarantee this in every path:

- `boundCardTrial.service.js` sends an actual NT$2 payment amount.
- `boundCardVoid.job.js` tries to abandon the authorization and then refund it if abandonment fails.
- After three unsuccessful attempts, the payment remains captured and the system raises a CRITICAL alert stating that the user was charged, despite the no-charge UI promise.
- A separate reconciliation path also alerts when the verification trade number cannot be recovered and the charge cannot be voided automatically.

The Korean candidates faithfully reflect the source, so they should not be silently softened or changed independently. The product owner and Taiwan legal reviewer must decide whether the payment flow should be changed or whether all-language disclosure should be updated to explain the NT$2 temporary charge and its reversal/refund process. Until then, the “will not be charged” statement is not a fully reliable promise.

## Validation

- Account eligibility, trial and paid subscription terms, card binding/update flow, renewal dates, amounts, cancellation, failure states, and placeholders were checked against the frontend/backend code.
- No runtime source or official locale was modified.
