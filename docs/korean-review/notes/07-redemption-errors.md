# 07-redemption-errors — Korean redemption and error-message review

- Coverage: 239/239 source keys matched and reviewed; no placeholder mismatches.
- 149 entries overlap the legacy redemption/subscription draft and match the master; 90 other keys are represented in the master candidate set.
- Definite corrections are recorded in `drafts/reviewed-overrides.ko-KR.json`.

## Corrections

- `redemption.errors.not_first_time_user`: use `이 코드는 처음 쿠폰을 사용하는 사용자만 사용할 수 있습니다.` The previous `최초 사용자` can mean a newly registered user; the source restricts first-time redemption of this code.
- `redemption.redeeming`: use `쿠폰 적용 중...` rather than `사용 중...`, which can mean that the coupon is currently in use rather than being applied.

## Cross-batch terminology

The redemption first-use error, admin first-time eligibility labels, and free-trial first-subscription restriction describe different eligibility rules. The Korean wording now distinguishes a first-time code user from an account with no prior subscription history.

- No runtime source or official locale was modified.
