const LOW_POINT_LOCAL_WINDOW_DAYS = 45;
const LOW_POINT_PERCENTILE = 12;
const LOW_POINT_MIN_SPACING_DAYS = 60;

export function selectHistoricalLowPoints(items, scoreAccessor) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const normalized = items
    .map((item) => ({
      date: item.date instanceof Date ? item.date : new Date(item.date),
      score: scoreAccessor(item)
    }))
    .filter((item) => !Number.isNaN(item.date.getTime()) && Number.isFinite(item.score))
    .sort((left, right) => left.date - right.date);

  if (normalized.length === 0) {
    return [];
  }

  const scores = normalized.map((item) => item.score).sort((left, right) => left - right);
  const thresholdIndex = Math.max(0, Math.floor((scores.length - 1) * (LOW_POINT_PERCENTILE / 100)));
  const thresholdScore = scores[thresholdIndex];

  const candidates = normalized.filter((item, index) => {
    if (item.score > thresholdScore) {
      return false;
    }

    const windowStart = item.date.getTime() - (LOW_POINT_LOCAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const windowEnd = item.date.getTime() + (LOW_POINT_LOCAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    for (let cursor = 0; cursor < normalized.length; cursor += 1) {
      const candidateDate = normalized[cursor].date.getTime();
      if (candidateDate < windowStart || candidateDate > windowEnd) {
        continue;
      }

      if (normalized[cursor].score < item.score) {
        return false;
      }
    }

    return true;
  });

  const selected = [];
  for (const candidate of candidates) {
    const previous = selected[selected.length - 1];
    if (!previous) {
      selected.push(candidate);
      continue;
    }

    const diffDays = (candidate.date.getTime() - previous.date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < LOW_POINT_MIN_SPACING_DAYS) {
      if (candidate.score < previous.score) {
        selected[selected.length - 1] = candidate;
      }
      continue;
    }

    selected.push(candidate);
  }

  return selected;
}

export const HISTORICAL_LOW_POINT_RULE = {
  localWindowDays: LOW_POINT_LOCAL_WINDOW_DAYS,
  percentileThreshold: LOW_POINT_PERCENTILE,
  minSpacingDays: LOW_POINT_MIN_SPACING_DAYS
};
