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

  it('tooltip follows pointer movement within the same selected date', () => {
    const context = { chart: { width: 800, height: 400 }, width: 200, height: 80 };
    const elements = [{ element: { x: 100, y: 200 } }];
    const first = indicatorTooltipPosition.call(context, elements, { x: 110, y: 120 });
    const next = indicatorTooltipPosition.call(context, elements, { x: 115, y: 150 });
    expect(next.x - first.x).toBe(5);
    expect(next.y - first.y).toBe(30);
    expect(first).toMatchObject({ xAlign: 'left', yAlign: 'top' });
    expect(indicatorTooltipPosition.call({}, [])).toBe(false);
  });

  it.each([
    { x: 100, y: 200 }, { x: 790, y: 390 }, { x: 790, y: 10 }, { x: 400, y: 390 }
  ])('keeps the tooltip inside the canvas and away from active points at %j', (pointer) => {
    const context = { chart: { width: 800, height: 400 }, width: 200, height: 80 };
    const elements = [
      { element: { x: pointer.x, y: pointer.y } },
      { element: { x: pointer.x, y: Math.max(10, pointer.y - 50) } }
    ];
    const position = indicatorTooltipPosition.call(context, elements, pointer);
    const box = { x: position.x - 6, y: position.y, width: 224, height: 92 };
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(792);
    expect(box.y).toBeGreaterThanOrEqual(8);
    expect(box.y + box.height).toBeLessThanOrEqual(392);
    elements.forEach(({ element }) => {
      const covered = element.x >= box.x && element.x <= box.x + box.width
        && element.y >= box.y && element.y <= box.y + box.height;
      expect(covered).toBe(false);
    });
  });

  it('measures long content before the first tooltip display to avoid covering the point', () => {
    const context = {
      chart: { width: 800, height: 400, ctx: {
        save: jest.fn(), restore: jest.fn(), measureText: (text) => ({ width: text.length * 10 })
      } },
      options: {
        bodyFont: { size: 12 }, titleFont: { size: 12 }, padding: 6,
        titleMarginBottom: 6, bodySpacing: 2,
        callbacks: { title: () => '2026-09-30', afterBody: () => ['x'.repeat(50)] }
      }
    };
    const position = indicatorTooltipPosition.call(context,
      [{ index: 1, element: { x: 740, y: 200 } }], { x: 740, y: 200 });
    // 實際內容寬 512px；橫向空間不足時也可改放上方，不能蓋住資料點。
    const covered = 740 >= position.x - 6 && 740 <= position.x - 6 + 512
      && 200 >= position.y && 200 <= position.y + 47;
    expect(covered).toBe(false);
    expect(context.chart.ctx.restore).toHaveBeenCalled();
  });
});
