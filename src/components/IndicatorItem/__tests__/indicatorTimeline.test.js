import { buildIndicatorTimeline, dateKey, indicatorTooltipPosition } from '../indicatorTimeline';

const weekly = [
  { date: '2026-09-22', value: 40, percentileRank: 30 },
  { date: '2026-09-29', value: 45, percentileRank: 50 }
];
const daily = [
  { date: new Date('2026-09-23'), spyClose: 660 },
  { date: new Date('2026-09-24'), spyClose: 665 },
  { date: new Date('2026-09-29'), spyClose: 670 },
  { date: new Date('2026-09-30'), spyClose: 675 }
];
const visible = [...weekly, ...daily].map((row) => row.date);

describe('indicator date alignment', () => {
  it('daily and weekly series share dates without inventing observations', () => {
    const rows = buildIndicatorTimeline(weekly, daily, visible);
    expect(rows.map((row) => row.date)).toEqual([
      '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-29', '2026-09-30'
    ]);
    expect(rows[1]).toMatchObject({ value: null, percentileRank: null, spyClose: 660,
      latestIndicator: weekly[0] });
    expect(rows[3]).toMatchObject({ value: 45, spyClose: 670, latestIndicator: weekly[1] });
    expect(rows[4].latestIndicator.date).toBe('2026-09-29');
  });

  it('never uses future readings and retains the preceding observation at a range boundary', () => {
    const rows = buildIndicatorTimeline(weekly, [
      { date: '2026-09-21', spyClose: 655 }, ...daily
    ], ['2026-09-21', '2026-09-24']);
    expect(rows[0].latestIndicator).toBeNull();
    expect(rows[1].latestIndicator.date).toBe('2026-09-22');
    expect(rows[1].latestIndicator.value).toBe(40);
  });

  it('sorts descending input and handles indicator-only dates and missing prices', () => {
    const rows = buildIndicatorTimeline([...weekly].reverse(), [...daily].reverse(), visible);
    expect(rows[0].spyClose).toBeNull();
    expect(rows[0].latestBenchmark).toBeNull();
    expect(rows[rows.length - 1].spyClose).toBe(675);
    expect(buildIndicatorTimeline([], [], [])).toEqual([]);
    expect(dateKey('invalid')).toBeNull();
    expect(dateKey(null)).toBeNull();
  });

  it('tooltip remains at the same height regardless of hovered series', () => {
    const position = indicatorTooltipPosition.call({ chart: { chartArea: { top: 20 } } },
      [{ element: { x: 100, y: 200 } }]);
    expect(position).toEqual({ x: 100, y: 28, yAlign: 'top' });
    expect(indicatorTooltipPosition.call({}, [])).toBe(false);
  });
});
