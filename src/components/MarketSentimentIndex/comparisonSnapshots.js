import { getSentiment } from '../../utils/sentimentUtils';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const buildComparisonSnapshot = (point, t) => {
  if (!point || point.compositeScore == null) {
    return null;
  }

  const score = Math.round(point.compositeScore);
  const sentimentKey = getSentiment(score);

  return {
    score,
    sentimentKey,
    sentimentLabel: t(sentimentKey),
    date: point.date
  };
};

export const getCompositeComparisonSnapshots = ({
  currentScore,
  historicalData,
  referenceDate,
  t
}) => {
  if (currentScore == null || historicalData.length === 0) {
    return {
      previousDay: null,
      previousWeek: null,
      previousMonth: null,
      previousQuarter: null
    };
  }

  const sortedHistoricalData = [...historicalData]
    .filter((item) => item?.date && item?.compositeScore != null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedHistoricalData.length === 0) {
    return {
      previousDay: null,
      previousWeek: null,
      previousMonth: null,
      previousQuarter: null
    };
  }

  const referenceTimestamp = referenceDate
    ? new Date(referenceDate).getTime()
    : sortedHistoricalData[sortedHistoricalData.length - 1].date.getTime();

  const previousDayPoint = [...sortedHistoricalData]
    .reverse()
    .find((item) => item.date.getTime() < referenceTimestamp);

  const previousWeekPoint = [...sortedHistoricalData]
    .reverse()
    .find((item) => item.date.getTime() <= referenceTimestamp - ONE_WEEK_MS);

  const previousMonthPoint = [...sortedHistoricalData]
    .reverse()
    .find((item) => item.date.getTime() <= referenceTimestamp - THIRTY_DAYS_MS);

  const previousQuarterPoint = [...sortedHistoricalData]
    .reverse()
    .find((item) => item.date.getTime() <= referenceTimestamp - NINETY_DAYS_MS);

  return {
    previousDay: buildComparisonSnapshot(previousDayPoint, t),
    previousWeek: buildComparisonSnapshot(previousWeekPoint, t),
    previousMonth: buildComparisonSnapshot(previousMonthPoint, t),
    previousQuarter: buildComparisonSnapshot(previousQuarterPoint, t)
  };
};
