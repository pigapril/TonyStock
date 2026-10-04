import { toFont, toPadding } from 'chart.js/helpers';

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

export function indicatorTooltipPosition(elements, eventPosition) {
  if (!elements.length) return false;
  const pointer = eventPosition || elements[0].element;
  const margin = 8;
  const gap = 18;
  let measuredWidth = this.width || 280;
  let measuredHeight = this.height || 100;
  // positioner 在 Chart.js 更新尺寸之前執行，先量測本次日期的內容。
  // 避免第一次顯示或日期文字變長時，沿用舊尺寸而遮到資料點。
  if (this.chart.ctx && this.options?.callbacks) {
    const items = elements.map((item) => ({ dataIndex: item.index }));
    const lines = this.options.callbacks.afterBody.call(this, items);
    const title = this.options.callbacks.title.call(this, items);
    const bodyFont = toFont(this.options.bodyFont);
    const titleFont = toFont(this.options.titleFont);
    const padding = toPadding(this.options.padding);
    const ctx = this.chart.ctx;
    ctx.save();
    ctx.font = bodyFont.string;
    measuredWidth = Math.max(0, ...lines.map((line) => ctx.measureText(line).width));
    ctx.font = titleFont.string;
    measuredWidth = Math.max(measuredWidth, ctx.measureText(title).width) + padding.width;
    measuredHeight = padding.height + (title ? titleFont.lineHeight + this.options.titleMarginBottom : 0)
      + lines.length * bodyFont.lineHeight + Math.max(0, lines.length - 1) * this.options.bodySpacing;
    ctx.restore();
  }
  const width = Math.min(this.chart.width - margin * 2, measuredWidth + 24);
  const height = Math.min(this.chart.height - margin * 2, measuredHeight + 12);
  const points = elements.map(({ element }) => element);
  const right = Math.max(pointer.x, ...points.map((point) => point.x)) + gap;
  const left = Math.min(pointer.x, ...points.map((point) => point.x)) - gap - width;
  const candidates = [
    { x: right, y: pointer.y + gap },
    { x: right, y: pointer.y - gap - height },
    { x: left, y: pointer.y + gap },
    { x: left, y: pointer.y - gap - height },
    { x: pointer.x + gap, y: Math.min(pointer.y, ...points.map((point) => point.y)) - gap - height },
    { x: pointer.x + gap, y: Math.max(pointer.y, ...points.map((point) => point.y)) + gap }
  ].map((box) => ({
    x: Math.max(margin, Math.min(box.x, this.chart.width - width - margin)),
    y: Math.max(margin, Math.min(box.y, this.chart.height - height - margin))
  }));
  const overlaps = (box, point) => point.x >= box.x - margin && point.x <= box.x + width + margin
    && point.y >= box.y - margin && point.y <= box.y + height + margin;
  const score = (box) => [...points, pointer].filter((point) => overlaps(box, point)).length;
  const best = candidates.reduce((current, box) => score(box) < score(current) ? box : current);
  // 與圖表的 cornerRadius: 6、caretSize/caretPadding: 0 對應，讓方框位於選定位置。
  return { x: best.x + 6, y: best.y, xAlign: 'left', yAlign: 'top' };
}
