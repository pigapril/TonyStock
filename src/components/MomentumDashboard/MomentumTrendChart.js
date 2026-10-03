import React from 'react';

const WIDTH = 720;
const HEIGHT = 150;
const PADDING = 5;

const shortDate = (date) => date?.slice(5).replace('-', '/') || '';

function pathFor(points, valueAt, min, max, width = WIDTH, height = HEIGHT, padding = PADDING) {
  return points.map((point, index) => {
    const value = valueAt(point);
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
    const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
    const y = padding + ((max - Number(value)) / (max - min)) * (height - padding * 2);
    const previous = index > 0 ? valueAt(points[index - 1]) : null;
    return `${previous === null || previous === undefined || !Number.isFinite(Number(previous)) ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).filter(Boolean).join(' ');
}

export function GroupSparkline({ points }) {
  const valid = points?.filter((point) => Number.isFinite(point.score)) || [];
  if (valid.length < 2) return <span className="momentum-tile__sparkline momentum-tile__sparkline--empty" aria-hidden="true">—</span>;
  const width = 100;
  const height = 52;
  const padding = 3;
  const last = points[points.length - 1];
  const endX = width - padding;
  const endY = padding + ((100 - Number(last.score)) / 100) * (height - padding * 2);
  return <span className="momentum-tile__sparkline" aria-hidden="true">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
      <line className="momentum-tile__midline" x1="0" x2={width} y1={height / 2} y2={height / 2} />
      <path className="momentum-tile__line" d={pathFor(points, (point) => point.score, 0, 100, width, height, padding)} />
      {Number.isFinite(last.score) && <circle className="momentum-tile__endpoint" cx={endX} cy={endY} r="2.5" />}
    </svg>
  </span>;
}

export function AssetTrendChart({ points, label, assetName, benchmarkName, formatPercent }) {
  if (!points?.length) return null;
  const available = points.flatMap((point) => [point[1], point[2]]).filter((value) => Number.isFinite(value));
  if (available.length < 4) return null;
  const low = Math.min(0, ...available);
  const high = Math.max(0, ...available);
  const padding = Math.max(0.02, (high - low) * 0.12);
  const min = low - padding;
  const max = high + padding;
  const zeroY = PADDING + ((max - 0) / (max - min)) * (HEIGHT - PADDING * 2);
  const last = points[points.length - 1];
  return <div className="momentum-asset-trend" role="img" aria-label={label}>
    <div className="momentum-asset-trend__legend" aria-hidden="true">
      <span><i className="momentum-asset-trend__key momentum-asset-trend__key--asset" />{assetName} {formatPercent(last[1])}</span>
      <span><i className="momentum-asset-trend__key momentum-asset-trend__key--benchmark" />{benchmarkName} {formatPercent(last[2])}</span>
    </div>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <line className="momentum-trend-chart__grid" x1="0" x2={WIDTH} y1={zeroY} y2={zeroY} />
      <path className="momentum-asset-trend__benchmark-line" d={pathFor(points, (point) => point[2], min, max)} />
      <path className="momentum-asset-trend__asset-line" d={pathFor(points, (point) => point[1], min, max)} />
    </svg>
    <div className="momentum-trend-chart__dates" aria-hidden="true"><span>{shortDate(points[0][0])}</span><span>{shortDate(last[0])}</span></div>
  </div>;
}
