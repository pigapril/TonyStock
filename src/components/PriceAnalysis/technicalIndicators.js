const finitePrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
};

export function calculateSma(prices, period) {
  const result = Array(prices.length).fill(null);
  const window = [];
  let sum = 0;

  prices.forEach((rawPrice, index) => {
    const price = finitePrice(rawPrice);
    if (price === null) {
      window.length = 0;
      sum = 0;
      return;
    }

    window.push(price);
    sum += price;
    if (window.length > period) sum -= window.shift();
    if (window.length === period) result[index] = sum / period;
  });

  return result;
}

function calculateEma(values, period) {
  const result = Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);
  let seedCount = 0;
  let seedSum = 0;
  let average = null;

  values.forEach((rawValue, index) => {
    const value = rawValue === null || rawValue === undefined || rawValue === ''
      ? null : Number(rawValue);
    if (value === null || !Number.isFinite(value)) {
      seedCount = 0;
      seedSum = 0;
      average = null;
      return;
    }

    if (average === null) {
      seedCount += 1;
      seedSum += value;
      if (seedCount === period) average = seedSum / period;
    } else {
      average += (value - average) * multiplier;
    }

    if (average !== null) result[index] = average;
  });

  return result;
}

export function calculateRsi(prices, period = 14) {
  const result = Array(prices.length).fill(null);
  let previous = null;
  let seedCount = 0;
  let gainSum = 0;
  let lossSum = 0;
  let averageGain = null;
  let averageLoss = null;

  prices.forEach((rawPrice, index) => {
    const price = finitePrice(rawPrice);
    if (price === null) {
      previous = null;
      seedCount = 0;
      gainSum = 0;
      lossSum = 0;
      averageGain = null;
      averageLoss = null;
      return;
    }

    if (previous === null) {
      previous = price;
      return;
    }

    const change = price - previous;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    previous = price;

    if (averageGain === null) {
      seedCount += 1;
      gainSum += gain;
      lossSum += loss;
      if (seedCount < period) return;
      averageGain = gainSum / period;
      averageLoss = lossSum / period;
    } else {
      averageGain = ((averageGain * (period - 1)) + gain) / period;
      averageLoss = ((averageLoss * (period - 1)) + loss) / period;
    }

    result[index] = averageGain === 0 && averageLoss === 0
      ? 50
      : averageLoss === 0 ? 100
        : 100 - (100 / (1 + (averageGain / averageLoss)));
  });

  return result;
}

export function calculateMacd(prices) {
  const values = prices.map(finitePrice);
  const fast = calculateEma(values, 12);
  const slow = calculateEma(values, 26);
  const macd = values.map((_, index) => (
    fast[index] === null || slow[index] === null ? null : fast[index] - slow[index]
  ));
  const signal = calculateEma(macd, 9);
  const histogram = macd.map((value, index) => (
    value === null || signal[index] === null ? null : value - signal[index]
  ));

  return { macd, signal, histogram };
}

// 日 KD（9,3,3）：先計算最近九根 K 線的 RSV，再以 1/3 權重平滑 K、D。
// 首個可計算日的前值採 50；無法取得真實高低價時不以收盤價代替。
export function calculateKd(prices, highs, lows, period = 9) {
  const k = Array(prices.length).fill(null);
  const d = Array(prices.length).fill(null);
  if (!Array.isArray(highs) || !Array.isArray(lows)
      || highs.length !== prices.length || lows.length !== prices.length) {
    return { k, d };
  }

  let previousK = 50;
  let previousD = 50;
  let segmentStart = 0;

  prices.forEach((rawPrice, index) => {
    const close = finitePrice(rawPrice);
    const high = finitePrice(highs[index]);
    const low = finitePrice(lows[index]);
    if (close === null || high === null || low === null || high < low) {
      segmentStart = index + 1;
      previousK = 50;
      previousD = 50;
      return;
    }
    if (index - segmentStart + 1 < period) return;

    let highest = -Infinity;
    let lowest = Infinity;
    for (let i = index - period + 1; i <= index; i += 1) {
      highest = Math.max(highest, Number(highs[i]));
      lowest = Math.min(lowest, Number(lows[i]));
    }
    const rsv = highest === lowest ? 50
      : Math.min(100, Math.max(0, ((close - lowest) / (highest - lowest)) * 100));
    previousK = ((2 * previousK) + rsv) / 3;
    previousD = ((2 * previousD) + previousK) / 3;
    k[index] = previousK;
    d[index] = previousD;
  });

  return { k, d };
}
