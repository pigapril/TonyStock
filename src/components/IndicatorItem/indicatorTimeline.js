export function dateKey(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

// 共用日期索引只對齊觀測值；缺值維持 null，不製造每日指標數據。
// tooltip 另外保留截至該日最近一筆，並攜帶其原始日期。
export function buildIndicatorTimeline(indicators, benchmark, visibleDates) {
  const observations = new Map(indicators.map((row) => [dateKey(row.date), row]).filter(([date]) => date));
  const prices = new Map(benchmark.map((row) => [dateKey(row.date), row]).filter(([date]) => date));
  const dates = [...new Set([...observations.keys(), ...prices.keys()])].sort();
  const visible = new Set(visibleDates.map(dateKey).filter(Boolean));
  let latestIndicator = null;
  let latestBenchmark = null;
  return dates.map((date) => {
    const observation = observations.get(date);
    const price = prices.get(date);
    if (observation?.value != null && Number.isFinite(observation.value)) latestIndicator = observation;
    if (price?.spyClose != null && Number.isFinite(price.spyClose)) latestBenchmark = price;
    return {
      date,
      value: observation?.value ?? null,
      percentileRank: observation?.percentileRank ?? null,
      spyClose: price?.spyClose ?? null,
      latestIndicator,
      latestBenchmark
    };
  }).filter((row) => visible.has(row.date));
}

export function indicatorTooltipPosition(elements) {
  if (!elements.length) return false;
  return { x: elements[0].element.x, y: this.chart.chartArea.top + 8, yAlign: 'top' };
}
