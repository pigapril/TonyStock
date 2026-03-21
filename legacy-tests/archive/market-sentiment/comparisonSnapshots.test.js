import { getCompositeComparisonSnapshots } from '../comparisonSnapshots';

const t = (key) => key;

describe('getCompositeComparisonSnapshots', () => {
  test('returns previous day and previous week snapshots from historical data', () => {
    const historicalData = [
      { date: new Date('2024-01-08T00:00:00Z'), compositeScore: 40 },
      { date: new Date('2024-01-12T00:00:00Z'), compositeScore: 48 },
      { date: new Date('2024-01-14T00:00:00Z'), compositeScore: 52 }
    ];

    const snapshots = getCompositeComparisonSnapshots({
      currentScore: 55,
      historicalData,
      referenceDate: '2024-01-15T10:30:00Z',
      t
    });

    expect(snapshots.previousDay).toMatchObject({
      score: 52,
      sentimentKey: 'sentiment.neutral',
      sentimentLabel: 'sentiment.neutral'
    });

    expect(snapshots.previousWeek).toMatchObject({
      score: 40,
      sentimentKey: 'sentiment.fear',
      sentimentLabel: 'sentiment.fear'
    });
  });

  test('returns null snapshots when historical data is unavailable', () => {
    const snapshots = getCompositeComparisonSnapshots({
      currentScore: 55,
      historicalData: [],
      referenceDate: '2024-01-15T10:30:00Z',
      t
    });

    expect(snapshots).toEqual({
      previousDay: null,
      previousWeek: null
    });
  });
});
