import { sortRowsByDailyMove, summarizeGroups } from './momentumViewModel';

describe('momentum view model', () => {
  it('sorts by the latest close-to-close move and leaves unavailable moves last', () => {
    const rows = [
      { symbol: 'FLAT', change1dPct: 0, Rank: 90 },
      { symbol: 'UP', change1dPct: 0.03, Rank: 20 },
      { symbol: 'DOWN', change1dPct: -0.02, Rank: 80 },
      { symbol: 'NO DATA', change1dPct: null, Rank: 100 }
    ];

    expect(sortRowsByDailyMove(rows).map((row) => row.symbol)).toEqual(['UP', 'FLAT', 'DOWN', 'NO DATA']);
  });

  it('summarizes each group with median daily move, breadth and mean relative rank', () => {
    const groups = summarizeGroups([
      { symbol: 'A', group: 'Tech', change1dPct: 0.02, Rank: 90 },
      { symbol: 'B', group: 'Tech', change1dPct: 0.04, Rank: 70 },
      { symbol: 'C', group: 'Tech', change1dPct: -0.01, Rank: null },
      { symbol: 'D', group: 'Health', change1dPct: -0.03, Rank: 40 }
    ]);

    expect(groups[0]).toMatchObject({ name: 'Tech', count: 3, upCount: 2, downCount: 1, dailyMove: 0.02, averageRank: 80 });
    expect(groups[1]).toMatchObject({ name: 'Health', count: 1, dailyMove: -0.03 });
  });
});
