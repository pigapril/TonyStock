# English fallback gap audit

- Historical same-path gaps: 29
- Current missing fallback values: 0
- English-only keys/variants: 8
- All 29 current English values exist in `en/translation.json`; the current fallback validator reports zero unresolved key leaves.
- Korean candidates are included in the master proposal and remain pending user approval.

## Previous 29 fallback gaps

| Key | EN fallback | Korean candidate |
|---|---|---|
| `momentumDashboard.groups.global-markets` | Global markets | 글로벌 주식시장 |
| `momentumDashboard.groups.u-s-market` | US market | 미국 주식시장 |
| `momentumDashboard.groups.developed-markets` | Developed markets | 선진국 시장 |
| `momentumDashboard.groups.emerging-markets` | Emerging markets | 신흥국 시장 |
| `momentumDashboard.groups.china-market` | China market | 중국 시장 |
| `momentumDashboard.groups.real-estate` | Real estate | 부동산 |
| `momentumDashboard.groups.high-dividends` | High dividends | 고배당 |
| `momentumDashboard.groups.premium-income` | Premium income | 인컴 전략 |
| `momentumDashboard.groups.treasury-bonds` | US Treasury bonds | 미국 국채 |
| `momentumDashboard.groups.equal-weighted-sectors` | Equal-weighted sectors | 동일가중 섹터 |
| `momentumDashboard.groups.market-cap-weighted-sectors` | Market-cap-weighted sectors | 시가총액 가중 섹터 |
| `momentumDashboard.groups.consumer-discretionary` | Consumer discretionary | 경기소비재 |
| `momentumDashboard.groups.consumer-staples` | Consumer staples | 필수소비재 |
| `momentumDashboard.groups.energy` | Energy | 에너지 |
| `momentumDashboard.groups.finance` | Financials | 금융 |
| `momentumDashboard.groups.healthcare` | Healthcare | 헬스케어 |
| `momentumDashboard.groups.industrials` | Industrials | 산업재 |
| `momentumDashboard.groups.materials` | Materials | 소재 |
| `momentumDashboard.groups.technology` | Technology | 정보기술 |
| `momentumDashboard.groups.utilities` | Utilities | 유틸리티 |
| `momentumDashboard.groups.thematic` | Thematic investing | 테마 투자 |
| `redemption.actions.bind_payment` | Add a payment method | 결제 수단 등록 |
| `redemption.actions.contact_support` | Contact support | 고객 지원 문의 |
| `redemption.actions.try_another` | Try another code | 다른 코드 입력 |
| `redemption.actions.check_spelling` | Check the code spelling | 코드 철자 확인 |
| `home.methodology.historyPreview.kicker` | Historical performance | 과거 시장 흐름 |
| `home.story.blocks.sentiment.eyebrow` | Looking back at moments of market panic | 시장 공포가 극심했던 순간 돌아보기 |
| `payment.history.status.processing` | Processing | 처리 중 |
| `payment.result.clientReturn.message` | You have returned from the payment page. We are checking your payment status… | 결제 페이지에서 돌아왔습니다. 결제 상태를 확인하는 중입니다... |

## English-only extra keys and plural variants

- `momentumDashboard.assetCount_one`: {{count}} tracked
- `momentumDashboard.assetCount_other`: {{count}} tracked
- `momentumDashboard.periodScore`: Momentum score {{score}}
- `priceAnalysis.addToWatchlist.categoryTotal_one`: {{count}} category
- `priceAnalysis.addToWatchlist.categoryTotal_other`: {{count}} categories
- `priceAnalysis.addToWatchlist.stockCount_one`: {{count}} stock
- `priceAnalysis.addToWatchlist.stockCount_other`: {{count}} stocks
- `errors.DEFAULT_ERROR`: An unknown error occurred.
