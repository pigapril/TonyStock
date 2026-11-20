# Korean translation review notes

## Taiwan-specific market terminology

| Source concept | Korean proposal | QA note |
|---|---|---|
| 券資比 | 신용융자 잔고 대비 신용대주 잔고 비율 | Translate descriptively as the ratio of the Taiwan market's 신용대주 balance to its 신용융자 balance. Do not call it a generic Korean short-interest ratio without explaining the Taiwan calculation. |
| 融資維持率 | 신용융자 담보유지비율 | Use the familiar Korean `담보유지비율` term, with `신용융자` to clarify that this is Taiwan's margin-financing metric. |
| 外資期貨淨未平倉 | 외국인 선물 순미결제약정 | Preserve the open-interest concept; do not simplify it to net buying or net selling. |
| 有效交易戶數偏離度 (189日) | 실제 거래 계좌 수의 189일 추세 대비 편차 | Keep the trend-deviation concept and 189-day window in the label or explanation. A plain `실제 거래 계좌 수` is incomplete. |
| 避險需求 | 안전자산 선호 지표 | Descriptive term; check the actual source formula (equity versus bond relative return) to avoid implying a direct survey of investor demand. |

Korean brokerage terminology distinguishes `신용융자` (credit-financed purchase) and `신용대주` (borrowed securities for sale), and uses `담보유지비율` for collateral-maintenance ratios. These terms are therefore suitable building blocks for clearly labeled Taiwan-market indicators; they do not imply that the underlying Taiwan market rules are identical to Korean brokerage rules.

## Translation consistency review

- Use `극도의 공포` / `극도의 탐욕` consistently for the five SIO sentiment bands. Some initial drafts used `극심한`; these were standardized to `극도의`.
- For Taiwan/US index identity, use `대만` and `미국`; never use `중국` for Taiwan.
- Keep all original percentages, years, indicator thresholds, date cutoffs, data sources and qualifications exactly as the source states them.
- The legal draft retains Taiwanese governing law and court jurisdiction. It is not localized to Korean law and requires legal review before publication.
- Subscription and payment-notification email templates and the customer-support ChatWidget/FAQ now have separate `en`, `zh-TW`, `zh-CN`, and `ko-KR` copy. Email locale selection honors an explicit notification preference, then the saved UI `returnLocale`, and only then the historical provider/service locale. Announcement body content remains in the language authored by the administrator. Invoice PDFs still use the existing English/Traditional-Chinese bilingual template rather than a Korean-localized document, and ECPay provider descriptions remain English for Korean users.

## Known source-copy issue for review

The existing Traditional Chinese terms document has a cross-reference in section 9.4 that refers to section 13 for "other matters", while the current document's section 13 is governing law and dispute resolution and section 14 is other matters. The Korean draft preserves the source reference rather than silently editing a legal cross-reference. This should be corrected in the source legal document through the normal legal review process before any language version is published.
