---
title: LOHAS Five-Line Analysis Tested on 848,000 Taiwan and US Daily Bars
category: Tool Tutorial
date: 2026-08-29
description: We ran 92 tickers and 848,263 daily bars through the LOHAS Five-Line method to check a few claims people repeat about it. Extreme Greed shows up on roughly one trading day in five, the two charts agree about 70% of the time, and the rule about waiting for price to re-enter the channel lost money in every window length and every group we tested.
keywords: LOHAS Five-Line, LOHAS Channel, mean reversion, standard deviation channel, market sentiment, backtest, technical analysis, KD, RSI, MACD, SPY, 0050, Taiwan stocks
readingTime: 15
---

We have used the LOHAS Five-Line method for a long time, and we wrote a guide on [how to read it](https://sentimentinsideout.com/articles/analyzing-price-trends-and-sentiment-with-lohas-five-line-analysis). After using it for a while, some questions started nagging at us.

How often does the "Extreme Greed" label actually light up? The Five-Line chart and the LOHAS Channel live in two separate tabs, so are they really giving us two independent readings? And that widely repeated piece of advice, the one about waiting for price to come back inside the channel before you act, does it actually pay?

We had been following these ideas without ever checking them. So we pulled 92 tickers and 848,263 daily bars out of our database and ran the numbers. A few results did not match what we expected.

## Table of Contents

1. [How We Tested This](#how-we-tested-this)
2. [Extreme Greed Is Not Extreme](#extreme-greed-is-not-extreme)
3. [The Two Tabs Say Nearly the Same Thing](#the-two-tabs-say-nearly-the-same-thing)
4. [The Fear Side Has Something The Greed Side Does Not](#the-fear-side-has-something-the-greed-side-does-not)
5. [What Actually Works Is Both Charts at Once](#what-actually-works-is-both-charts-at-once)
6. [Waiting for Price to Re-Enter the Channel Costs Money](#waiting-for-price-to-re-enter-the-channel-costs-money)
7. [Taiwanese Individual Stocks Are the Odd One Out](#taiwanese-individual-stocks-are-the-odd-one-out)
8. [What About KD RSI and MACD](#what-about-kd-rsi-and-macd)
9. [What These Numbers Cannot Tell You](#what-these-numbers-cannot-tell-you)

## How We Tested This

The dataset is 92 tickers and 848,263 daily bars, running from 1970 to August 2026. We split it into five groups, because it became obvious early on that different kinds of assets behave very differently:

| Group | Count | Examples |
|---|---|---|
| Market-cap ETFs | 21 | SPY, QQQ, VOO, 0050, 006208 |
| Broad indices | 9 | S&P 500, TAIEX, Hang Seng, Nikkei |
| Non-cap-weighted ETFs | 4 | 0056, 0051, VYM |
| US individual stocks | 33 | Johnson & Johnson, Exxon, Ford, IBM |
| Taiwanese individual stocks | 25 | TSMC, China Steel, Formosa Plastics, Yang Ming |

We deliberately loaded the two stock groups with companies that have done badly over the long run. This matters more than it sounds. If you only pick Apple, Microsoft and Nvidia, every "buy the dip" rule looks brilliant, and what you are measuring is survivorship bias rather than the indicator.

One technical detail is worth spelling out. The Five-Line trend line comes from a regression fitted over the whole selected period, which means **every new bar redraws the entire line, history included**. When you look at the chart today and see that some day three years ago sat at −2SD, that was not the reading at the time. Testing it properly means recomputing day by day: to score March 12, 2020, you may only use data from before that date. That is what we did, refitting the regression one day at a time.

The default period is 3.5 years, which is the "long term" setting on the site. We also swept 0.5, 1.5 and 7 years to see whether the conclusions moved.

## Extreme Greed Is Not Extreme

Here is the result that surprised us most.

Statistically, price should sit more than two standard deviations from the trend line on about 4.6% of days. What actually happens:

| Group | 0.5y | 1.5y | 3.5y | 7y |
|---|---|---|---|---|
| Market-cap ETFs | 13.9% | 16.3% | 19.3% | 19.6% |
| Broad indices | 15.0% | 16.0% | 18.8% | 20.1% |
| US stocks | 14.8% | 16.5% | 21.9% | 26.5% |
| Taiwanese stocks | 14.5% | 16.7% | 19.1% | 20.9% |

**On the 3.5-year setting, roughly one trading day in five lights up as "extreme."** Stretch the window to seven years and US individual stocks hit it every fourth day.

Our first assumption was a bug in our code, so we checked against SPY. Taking every day along the full trend line and measuring its residual, only 3.9% exceed two standard deviations, which sits comfortably near the theoretical 4.6%. That part is completely normal.

The problem is that **we only read the rightmost day**. The right edge is where price has most recently diverged, and divergence is extremely persistent (we measured a lag-1 autocorrelation of 0.989, which is close to sticky). The chart as a whole behaves; the single point you grab to print a label is biased toward the extreme by construction.

The split between the two sides is even more lopsided:

| 3.5-year window | Touches upper edge | Breaks lower edge | Ratio |
|---|---|---|---|
| Market-cap ETFs | 10.4% | 9.0% | 1.16 |
| Broad indices | 11.5% | 8.6% | 1.35 |
| US stocks | 12.7% | 8.2% | 1.54 |
| Taiwanese stocks | 12.2% | 6.6% | 1.86 |

At the seven-year setting Taiwanese stocks reach 4.35 to 1. The reason is not mysterious: a company that grows over the long run spends long stretches sitting above its own regression line, so "Extreme Greed" becomes its resting state.

Market-cap ETFs are the most balanced group at short windows, and at 0.5 years they actually lean toward the fear side. That backs up the original thinking behind the method. **On market-cap ETFs, the label is less likely to mislead you.**

## The Two Tabs Say Nearly the Same Thing

The site puts the Five-Line chart and the LOHAS Channel in two separate tabs. We measured the correlation between them: **0.72**. By group it runs 0.68 to 0.73, with individual tickers ranging from 0.58 to 0.80.

In plain terms, once you have looked at the Five-Line chart, the Channel is repeating it about 70% of the time. Flipping between tabs makes it easy to believe you have collected two independent opinions ("both indicators say overbought, so it must be right"), when you have mostly heard one opinion twice.

This is not a flaw as such, because the two charts share the same skeleton: how far price sits from its own moving center, scaled by volatility. Only the time frame differs. But presenting them as two peer tabs does inflate how much information people think they are holding.

## The Fear Side Has Something The Greed Side Does Not

Next we asked what happens over the following 60 trading days, roughly three months, after the Five-Line chart hits an extreme.

To keep it fair, every number below has that ticker's own average return subtracted, so the long US bull market does not contaminate the result. We also bootstrapped confidence intervals on everything.

The answer splits cleanly in half.

**The fear side carries a signal.** Excess return after Extreme Fear runs +1.04 percentage points across the full sample and +1.22 for US stocks. Across window lengths and groups, the fear side produces far more significant cells than chance would give you, and they all point the same way.

**The greed side has almost nothing.** Excess return after Extreme Greed is +0.01 percentage points across the full sample, with a confidence interval straddling zero. More awkwardly, the handful of cells that do reach significance are positive, meaning Extreme Greed was followed by slightly better than average returns, the opposite of what the label implies.

Right now the site describes both sides in matching language. The numbers support the fear side and do not support the greed side. That needs fixing.

## What Actually Works Is Both Charts at Once

If the Five-Line signal is weak on its own, what happens when you add a condition?

We took the Extreme Fear days and cut them a second time, checking which conditions actually separate them. The numbers show how many percentage points better the "condition met" half did over the next 60 days:

| Second condition | Market-cap ETFs | Broad indices | US stocks |
|---|---|---|---|
| **Also broke the LOHAS Channel floor** | **+4.03** | **+3.22** | **+3.97** |
| ATR volatility percentile high | +4.34 | +3.69 | +2.87 |
| RSI below 30 | +3.80 | +1.88 | +2.25 |
| Relative volume elevated | +1.79 | +1.51 | +1.65 |
| MACD histogram turned positive | −0.36 | −0.65 | −0.08 |

**The one at the top is something we already have.**

Extreme Fear on its own is a weak signal. Extreme Fear **combined with** a break below the LOHAS Channel floor is a different story, and both of those charts are already on the page. They just sit in separate tabs talking past each other.

We ran a control to make sure this was not simply picking more extreme days. Locking the Five-Line depth into a narrow band between −2.5 and −2 and re-running, the channel break still adds +2.84 (and +4.92 for market-cap ETFs). Tightening the threshold instead, to −2.5, is worth only +0.93. **The channel is contributing genuinely new information.**

Should you stack a third condition on top? We tried. It is not worth much, for two reasons.

First, these conditions overlap heavily. Between 80% and 89% of days that break the channel floor are also high-volatility days, so they are selecting the same days. Stacking them mostly produces no measurable extra benefit.

Second, and more practically: Extreme Fear covers 7% to 9% of days, adding one condition leaves 1% to 5.5%, and adding a second leaves 0.3% to 2.8%. Half a percent is about one or two days a year. Nobody would ever see it.

## Waiting for Price to Re-Enter the Channel Costs Money

This piece of advice gets repeated a lot, and our own tips section says it too: when price touches the Five-Line edges and also breaks the LOHAS Channel, that may signal trend continuation, so you can wait for it to re-enter the channel before acting.

The short version: **both halves of that sentence disagree with the data.**

### First, the trend continuation part

We compared Extreme Fear days that broke the channel floor against those that did not, looking at 5, 10, 20 and 60 days out. Positive numbers mean the breaking group did better, which is reversal rather than continuation:

| Group | 5d | 10d | 20d | 60d |
|---|---|---|---|---|
| Market-cap ETFs | +0.73 | +1.61 | +2.58 | +3.68 |
| Broad indices | +0.73 | +1.23 | +2.28 | +3.30 |
| US stocks | +0.45 | +0.74 | +1.54 | +4.00 |
| Taiwanese stocks | +0.39 | +0.40 | +1.30 | −0.96 |

We had guessed there might be short-run continuation followed by longer-run reversal. There is no sign of continuation even at five days. The advantage starts immediately and widens.

(Taiwanese stocks are the exception again. More on that below.)

### Second, the waiting part

This half of the rule is about timing: after a break below the floor, hold off on buying until price returns inside the channel; after a break above the ceiling, hold off on selling.

We treated each break as an event, found the first day price came back inside, and compared the two prices. All four window lengths:

**Buy side** (positive means waiting made you pay more):

| Group | 0.5y | 1.5y | 3.5y | 7y |
|---|---|---|---|---|
| Market-cap ETFs | +2.09% | +1.67% | +1.66% | +1.83% |
| Broad indices | +1.64% | +1.51% | +1.54% | +1.61% |
| US stocks | +2.10% | +1.68% | +1.68% | +1.88% |
| Taiwanese stocks | +2.32% | +1.84% | +2.00% | +1.70% |

**Sell side** (negative means waiting made you sell lower):

| Group | 0.5y | 1.5y | 3.5y | 7y |
|---|---|---|---|---|
| Market-cap ETFs | −0.89% | −0.88% | −0.53% | −0.43% |
| Broad indices | −0.44% | −0.67% | −0.34% | −0.33% |
| US stocks | −1.11% | −0.96% | −0.79% | −0.75% |
| Taiwanese stocks | −1.56% | −1.31% | −1.03% | −0.93% |

Forty cells, all pointing the same direction, and changing the window length does nothing.

We should be honest about one thing here: **a good chunk of those numbers is true by definition.** Coming back inside the channel from below basically requires price to have risen, so of course waiting means paying more. That is not independent evidence. It just puts a number on the structural cost of the rule, somewhere around 1.5% to 2.3%.

The independent evidence is what follows.

**First, the later entry also performs worse afterward.** This part has nothing to do with definitions:

| Group | Buy on the break day | Wait for re-entry | Difference |
|---|---|---|---|
| Market-cap ETFs | +6.19% | +4.97% | −1.22 |
| Broad indices | +4.63% | +3.71% | −0.92 |
| US stocks | +6.60% | +5.49% | −1.11 |
| Taiwanese stocks | +3.27% | +1.77% | −1.49 |

Nineteen of twenty cells (four windows by five groups) are negative. Waiting gets you a worse price and a slower three months after that.

**Second, waiting does not reduce risk either.** We thought the rule might be about avoiding falling knives rather than maximizing return, so we looked at the worst 10% of outcomes:

| Group | Buy immediately, worst 10% | Wait, worst 10% |
|---|---|---|
| Full sample | −13.66% | −14.34% |
| Market-cap ETFs | −11.65% | −13.87% |
| Broad indices | −12.99% | −15.32% |
| Taiwanese stocks | −17.98% | −20.41% |

In four of five groups the left tail gets worse when you wait. The probability of a loss barely moves.

The waiting durations explain why: **the median wait is only 3 to 4 trading days.** Too short to filter anything out, and just long enough to miss the first leg of the bounce.

Put more bluntly, the rule's trigger does not match its own reasoning. If you genuinely believe the trend will continue, what you should wait for is the trend to exhaust itself. But "back inside the channel" happens after three or four days of bouncing, which is neither trend exhaustion nor a good entry.

**The core insight holds up: the two charts belong together.** Our results support that strongly, and the overlap is the most valuable signal we found. What needs revising is the second half of the sentence. The direction is backwards, and there is no reason to wait.

## Taiwanese Individual Stocks Are the Odd One Out

Taiwanese stocks have been the column that does not fit in every table above. Here is the summary.

The combination that works on market-cap ETFs, indices and US stocks **fails completely** on Taiwanese individual stocks:

| Second condition during Extreme Fear | Taiwanese stocks |
|---|---|
| Broke the channel floor | −0.72 (no measurable difference) |
| ATR volatility percentile | −0.44 (no measurable difference) |
| RSI below 30 | +0.70 (no measurable difference) |
| **Relative volume elevated** | **+2.52** |

Volume is the only thing that works. And volume is the one thing that does not work on broad indices.

More interesting still, the "trend continuation" claim **does hold** for Taiwanese stocks. After a break above the channel ceiling:

| Continues higher after breaking the ceiling? | 5d | 10d | 20d | 60d |
|---|---|---|---|---|
| Market-cap ETFs | −0.29 | −0.52 | −1.12 | −1.39 |
| US stocks | −0.24 | −0.30 | −0.38 | −0.98 |
| **Taiwanese stocks** | **+0.18** | **+0.31** | **+0.40** | **+2.02** |

At the 60-day horizon Taiwanese stocks lean toward continuation on both edges, while every other group reverses.

There is some irony here. The LOHAS Five-Line method was written for Taiwanese investors, and the trend continuation claim was probably accurate in that original context. **What breaks is applying it to market-cap ETFs and broad indices, which is exactly the asset class the method claims to suit best.**

Even for Taiwanese stocks, though, waiting still loses money (−1.49 on the buy side, −1.03 on the sell side). Right call, wrong action.

As for why Taiwanese individual stocks behave so differently, we do not have an answer. Daily price limits, retail participation, or how dividends and capital reductions are handled could all play a part. That needs its own investigation.

## What About KD RSI and MACD

People ask about these regularly. We tested them, and in the process corrected a mistake in how we were judging them.

Our first approach was to screen by correlation: the less an indicator overlaps with what we already show, the more it is worth adding. By that standard:

| Indicator | Correlation with Five-Line | Correlation with Channel |
|---|---|---|
| MACD histogram | 0.05 | 0.14 |
| Relative volume | −0.01 | −0.03 |
| ATR volatility percentile | −0.15 | −0.28 |
| KD %K | 0.30 | 0.49 |
| RSI | 0.47 | **0.76** |

MACD looks like the obvious winner, and RSI looks like it should be dropped.

**It came out exactly backwards.** The conditional value table above already showed it: MACD is the only candidate that fails in every group (−0.08 to −0.65, no measurable difference anywhere), while RSI ranks near the top (+3.80 on market-cap ETFs).

We eventually worked out the distinction. Correlation answers the question "if I draw this as a third line, will people see repeated information?" Conditional value answers "how well does it work as a filter?" Those are different questions. RSI drawn as a third line really is restating the Channel, but as a second condition asking "now that the Five-Line is extreme, is the short term extreme too?", it earns its place.

KD is the same story. We had wanted to drop it because it correlates 0.82 with RSI, then tested it properly and found it does work, just less efficiently. KD's %K below 20 has to light up on 25% of fear days to earn +0.94, while RSI below 30 lights up on 15% and earns +2.22. The two say roughly the same thing 80% of the time, so keep one.

Incidentally, the "KD flattens out at high levels" worry turned out to be real: on market-cap ETFs during Extreme Greed days, %K sits above 80 nearly half the time, at 46.6%.

## What These Numbers Cannot Tell You

Time to draw some lines.

**These describe historical conditional distributions, not predictions.** Every percentage point above says "among past days in this state, here is how the median one went afterward." It tells you nothing about what happens next time.

**The confidence intervals are optimistic.** The tickers are heavily correlated with each other, and 21 ETFs all crashed together in 2008 and 2020. What the statistics count as thousands of independent observations is really a handful of events. Treat the direction as informative and the precision as not.

**We ran roughly 90 tests.** By chance alone a few will look significant. The fear-side cluster is consistent in direction and large enough that it does not look accidental, but no single cell deserves much weight on its own.

**All of this looks backwards at history, ignores trading costs and slippage, and only measures 60 days.** A different horizon could give different answers.

**Most important: this is not investment advice.** We are not recommending any entry or exit timing, and we are not recommending any security. What this piece does is audit our own tool and lay out where it holds up and where it does not. What you do with the tool is your call.

---

After this round of testing, a few things are on our list: turn the overlap between the two charts into a state the site computes for you, rather than something buried in a tips section; rewrite the copy about waiting for re-entry; and take another look at Taiwanese individual stocks. We will update this article once those ship.
