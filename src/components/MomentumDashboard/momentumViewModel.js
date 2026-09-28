export function isAvailableNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function sortRowsByDailyMove(rows = [], order = 'desc') {
  return [...rows].sort((left, right) => {
    const leftHasMove = isAvailableNumber(left.change1dPct);
    const rightHasMove = isAvailableNumber(right.change1dPct);
    if (leftHasMove !== rightHasMove) return leftHasMove ? -1 : 1;
    if (leftHasMove && Number(left.change1dPct) !== Number(right.change1dPct)) {
      return (Number(right.change1dPct) - Number(left.change1dPct)) * (order === 'asc' ? -1 : 1);
    }
    const leftRank = isAvailableNumber(left.Rank) ? Number(left.Rank) : -1;
    const rightRank = isAvailableNumber(right.Rank) ? Number(right.Rank) : -1;
    return rightRank - leftRank;
  });
}

export function sortRowsByRank(rows = [], order = 'desc') {
  return [...rows].sort((left, right) => {
    const leftAvailable = isAvailableNumber(left.Rank);
    const rightAvailable = isAvailableNumber(right.Rank);
    if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
    if (!leftAvailable) return 0;
    return (Number(right.Rank) - Number(left.Rank)) * (order === 'asc' ? -1 : 1);
  });
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeGroups(rows = []) {
  const groups = new Map();
  rows.forEach((row) => {
    const name = row.group || 'Other';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  });

  return [...groups.entries()].map(([name, members]) => {
    const dailyMoves = members
      .filter((row) => isAvailableNumber(row.change1dPct))
      .map((row) => Number(row.change1dPct));
    const ranks = members
      .filter((row) => isAvailableNumber(row.Rank))
      .map((row) => Number(row.Rank));
    return {
      name,
      count: members.length,
      upCount: dailyMoves.filter((move) => move > 0).length,
      downCount: dailyMoves.filter((move) => move < 0).length,
      dailyMove: median(dailyMoves),
      averageRank: ranks.length ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length : null
    };
  }).sort((left, right) => {
    if (left.dailyMove === null) return right.dailyMove === null ? left.name.localeCompare(right.name) : 1;
    if (right.dailyMove === null) return -1;
    return right.dailyMove - left.dailyMove;
  });
}
