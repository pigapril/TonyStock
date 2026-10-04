import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import { isAvailableNumber } from './momentumViewModel';

const percent = (value) => isAvailableNumber(value) ? `${(Number(value) * 100).toFixed(1)}%` : '—';

export function MomentumAssetIndicators({ row }) {
  const { t, i18n } = useTranslation();
  const text = (key) => t(`momentumDashboard.${key}`);
  const money = isAvailableNumber(row.averageDollarVolume20)
    ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(row.averageDollarVolume20) : '—';
  const rsi = isAvailableNumber(row.rsi14) ? Number(row.rsi14) : null;
  const state = rsi === null ? 'indicatorMissing' : rsi >= 70 ? 'rsiHigh' : rsi <= 30 ? 'rsiLow' : 'rsiMiddle';
  return <div className="momentum-indicators">
    <div><span>{text('rsiLabel')}</span><strong>{rsi === null ? '—' : rsi.toFixed(1)}</strong><small>{text(state)}</small><small>{text('rsiHelp')}</small></div>
    <div><span>{text('liquidityLabel')}</span><strong>{money}</strong><small>{text('liquidityHelp')}</small></div>
  </div>;
}

export default function MomentumConstituents({ symbol, onSelectStock }) {
  const { t, i18n } = useTranslation();
  const text = (key, options) => t(`momentumDashboard.${key}`, options);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [minimumScore, setMinimumScore] = useState('');
  const [minimumVolume, setMinimumVolume] = useState('');
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(false);
    apiClient.get(`/api/public/momentum-dashboard/constituents/${encodeURIComponent(symbol.replace(/^BATS:/, ''))}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result.data.data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [symbol, attempt]);
  const pro = data?.access === 'pro';
  const rows = (data?.rows || []).filter((row) => {
    if (!`${row.symbol} ${row.name}`.toLowerCase().includes(query.toLowerCase().trim())) return false;
    if (pro && minimumScore !== '' && (!isAvailableNumber(row.Rank) || row.Rank < Number(minimumScore))) return false;
    if (pro && minimumVolume !== '' && (!isAvailableNumber(row.averageDollarVolume20) || row.averageDollarVolume20 < Number(minimumVolume) * 1000000)) return false;
    return true;
  });
  const setFilter = (setter, value) => { setter(value); setLimit(20); };
  const money = (value) => isAvailableNumber(value)
    ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value) : '—';
  return <section className="momentum-constituents">
    <div>
      {error ? <div role="alert"><p>{text('holdingsError')}</p><button type="button" onClick={() => setAttempt(attempt + 1)}>{text('retry')}</button></div>
        : !data ? <p role="status">{text('loadingHoldings')}</p>
          : data.status !== 'available' ? <p role="status">{text(data.status === 'pending' ? 'holdingsPending' : 'holdingsUnavailable')}</p>
            : <>
              <h4>{text(data.completeness === 'full' ? 'fullHoldings' : 'topHoldings')}</h4>
              <p className="momentum-relative-note">{text('holdingsCoverage', { count: data.rows.length, weight: percent(data.coverageWeight) })} · {data.holdingsAsOf ? text('holdingsDate', { date: data.holdingsAsOf }) : text('holdingsDateUnknown')}</p>
              <p className="momentum-relative-note">{text('stockUniverse', { count: data.universe.scoredCount })} · {text('asOf')} {data.asOf}</p>
              <p className="momentum-relative-note">{text('holdingsScope')}</p>
              <div className="momentum-stock-filters">
                <label>{text('stockSearch')}<input type="search" value={query} onChange={(event) => setFilter(setQuery, event.target.value)} /></label>
                {pro && <>
                  <label>{text('stockMinimumScore')}<input type="number" min="0" max="100" value={minimumScore} onChange={(event) => setFilter(setMinimumScore, event.target.value)} /></label>
                  <label>{text('stockMinimumVolume')}<input type="number" min="0" value={minimumVolume} onChange={(event) => setFilter(setMinimumVolume, event.target.value)} /></label>
                </>}
              </div>
              {!pro && <p className="momentum-relative-note">{text('stockProHelp')} <a href={`/${i18n.language}/subscription-plans`}>{text('access.upgrade')}</a></p>}
              <div className={`momentum-holdings-list${pro ? ' is-pro' : ''}`} aria-label={text('stockTable')}>
                <div className="momentum-holdings-head"><span>{text('asset')}</span><span>{text('holdingWeight')}</span>{pro && <><span>{text('rankMode')}</span><span>RSI</span><span>{text('liquidityLabel')}</span><span /></>}</div>
                {rows.slice(0, limit).map(row => {
                  const content = <><span className="momentum-row__identity"><strong>{row.symbol}</strong><small>{row.name}</small></span><span>{percent(row.weight)}</span>{pro && <><strong>{isAvailableNumber(row.Rank) ? Number(row.Rank).toFixed(0) : '—'}</strong><span>{isAvailableNumber(row.rsi14) ? Number(row.rsi14).toFixed(1) : '—'}</span><span data-label={text('liquidityLabel')}>{money(row.averageDollarVolume20)}</span><span aria-hidden="true">›</span></>}</>;
                  return pro ? <button key={row.symbol} type="button" className="momentum-holding-row" onClick={event => onSelectStock?.(row, event.currentTarget)}>{content}</button> : <div key={row.symbol} className="momentum-holding-row">{content}</div>;
                })}
              </div>
              {!rows.length && <p role="status">{text('noMatches')}</p>}
              {rows.length > limit && <button type="button" className="momentum-show-more" onClick={() => setLimit(limit + 20)}>{text('showMore', { count: Math.min(20, rows.length - limit) })}</button>}
              <a className="momentum-research-link" href={data.sourceUrl} target="_blank" rel="noopener noreferrer">{text('holdingsSource', { source: data.sourceName })} ↗</a>
            </>}
    </div>
  </section>;
}
