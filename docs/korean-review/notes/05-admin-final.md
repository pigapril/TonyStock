# 05-admin — Korean admin UX review

- Coverage: 409/409 keys reviewed. The dedicated 05 draft has exact key parity with the source; all values match the master proposal before the reviewed overrides below.
- Definite corrections are recorded in `drafts/reviewed-overrides.ko-KR.json`.

## Corrections

1. `admin.wizard.eligibility.firstTime` and `admin.codeDetails.eligibility.firstTime`: use `코드를 처음 사용하는 사용자` instead of `최초 사용자`. The eligibility is for users redeeming a code for the first time, not necessarily newly registered users.
2. `admin.paymentRetry.messages.retryExecuted`: use `재시도 실행 성공: %{message}`. The source reports successful execution, not merely an attempt.
3. `admin.paymentRetry.messages.jobTriggered`: use `재시도 작업 실행 성공: %{message}`. The source explicitly reports a successfully triggered retry job.

## Validation

- Placeholders, roles, permissions, statuses, eligibility labels, dates, numeric limits, manual retry confirmations, and bulk-operation warnings were reviewed.
- All 409 placeholders match the source.
- No runtime source or official locale was modified.
