export function adaptSummaryPayload(payload, marketConfig) {
  if (!payload) {
    return null;
  }

  if (marketConfig.marketKey !== 'tw') {
    return payload;
  }

  return {
    ...payload,
    totalScore: payload.totalScore ?? payload.score ?? null,
    compositeScoreLastUpdate: payload.compositeScoreLastUpdate ?? payload.asOfDate ?? payload.lastUpdated ?? null,
    lastUpdated: payload.lastUpdated ?? payload.asOfDate ?? null,
    indicators: payload.indicators || {}
  };
}

export function adaptHistoryPayload(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => ({
    date: new Date(item.date),
    compositeScore: item.compositeScore != null ? parseFloat(item.compositeScore) : null,
    spyClose: item.spyClose != null
      ? parseFloat(item.spyClose)
      : (item.benchmarkClose != null ? parseFloat(item.benchmarkClose) : null)
  }));
}

export function adaptDetailPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      current: null,
      history: payload
    };
  }

  return {
    current: payload?.current || null,
    history: payload?.history || []
  };
}
