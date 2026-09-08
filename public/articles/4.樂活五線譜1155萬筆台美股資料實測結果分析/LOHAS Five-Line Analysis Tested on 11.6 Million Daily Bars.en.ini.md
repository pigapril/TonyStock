---
title: Should You Buy When LOHAS Five-Line Shows "Extreme Fear"? 11.6 Million Daily Bars
category: Tool Guides
date: 2026-08-30
description: We ran 1,449 instruments and 11.56 million daily bars, going back to 1927. "Extreme Greed" fires roughly every ten days and the five-line chart and the LOHAS Channel disagree six times out of ten. The days worth watching are the five a year when both hit their extreme: held for a year they make 11.1 percentage points more than random entry, held for a month almost nothing.
keywords: LOHAS Five-Line, LOHAS Channel, mean reversion, standard deviation channel, market sentiment, backtest, technical analysis, RSI, MACD, 0050, SPY, Taiwan stocks
readingTime: 20
---

We have used the LOHAS Five-Line for a long time, and we have written about [how to read it](https://sentimentinsideout.com/en/articles/analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis). Use it long enough and some questions come up.

How often does the "Extreme Greed" label actually appear? Sentiment and the LOHAS Channel sit in separate places on the page, so are they telling you two different things? When you see "Extreme Fear", what usually happens next?

And one more practical question: the original author advises waiting for price to return inside the channel after it breaks below. Does that hold up?

This time we ran 1,449 instruments and 11.56 million daily bars, with data going back to 1927.

In short

1. "Extreme Fear" on its own shows up about 16 days a year, and entries on those days lose to random entry over three and six months. Wait for the LOHAS Channel to break below its lower edge as well and the count drops to about 5 days a year.
2. After the break, price is usually still falling. Waiting for the return inside the channel wins in all 24 cells across six instrument groups and four holding periods.
3. Only a full-year hold makes a clear difference. Index ETFs make 11.1 percentage points more than random entry over a year, and 1.0 over a month.
4. The same rule holds when selling. After "Extreme Greed + above upper edge", waiting for price to return inside the channel dodged the decline that followed in all six groups.

## Contents

1. [Why the two charts have to be read together](#why-the-two-charts-have-to-be-read-together)
2. [Only one of the four combinations is worth buying](#only-one-of-the-four-combinations-is-worth-buying)
3. [When to buy](#when-to-buy)
4. [When to sell](#when-to-sell)
5. [Further check: the 2008 exception only shows up over short holds](#further-check-the-2008-exception-only-shows-up-over-short-holds)
6. [Further check: do RSI, MACD or volume help?](#further-check-do-rsi-macd-or-volume-help)

## Why the two charts have to be read together

The LOHAS five-line chart and the LOHAS Channel are two charts on the page. Every number in this article reads what the two of them say at the same time, for two reasons.

First, reading the five-line chart alone, the extremes come up too often. How often each of its five states shows up:

| Group | Extreme Fear | Fear | Neutral | Greed | Extreme Greed |
|---|---|---|---|---|---|
| Index ETFs | 9.5% | 12.8% | 40.7% | 26.3% | 10.2% |
| Market indices | 8.4% | 13.1% | 45.2% | 23.0% | 10.5% |
| Non-index ETFs | 7.8% | 13.5% | 44.5% | 23.8% | 10.1% |
| US stocks | 7.7% | 14.9% | 45.2% | 20.2% | 12.0% |
| Taiwan stocks | 5.8% | 17.4% | 48.9% | 16.6% | 10.9% |
| Other overseas stocks | 6.0% | 15.4% | 47.5% | 17.9% | 12.2% |

If deviations really followed a bell curve, everything beyond two standard deviations would take up under 5% of days. In practice the two ends together run 17% to 22%, four times the theoretical figure. Extreme deviations happen more often than theory says, and trends persist: after running hot, price often keeps running, so "Extreme Greed" stays lit for weeks.

So the five-line chart shows "Extreme Greed" roughly every ten days. Read on its own, it carries less information than people assume.

Second, the two charts often disagree. When sentiment has already reached Extreme Fear or Extreme Greed, how often has the LOHAS Channel also broken out?

| Group | Channel has also broken out |
|---|---|
| Market indices | 49% |
| Taiwan stocks | 45% |
| Non-index ETFs | 42% |
| US stocks | 41% |
| Index ETFs | 40% |
| Other overseas stocks | 36% |

Around four in ten. The other six times out of ten, one of them is still in normal territory.

That is a better result than we expected. If the two charts overlapped almost completely, the second would be redundant; if they were unrelated, combining them would mean nothing. Four-tenths overlap means they share something and each carries information the other does not.

So from here we look only at the ends: the days when the five-line chart reads "Extreme Fear" or "Extreme Greed", each split by whether the LOHAS Channel has broken out or is still inside. Two by two gives four combinations.

## Only one of the four combinations is worth buying

The example below uses index ETFs (0050, SPY, QQQ and similar).

Each cell is: buy on the day this combination appears, and make this many percentage points more than random entry. Random entry means buying the same instrument on any day and holding just as long, which is roughly what someone who ignores the signal ends up with. A percentage point is the gap between two returns: 20% on the signal against 9% on random entry is a gap of 11 points.

| What you see on the page | Days per year | 1 month vs random | 3 months vs random | 6 months vs random | 1 year vs random |
|---|---|---|---|---|---|
| **Extreme Fear + below lower edge** | 5 | +1.0 | +0.6 | +2.3 | **+11.1** |
| Extreme Fear, channel still normal | 16 | +0.0 | −0.5 | −1.8 | +1.3 |
| Extreme Greed, channel still normal | 9 | −0.2 | +0.9 | +0.3 | −3.6 |
| Extreme Greed + above upper edge | 12 | −0.4 | −0.6 | −0.0 | −1.7 |

Note: 1,449 instruments and 11,556,801 daily bars, 1927 to 2026. Each instrument is computed on its own before taking the median, so one or two big winners cannot carry the result. One caveat on the sample: a single crash trips the signal on many instruments at once, so while the bar count is large, the number of independent extreme events is in the dozens. Section 5 cuts the data into five periods to test exactly that. Scripts and full results are in `research/lohas-horizons/` in the repo.

![The four combinations across four holding periods, in percentage points above or below random entry](./image1.png)

Only the first combination is positive over all four periods, and it only becomes clear after a full year, at 11.1 percentage points. Over one month it makes just 1.0 point more, which is close to nothing.

The other three are not worth buying. "Extreme Fear, channel still normal" shows up three times as often, yet loses to random entry over three and six months. The two "Extreme Greed" rows are negative in five of their eight cells, giving up 3.6 and 1.7 points respectively over a year. Whether they are a place to sell is a different question, and section 4 handles it.

## When to buy

The buying signal is "Extreme Fear + below lower edge".

### Which instruments suit it

Each cell is: buy on the day the signal appears, and make this many percentage points more than random entry. Read the last column alongside it: the gain is a median and a few strong names can lift it, while the last column says how many instruments in the group actually move the same way.

| Group | 1 month vs random | 3 months vs random | 6 months vs random | 1 year vs random | Agreeing at 1 year |
|---|---|---|---|---|---|
| Market indices | +2.0 | +2.2 | +1.8 | +4.8 | 18/23 |
| Index ETFs | +1.0 | +0.6 | +2.3 | +11.1 | **42/43** |
| Non-index ETFs | +1.7 | +2.0 | +3.5 | +13.5 | 45/62 |
| US stocks | +1.3 | +2.7 | +2.8 | +8.4 | 520/757 |
| Taiwan stocks | +0.7 | +1.1 | +5.8 | **+16.0** | 391/480 |
| Other overseas stocks | +2.4 | +3.0 | +2.9 | +4.1 | 47/78 |

![Held one year after Extreme Fear plus below lower edge, points above random entry by instrument type](./image3.png)

Index ETFs are the most reliable, with 42 of 43 agreeing. Taiwan stocks have the largest gain at 16.0 points, and 391 of 480 agree. Market indices gain only 4.8, because an index is steadier and rarely falls that far. Other overseas stocks have just 47 of 78 agreeing, so treat that group with caution.

Discount those agreement counts a little. A single crash trips the signal across a whole group at once, and the 43 index ETFs fell together in 2008, so 42/43 says the result is stable across instruments rather than standing as 43 independent tests. To see whether it survives different eras, section 5 cuts the data into five periods.

### When to act

The LOHAS Channel's original author suggested not buying immediately after price breaks below the lower edge, but waiting for it to return inside. We pulled out every stretch spent outside the channel, kept only those where sentiment also reached Extreme Fear, and compared two moments within the same stretch.

Each cell is: wait for the return inside before buying, and make this many percentage points more than buying on the break.

| Group | 1 month vs buy-on-break | 3 months vs buy-on-break | 6 months vs buy-on-break | 1 year vs buy-on-break | Agreeing at 1 year |
|---|---|---|---|---|---|
| Market indices | +8.7 | +6.4 | +9.7 | +9.2 | **19/19** |
| Index ETFs | +8.3 | +6.6 | +7.7 | +8.6 | 41/43 |
| Non-index ETFs | +7.9 | +7.1 | +6.8 | +9.2 | **51/51** |
| US stocks | +12.4 | +12.4 | +14.0 | +14.7 | 722/732 |
| Taiwan stocks | +11.6 | +11.7 | +12.9 | +15.5 | 414/423 |
| Other overseas stocks | +11.2 | +9.4 | +10.0 | +9.7 | 59/62 |

All 24 cells across six groups and four periods favour waiting, and in every group over 95% of instruments move the same way. Buy on the break and all six groups are negative over one month.

Price outside the channel means that decline is still running, and acting there means working against it. Once price is back inside, the move has at least paused.

### How long to hold

Only a one-year hold beats random entry clearly in all six groups. Index ETFs make 1.0 point more over a month, 0.6 over three months and 2.3 over six, then jump to 11.1 over a year. None of the first three reaches 2.5.

The odds of being up say the same thing. Held a year, index ETFs are up 88% of the time on the signal against 74% for random entry. Held three months, the signal is up only 57% of the time, losing to random entry's 67%.

![Only a one-year hold puts index ETFs ahead of random entry on the odds of being up](./image4.png)

### One cost to state plainly

This does not mean it turns tomorrow. In the three months after the signal, index ETFs fall a further 10.0% at the deepest point, against 4.6% for random entry. Those two are drawdowns in their own right, not the gap between two returns used elsewhere. Anyone going all in on the signal has to sit through that stretch.

## When to sell

Selling asks whether the sale dodged a fall.

The comparison is still any random day, only this time a sale, called a random sale below. Bigger numbers are still better, and here bigger means more of the decline avoided.

The sell point is the day the "Extreme Greed + above upper edge" breakout ends and price returns inside the channel, a median of 10 trading days after the signal, roughly two weeks. Why that day rather than the break itself is tested in the next subsection.

### Which instruments suit it

Each cell is: sell once the signal has appeared, and dodge this many percentage points more than a random sale.

| Group | 1 month after, vs random sale | 3 months after, vs random sale | 6 months after, vs random sale | 1 year after, vs random sale | Agreeing at 1 month |
|---|---|---|---|---|---|
| Market indices | +1.7 | +2.0 | +0.9 | +3.2 | **23/23** |
| Index ETFs | +1.7 | +1.3 | +0.1 | +2.8 | 40/43 |
| Non-index ETFs | +2.1 | +2.8 | +2.1 | +3.2 | 55/58 |
| US stocks | +2.9 | +3.7 | +3.8 | +4.9 | 728/759 |
| Taiwan stocks | **+3.7** | +4.0 | +4.0 | **+7.6** | 439/480 |
| Other overseas stocks | +3.4 | +3.6 | +4.0 | +5.5 | 75/78 |

Note: 35,160 sell points across 1,441 instruments. Taken together, 1,360 of the 1,441 move the same way.

All six groups dodged something. Taiwan stocks dodged the most: the sale avoided 3.7 percentage points more of a decline than a random sale would have. All 23 market indices agree, but the size is only 1.7.

Single stocks work better here than ETFs and indices. The three single-stock groups run 2.9 to 3.7, the three index and ETF groups only 1.7 to 2.1. That reverses what happens when buying, where index ETFs were the most reliable.

What the sale dodges is one month. In the month after selling, the odds of a fall are 61%, against 44% for a random sale. So selling at this moment does duck a real decline.

It does not hold longer than that. By six months price is usually back up, and the only benefit left is losing a little less than a random sale would have, which hardly counts as dodging anything.

### When to act

The same question as when buying: sell the moment price breaks above the upper edge, or wait for it to return inside?

Each cell is: wait for the return inside before selling, and dodge this many percentage points more than selling on the break.

| Group | 1 month after, vs sell-on-break | 3 months after, vs sell-on-break | 6 months after, vs sell-on-break | 1 year after, vs sell-on-break | Agreeing at 1 month |
|---|---|---|---|---|---|
| Market indices | +3.0 | +3.4 | +1.9 | +3.7 | **23/23** |
| Index ETFs | +1.4 | +1.4 | +1.8 | +3.5 | **43/43** |
| Non-index ETFs | +2.9 | +3.1 | +1.5 | +3.5 | 57/58 |
| US stocks | +4.5 | +5.0 | +4.7 | +5.2 | 753/759 |
| Taiwan stocks | **+7.0** | +7.7 | +6.7 | +8.2 | 473/480 |
| Other overseas stocks | +5.5 | +4.9 | +7.4 | +6.5 | 76/78 |

Again all 24 cells say wait. Sell on the break and price keeps climbing that month, in five of the six groups faster than after a random sale, which means selling into the middle of the run.

The original advice holds when buying and when selling, and across all four periods.

### One limit to state plainly

Dodging a fall is not the same as making money. Sell and sit in cash and the market's long-run climb means that after a year you end up behind someone who held throughout. This article does not test when to buy back; that is a separate question.

## Further check: the 2008 exception only shows up over short holds

Everything so far pools all the years together. A signal that only works in one stretch of history is probably a coincidence, so here is the data cut by period. This section tests whether the earlier findings survive different eras, and can be skipped if you only want to know how to use the tool.

We did not strip out 2008 and 2020. Crashes are part of what markets do, and 2022 fell for a year as well, so there is no case for treating two of them as if they had not happened.

Each cell is: buy during that period, and make this many percentage points more than random entry (index ETFs).

| Period | 1 month vs random | 3 months vs random | 6 months vs random | 1 year vs random |
|---|---|---|---|---|
| Dot-com bust 2000–02 | +6.4 | +9.3 | +12.0 | +8.2 |
| **Financial crisis 2008–09** | **−6.0** | **−11.5** | −6.2 | **+8.5** |
| 2010s | +2.0 | +5.4 | +5.5 | +9.4 |
| Covid and rebound 2020–21 | +8.5 | +17.8 | +22.5 | +47.2 |
| After 2022 | +2.6 | +2.3 | −1.5 | +0.9 |

Note: the 1990s and the 2003–2007 bull run are left out. Only 1 and 3 qualifying index ETFs existed in those stretches, so the figures would mean nothing.

![Points above random entry after Extreme Fear plus below lower edge by period, three months against one year](./image2.png)

The financial crisis was an exception, but only over short holds. One month lost 6.0 points and three months lost 11.5. That decline was deep and long, and three months was not enough for price to come back.

Stretch the window to a year and 2008 comes out ahead instead, by 8.5 points. All five periods are positive over a year, though After 2022 manages only +0.9, close to a tie.

Unreliable over short holds, and standing up in every era once the window is long enough.

## Further check: do RSI, MACD or volume help?

We are often asked whether to add KD, RSI or MACD. Rather than compare the indicators themselves, here is a more practical question: on days at "Extreme Fear", which second condition produces the best month afterwards?

Each cell is: add this condition, and make this many percentage points more than adding nothing.

| Second condition (vs adding nothing) | Index ETFs | Market indices | Non-index ETFs | US stocks | Taiwan stocks |
|---|---|---|---|---|---|
| RSI below 30 | **+1.9** | +0.8 | **+0.6** | **+0.5** | +0.6 |
| Volatility in the top fifth of the past year | +1.3 | **+1.9** | +0.5 | +0.3 | **+0.7** |
| MACD histogram turning positive | +0.7 | +0.0 | −0.2 | −0.0 | −0.0 |
| LOHAS Channel also below its lower edge | +0.4 | +1.0 | −0.0 | +0.0 | −0.3 |
| Volume up 1.5× or more | −0.9 | −0.3 | −0.5 | +0.1 | +0.5 |

Over one month, RSI below 30 beats the LOHAS Channel. It ranks first in three of the five groups and second in the other two, with high volatility close behind. The Channel comes second only for market indices; in the other four groups it sits mid-table or lower, and for Taiwan stocks it is below adding nothing at all.

The two answer different horizons. The Channel's value shows up over a year, at 11.1 percentage points; the one-month bounce is caught better by RSI.

Volume adds almost nothing. Adding a volume surge costs index ETFs 0.9 percentage points. Many people read a high-volume drop as panic bottoming out, and the data does not support it.
