---
title: LOHAS Five-Line Analysis Tested on 5.8 Million Daily Bars
category: Tool Guides
date: 2026-08-30
description: We ran 1,257 tickers and 5.8 million daily bars, going back to 1931. "Extreme Greed" fires roughly every ten days, sentiment and the LOHAS Channel disagree about half the time, and the days worth watching are the six a year when both hit their extreme — a setup that has failed only once since 1990, in 2008.
keywords: LOHAS Five-Line, LOHAS Channel, mean reversion, standard deviation channel, market sentiment, backtest, technical analysis, RSI, MACD, 0050, SPY, Taiwan stocks
readingTime: 16
---

We have used the LOHAS Five-Line for a long time, and we have written about [how to read it](https://sentimentinsideout.com/en/articles/analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis). Use it long enough and some questions come up:

How often does the "Extreme Greed" label actually appear? Sentiment and the LOHAS Channel sit in separate places on the page — are they telling you two different things? When you see "Extreme Fear", what usually happens next? And that widely repeated piece of advice — after price breaks below the channel, wait for it to come back inside before you act — is it really the better deal?

This time we ran 1,257 tickers and 5.8 million daily bars, with data going back to 1931. Several results came out differently from what we expected.

## Contents

1. [The conclusion first: what each combination means](#the-conclusion-first-what-each-combination-means)
2. [Which instruments this tool suits](#which-instruments-this-tool-suits)
3. [How we tested it](#how-we-tested-it)
4. ["Extreme Greed" shows up every ten days](#extreme-greed-shows-up-every-ten-days)
5. [The two charts disagree half the time](#the-two-charts-disagree-half-the-time)
6. [The 6 days a year when both are extreme](#the-6-days-a-year-when-both-are-extreme)
7. [The 12 days a year when only sentiment is extreme](#the-12-days-a-year-when-only-sentiment-is-extreme)
8. [When sentiment reads Extreme Greed](#when-sentiment-reads-extreme-greed)
9. [2008 is the one exception](#2008-is-the-one-exception)
10. [After a break below the channel, is waiting worth it?](#after-a-break-below-the-channel-is-waiting-worth-it)
11. [Do RSI, MACD or volume help?](#do-rsi-macd-or-volume-help)
12. [What these numbers cannot be used for](#what-these-numbers-cannot-be-used-for)

## The conclusion first: what each combination means

The "Market sentiment" and "LOHAS Channel" fields on the page combine into four states worth paying attention to. Using index ETFs (0050, SPY, QQQ and similar) as the reference:

| What you see on the page | Days per year | Next month, avg gain | Ordinary | Up rate | Next 3 months | Ordinary |
|---|---|---|---|---|---|---|
| **Extreme Fear + Short-term oversold** | 6 | **+3.3%** | +0.9% | **69%** | **+7.0%** | +2.6% |
| Extreme Fear, channel still normal | 12 | +0.6% | +0.9% | 54% | +3.2% | +2.8% |
| Extreme Greed, channel still normal | 15 | +1.6% | +1.1% | 64% | +4.8% | +3.2% |
| **Extreme Greed + Short-term overheated** | 16 | **+0.3%** | +1.1% | 54% | +3.1% | +3.3% |

In plain terms:

| Combination | What it means |
|---|---|
| Extreme Fear + Short-term oversold | The one row worth watching. Gains run three to four times ordinary, and seven times out of ten the period closes higher |
| Extreme Fear, channel still normal | Twice as common, yet gains less than ordinary and falls further along the way. The worst time to act |
| Extreme Greed, channel still normal | The run usually isn't over — three quarters of these periods close higher over three months |
| Extreme Greed + Short-term overheated | Up 0.3% over a month, with odds close to a coin flip. Not a crash signal — a flat one |

If you remember one thing: **when you see "Extreme Fear", there is no need to rush. Wait for the LOHAS Channel to turn "Short-term oversold" as well.**

The rest of this article covers where those numbers come from, and what happened when we tested a few widely repeated claims.

## Which instruments this tool suits

The tool was designed for index ETFs, but does it work on single stocks? We split six categories and looked at the month after "Extreme Fear + Short-term oversold", and the month after "Extreme Greed + Short-term overheated":

| Group | Tickers | After Fear + oversold | Ordinary | Multiple of ordinary | Up rate | Tickers pointing the same way |
|---|---|---|---|---|---|---|
| Index ETFs | 37 | +3.3% | +0.9% | 3.7× | 69% | 29 / 37 |
| Broad indices | 23 | +2.5% | +0.8% | 3.1× | 65% | **20 / 23** |
| Other ETFs | 66 | +3.7% | +1.0% | 3.7× | 63% | 48 / 66 |
| US single stocks | 417 | **+4.3%** | +1.3% | 3.3× | 65% | 324 / 417 |
| Taiwan single stocks | 296 | +3.2% | +1.5% | **2.1×** | 63% | **180 / 296** |
| Other overseas stocks | 233 | +3.5% | +1.3% | 2.7× | 63% | 155 / 233 |

| Group | After Greed + overheated | Ordinary | Tickers that weakened |
|---|---|---|---|
| Index ETFs | +0.3% | +1.1% | 29 / 39 |
| Broad indices | +1.1% | +0.8% | **9 / 23** |
| Other ETFs | +0.5% | +1.4% | **64 / 87** |
| US single stocks | +0.8% | +1.8% | 303 / 470 |
| Taiwan single stocks | **+2.2%** | +1.6% | 152 / 324 |
| Other overseas stocks | +0.9% | +1.4% | 150 / 259 |

The ticker counts here are lower than the group totals in "How we tested it", because some tickers never reached this state, or reached it too rarely to measure.

The "tickers pointing the same way" column matters. If a few names are extreme, the average looks good but tells you nothing; the higher the ratio, the more general the effect.

In one line each:

| Group | How well it fits |
|---|---|
| **Broad indices** | Most reliable on the cheap side, 20 of 23 pointing the same way. No value on the expensive side (only 9 of 23 weakened) |
| **Index ETFs** | Works on both sides. Cheap side runs 3.7× ordinary; on the expensive side 29 of 39 weakened |
| **Other ETFs** (dividend, leveraged, sector) | Works on both sides, and the fade after overheating is the clearest of any group (64 of 87) |
| **US single stocks** | Largest gains on the cheap side (+4.3%), with high consistency. Usable |
| **Other overseas stocks** (HK, Japan, Korea, China A) | Close to US single stocks, slightly weaker |
| **Taiwan single stocks** | Weakest on the cheap side (2.1× ordinary, 180 of 296 same way); on the expensive side prices keep rising (+2.2%, above ordinary) — the opposite of every other market |

**Index ETFs and broad indices are where this tool is steadiest**, which matches what it was designed for. Single stocks work too, with two caveats: they are more volatile to begin with, so the same signal comes with deeper drops along the way; and Taiwan single stocks chase strength, so the expensive side cannot be read the way it is in other markets.


## How we tested it

The data is 1,257 tickers and 5,762,776 daily bars, from 1931 through August 2026. We split it into six groups, because different kinds of instruments behave very differently:

| Group | Tickers | Examples |
|---|---|---|
| Index ETFs | 40 | SPY, QQQ, VOO, 0050, 006208 |
| Broad indices | 23 | S&P 500, TAIEX, Hang Seng, Nikkei, FTSE 100 |
| Other ETFs | 94 | 0056, 00631L, VYM, XLK |
| US single stocks | 494 | Apple, Johnson & Johnson, Ford, American Airlines |
| Taiwan single stocks | 336 | TSMC, China Steel, Formosa Plastics, Yang Ming |
| Other overseas stocks | 270 | Hong Kong, Japan, Korea, China A-shares |

The single-stock groups are everything in our database with at least five years of history, unfiltered. That matters: pick only Apple, Microsoft and Nvidia and any "buy the dip" rule looks brilliant.

The calculation matches what the site runs. The Five-Line fits a regression over 3.5 years of data and draws the trend line plus one and two standard deviations either side; the LOHAS Channel resamples to weekly bars, averages the highs and lows over 20 weeks, and widens the band by volatility. **Every day is recomputed using only data available up to that day** — no future prices leak in.

How to read the tables:

| Column | Meaning |
|---|---|
| Avg gain | Average return over the following 20 trading days (about a month) or 60 trading days (about three months), measured from the qualifying days |
| Ordinary | The same ticker's average return over the same horizon across all days, as a reference point |
| Up rate | How often that period ended higher |

Each ticker is averaged first, then averaged across tickers, so a handful of names cannot drive the result.

## "Extreme Greed" shows up every ten days

Start with the basics: how often do these labels appear?

| Group | Extreme Fear | Fear | Neutral | Greed | Extreme Greed |
|---|---|---|---|---|---|
| Index ETFs | 8.2% | 13.3% | 44.5% | 23.1% | 10.9% |
| Broad indices | 8.4% | 13.3% | 45.3% | 22.2% | 10.9% |
| Other ETFs | 7.3% | 12.8% | 43.2% | 24.5% | 12.1% |
| US single stocks | 7.9% | 14.2% | 43.8% | 21.4% | 12.7% |
| Taiwan single stocks | 6.0% | 16.8% | 47.8% | 17.0% | 12.4% |

"Extreme Greed" covers 11% to 13% of trading days — roughly one day in ten. "Extreme Fear" runs 6% to 8%.

If price deviations followed a bell curve, the region beyond two standard deviations would cover 4.6% of days. In practice both tails together come to 17–20%, four times that. Extreme deviations happen more often than the theory allows, and trends persist: after price runs too far it often keeps running, so the label stays lit for weeks at a stretch.

That explains a common frustration — you see "Extreme Greed" and the price climbs for another three months. The label was never a rare event. **On its own, it carries much less information than it looks like it does.**

## The two charts disagree half the time

Sentiment and the LOHAS Channel are both describing whether price looks stretched. Are they the same thing?

The direct question: when sentiment is already at Extreme Fear or Extreme Greed, how often is the channel also at its extreme?

| Group | Channel also extreme |
|---|---|
| Index ETFs | 48% |
| Broad indices | 50% |
| Other ETFs | 49% |
| US single stocks | 44% |
| Taiwan single stocks | 46% |

About half. Half the time the two charts say the same thing; the other half, one of them is still in normal territory.

That is a better result than we expected. If the two overlapped almost completely, the second chart would be redundant; if they were unrelated, combining them would be meaningless. Half overlap means **they share a core and each adds something the other misses** — and the shared core turns out to be the useful part.

## The 6 days a year when both are extreme

Sentiment reads "Extreme Fear" and the LOHAS Channel is also "Short-term oversold":

| Group | Next month | Ordinary | Up rate | Next 3 months | Ordinary | Up rate |
|---|---|---|---|---|---|---|
| Index ETFs | **+3.3%** | +0.9% | 69% | **+7.0%** | +2.6% | 70% |
| Broad indices | **+2.5%** | +0.8% | 65% | **+5.8%** | +2.4% | 69% |
| Other ETFs | **+3.7%** | +1.0% | 63% | **+7.6%** | +3.1% | 70% |
| US single stocks | **+4.3%** | +1.3% | 65% | **+8.8%** | +4.0% | 68% |
| Taiwan single stocks | **+3.2%** | +1.5% | 63% | **+6.0%** | +4.5% | 62% |

The one-month average is three to four times ordinary, and the hit rate rises from just over half to around 65%. Of 37 index ETFs, 29 point the same way — this is not a handful of names carrying the result.

The state appears on about 6 trading days a year, and those days come in a cluster: 0.7 episodes a year on average, each lasting about a week before price bounces or the channel returns to normal. **That is roughly one occasion every eighteen months.**

One cost is worth stating plainly: **this does not mean it goes up tomorrow.**

| Deepest drop over the following 3 months | |
|---|---|
| Extreme Fear + Short-term oversold | −8.0% |
| Ordinary level | −6.1% |

Price falls another 8% on average before it recovers. Anyone who backs up the truck on the signal will have an uncomfortable stretch in between.

## The 12 days a year when only sentiment is extreme

Same "Extreme Fear", but the LOHAS Channel is still in normal range:

| Group | Next month | Ordinary | Up rate | Next 3 months | Ordinary |
|---|---|---|---|---|---|
| Index ETFs | +0.6% | +0.9% | 54% | +3.2% | +2.8% |
| Broad indices | +0.1% | +0.8% | 53% | +1.7% | +2.4% |
| Other ETFs | +1.1% | +1.1% | 58% | +4.0% | +3.3% |
| US single stocks | +2.0% | +1.4% | 59% | +4.7% | +4.0% |
| Taiwan single stocks | +1.8% | +1.5% | 57% | +5.8% | +4.8% |

For index ETFs and broad indices the following month is slightly *worse* than ordinary, and the hit rate is barely better than a coin flip. Meanwhile this state occurs twice as often as the one above.

One more number that is easy to miss:

| Deepest drop over the following 3 months | |
|---|---|
| Only sentiment extreme | −9.2% |
| Both extreme | −8.0% |
| Ordinary level | −6.1% |

**More volatility, less reward.** So when you see "Extreme Fear", there is no need to rush — what carries the numbers is the days when the LOHAS Channel turns "Short-term oversold" as well.

## When sentiment reads Extreme Greed

The cheap side of the range has a clear effect; the expensive side is often said to have none. In fact it has one too — it points down, and it is weaker.

**Sentiment at "Extreme Greed" and the channel also "Short-term overheated":**

| Group | Next month | Ordinary | Up rate | Next 3 months | Ordinary |
|---|---|---|---|---|---|
| Index ETFs | +0.3% | +1.1% | 54% | +3.1% | +3.3% |
| Broad indices | +1.1% | +0.8% | 59% | +3.0% | +2.4% |
| Other ETFs | +0.5% | +1.4% | 52% | +3.7% | +4.4% |
| US single stocks | +0.8% | +1.8% | 54% | +3.6% | +5.4% |
| Taiwan single stocks | +2.2% | +1.6% | 49% | +6.8% | +5.2% |

Index ETFs gain 0.3% over the next month against an ordinary 1.1%, and close higher 54% of the time — close to a coin flip.

Compared with the cheap side the effect is small — three times ordinary there, slightly below ordinary here. But the direction is consistent: 29 of 39 index ETFs and 64 of 87 other ETFs point the same way, and removing 2008 and 2020 does not change it.

**Sentiment at "Extreme Greed" with the channel still normal:**

| Group | Next month | Ordinary | Next 3 months | Ordinary | 3-month up rate |
|---|---|---|---|---|---|
| Index ETFs | +1.6% | +1.1% | +4.8% | +3.2% | 75% |

31 of 37 tickers behave this way. While the channel has not turned hot, the run is usually not over; overheating is confirmed by both charts only once the channel joins in.

## 2008 is the one exception

A signal that only works in one stretch of history is probably a coincidence. Here are index ETFs' three-month average gains after "Extreme Fear + Short-term oversold", cut by period:

| Period | Index ETFs | Ordinary | US single stocks | Ordinary |
|---|---|---|---|---|
| 1990s | — | — | +11.3% | +6.5% |
| Dot-com bust (2000–2002) | +8.1% | −2.2% | +10.9% | +0.8% |
| 2003–2007 bull market | — | — | +7.7% | +4.1% |
| **Financial crisis (2008–2009)** | **−9.7%** | +1.4% | **−0.8%** | +2.9% |
| 2010s | +7.7% | +1.6% | +8.5% | +3.0% |
| COVID and recovery (2020–2021) | +21.6% | +3.9% | +24.7% | +6.5% |
| 2022 onward | +9.7% | +3.6% | +7.4% | +4.8% |

(Two cells are blank because the qualifying index ETFs either did not exist yet or had not accumulated enough history.)

Every period is positive except 2008–2009, including the dot-com bust. Only during the financial crisis did the state stay lit for more than a year while the three-month result stayed negative at −9.7%.

The reason is not mysterious: the 2008 decline was deep and long, and three months was not enough time for price to come back.

### So how long should you look out?

Taking 2008 and 2020 out and running it again shows whether the edge is a short-term or a long-term one:

| Holding period | All data | Excluding 2008 and 2020 |
|---|---|---|
| One-month avg gain | +3.3% | **+4.3%** |
| One-month up rate | 69% | **77%** |
| One-year gain above ordinary | +18% | +3.7% |

That 18% over a year came almost entirely from those two crashes; take them out and only 3.7% is left. The one-to-three-month edge goes the other way — it survives and improves.

So this is a **one-to-three-month signal**. Treating the one-year figure as normal would mean using a post-crash rebound to describe ordinary conditions.

## After a break below the channel, is waiting worth it?

The original author of the LOHAS Channel suggested that after price breaks below the lower band you should wait for it to come back inside before acting. It sounds sensible — don't catch a falling knife. We pulled out every break below and every break above and compared the following three months from each entry point.

**After breaking below the lower band:**

| Group | Enter on the break | Wait for re-entry | Difference |
|---|---|---|---|
| Index ETFs | +4.68% | +3.26% | −1.41 |
| Broad indices | +4.55% | +3.94% | −0.61 |
| Other ETFs | +7.40% | +4.80% | −2.61 |
| US single stocks | +7.70% | +5.50% | −2.20 |
| Taiwan single stocks | +4.89% | +3.55% | −1.34 |

All five groups negative. Waiting costs 0.6 to 2.6 percentage points on average, because the sharpest part of the rebound often happens before price is back inside the channel.

**After breaking above the upper band:**

| Group | Enter on the break | Wait for re-entry | Difference |
|---|---|---|---|
| Index ETFs | +2.99% | +4.14% | +1.15 |
| Broad indices | +2.72% | +2.51% | −0.21 |
| Other ETFs | +1.97% | +2.76% | +0.79 |
| US single stocks | +3.56% | +3.91% | +0.34 |
| Taiwan single stocks | +6.90% | +6.83% | −0.07 |

No clear direction here — some positive, some negative, all small.

So the rule needs splitting in two: **on a break below, waiting has a cost; on a break above, it makes little difference either way.**

## Do RSI, MACD or volume help?

We are often asked whether to add KD, RSI or MACD. Rather than compare the indicators themselves, we asked a more practical question: on days flagged "Extreme Fear", which additional condition leads to the best following month?

| Second condition | Index ETFs | Broad indices | Other ETFs | US stocks | TW stocks |
|---|---|---|---|---|---|
| **LOHAS Channel also oversold** | **+3.3%** | **+2.5%** | **+3.7%** | **+4.3%** | +3.2% |
| RSI below 30 | +2.8% | +2.4% | +2.7% | +3.4% | +3.2% |
| Volatility in its yearly upper range | +2.5% | +2.0% | +2.6% | +3.3% | **+3.7%** |
| MACD histogram turns positive | +2.3% | +1.6% | +2.5% | +3.1% | +2.2% |
| Volume 1.5× its average | −0.1% | +0.3% | +1.9% | +2.1% | +2.4% |
| (Nothing added) | +1.5% | +0.9% | +1.9% | +2.7% | +2.4% |

The last row is the baseline: "Extreme Fear" alone.

The LOHAS Channel ranks first in four of five groups, and it is already on the page — no extra indicator to install. RSI below 30 is a close second. A positive MACD histogram helps a little too.

A volume spike adds almost nothing, and is slightly negative for index ETFs. That runs against a common belief that heavy selling marks capitulation, but the data does not support it.

## What these numbers cannot be used for

**These are historical averages, not forecasts.** "Up 3.3% on average" means those past qualifying days averaged that much. It says nothing about what happens next time. A 69% hit rate also means it fell 31% of the time.

**The samples overlap.** Several consecutive days in the same stretch of market all qualify, so the observations are not independent and the real uncertainty is wider than the tables suggest. We check this by counting how many tickers point the same way — 29 of 37 index ETFs, for instance — but that does not remove the overlap entirely.

**Working in the past does not guarantee working in the future.** 2008 is the ready-made example: a signal that held in every other period failed continuously for a year and a half. Something similar can happen again.

**This is not investment advice.** The article describes the statistical behaviour of an indicator on historical data. It makes no judgement about buying or selling any particular security. Real decisions also depend on your capital, how long you can hold, how much of a drop you can live with, and fundamentals.
