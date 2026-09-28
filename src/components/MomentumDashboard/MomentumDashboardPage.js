import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import { trackProductEvent } from '../../utils/productAnalytics';
import { isAvailableNumber, sortRowsByDailyMove, sortRowsByRank, summarizeGroups } from './momentumViewModel';
import './MomentumDashboardPage.css';

const UNIVERSES = ['Industry', 'Assets', 'Structure'];
const EMPTY_ROWS = [];
const PAGE_SIZE = 12;
const score = (value) => isAvailableNumber(value) ? Number(value).toFixed(0) : '—';
const percent = (value) => isAvailableNumber(value)
  ? `${Number(value) > 0 ? '+' : ''}${(Number(value) * 100).toFixed(1)}%` : '—';
const direction = (value) => !isAvailableNumber(value) || Number(value) === 0 ? 'flat' : Number(value) > 0 ? 'up' : 'down';
const groupKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function colorBand(value, metric) {
  if (!isAvailableNumber(value)) return 'missing';
  if (metric === 'daily') return Number(value) > 0 ? 'gain' : Number(value) < 0 ? 'loss' : 'neutral';
  const scoreValue = Number(value);
  return scoreValue < 30 ? 'weak' : scoreValue < 45 ? 'soft' : scoreValue < 55 ? 'neutral' : scoreValue < 70 ? 'firm' : 'strong';
}

export default function MomentumDashboardPage() {
  const { t } = useTranslation();
  const text = useCallback((key, options) => t(`momentumDashboard.${key}`, options), [t]);
  const groupLabel = (name) => text(`groups.${groupKey(name)}`, { defaultValue: name });
  const groupHint = (name) => universe === 'Structure' ? text(`groupHints.${groupKey(name)}`, { defaultValue: '' }) : '';
  const [snapshot, setSnapshot] = useState(null);
  const [universe, setUniverse] = useState('Industry');
  const [metric, setMetric] = useState('rank');
  const [sortOrder, setSortOrder] = useState('desc');
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const assetsRef = useRef(null);
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackProductEvent('momentum_view');
  }, []);
  const trackInteraction = (action, fields = {}) => trackProductEvent('momentum_interaction', {
    action, universe, metric, sort_order: sortOrder, group_name: selectedGroup, ...fields
  });

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get('/api/public/momentum-dashboard', { signal });
      if (!signal?.aborted) {
        setSnapshot(response.data?.data || null);
        trackProductEvent('momentum_load', { status: response.data?.data ? 'success' : 'empty' });
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(true);
        trackProductEvent('momentum_load', { status: 'failed' });
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const rows = snapshot?.data?.[universe] || EMPTY_ROWS;
  const uniqueAssetCount = useMemo(() => new Set(Object.values(snapshot?.data || {}).flat().map((row) => row.symbol.replace(/^BATS:/, ''))).size, [snapshot]);
  const groups = useMemo(() => {
    const summaries = summarizeGroups(rows);
    if (metric === 'rank') summaries.sort((a, b) => (b.averageRank ?? -1) - (a.averageRank ?? -1));
    return summaries;
  }, [rows, metric]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matching = rows.filter((row) => (!selectedGroup || row.group === selectedGroup)
      && (!term || `${row.symbol} ${row.name} ${row.group} ${text(`groups.${groupKey(row.group || 'Other')}`, { defaultValue: row.group })}`.toLowerCase().includes(term)));
    return metric === 'daily' ? sortRowsByDailyMove(matching, sortOrder) : sortRowsByRank(matching, sortOrder);
  }, [rows, selectedGroup, query, metric, sortOrder, text]);

  useEffect(() => {
    if (!query.trim()) return undefined;
    const timer = setTimeout(() => trackProductEvent('momentum_search', {
      universe, group_name: selectedGroup, result_count: filteredRows.length
    }), 600);
    return () => clearTimeout(timer);
  }, [query, universe, selectedGroup, filteredRows.length]);

  const changeScope = (key) => {
    if (universe !== key) trackInteraction('scope_change', { universe: key, group_name: null });
    setUniverse(key);
    setSelectedGroup(null);
    setSelectedSymbol(null);
    setQuery('');
    setVisibleCount(PAGE_SIZE);
  };
  const changeMetric = (key) => {
    if (metric !== key || sortOrder !== 'desc') trackInteraction('metric_change', { metric: key, sort_order: 'desc' });
    setMetric(key);
    setSortOrder('desc');
    setSelectedSymbol(null);
    setVisibleCount(PAGE_SIZE);
  };
  const changeSort = (key) => {
    trackInteraction('sort_change', { metric: key, sort_order: metric === key && sortOrder === 'desc' ? 'asc' : 'desc' });
    setSortOrder(metric === key && sortOrder === 'desc' ? 'asc' : 'desc');
    setMetric(key);
    setVisibleCount(PAGE_SIZE);
  };
  const selectGroup = (name) => {
    trackInteraction(selectedGroup === name ? 'group_clear' : 'group_select', { group_name: name });
    setSelectedGroup((current) => current === name ? null : name);
    setSelectedSymbol(null);
    setQuery('');
    setVisibleCount(PAGE_SIZE);
  };
  const hasRows = rows.length > 0;

  return (
    <div className="momentum-page">
      <header className="momentum-header">
        <div>
          <h1>{text('title')}</h1>
          <p>{text('subtitle')}</p>
        </div>
        {snapshot?.asOf && <div className="momentum-date"><span>{text('asOf')}</span><time dateTime={snapshot.asOf}>{snapshot.asOf}</time></div>}
      </header>

      <div className="momentum-controls">
        <div className="momentum-scopes" role="group" aria-label={text('universeLabel')}>
          {UNIVERSES.map((key) => <button type="button" key={key} aria-pressed={universe === key} onClick={() => changeScope(key)}>{text(`tabs.${key}`)}</button>)}
        </div>
        <div className="momentum-metrics" role="group" aria-label={text('displayMetric')}>
          <button type="button" aria-pressed={metric === 'rank'} onClick={() => changeMetric('rank')}>{text('rankMode')}</button>
          <button type="button" aria-pressed={metric === 'daily'} onClick={() => changeMetric('daily')}>{text('dailyMode')}</button>
        </div>
      </div>

      {loading && !hasRows ? <div className="momentum-loading" role="status"><span>{text('loading')}</span><div aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div></div>
        : !hasRows ? <div className="momentum-state" role={error ? 'alert' : 'status'}>
          <h2>{text(error ? 'loadError' : 'noSnapshot')}</h2><p>{text('noSnapshotDetail')}</p>
          <button type="button" onClick={() => loadDashboard()}>{text('retry')}</button>
        </div> : <>
          {error && <div className="momentum-refresh-error" role="alert">{text('refreshError')} <button type="button" onClick={() => loadDashboard()}>{text('retry')}</button></div>}
          <section aria-labelledby="momentum-map-title" className="momentum-map-section">
            <div className="momentum-map-heading">
              <h2 id="momentum-map-title">{text(metric === 'rank' ? 'strengthMap' : 'dailyMap')}</h2>
              <div className={`momentum-legend momentum-legend--${metric}`} aria-label={text(metric === 'rank' ? 'rankLegend' : 'dailyLegend')}>
                <span>{text(metric === 'rank' ? 'weaker' : 'down')}</span><i aria-hidden="true" /><span>{text(metric === 'rank' ? 'stronger' : 'up')}</span>
              </div>
            </div>
            <div className="momentum-map-context">
              <p className="momentum-map-caption">{text(metric === 'rank' ? 'rankCaption' : 'dailyCaption')}</p>
              {metric === 'rank' && <>
                <button type="button" className="momentum-guide-toggle" aria-expanded={guideOpen} aria-controls="momentum-reading-guide" onClick={() => { if (!guideOpen) trackInteraction('guide_open'); setGuideOpen((open) => !open); }}>
                  <span aria-hidden="true">{guideOpen ? '▾' : '▸'}</span>{text('guideTitle')}
                </button>
                <aside id="momentum-reading-guide" className="momentum-reading-guide" aria-label={text('guideLabel')} hidden={!guideOpen}>
                  <dl>
                    {['period', 'score', 'action'].map((key) => <div key={key}><dt>{text(`guide.${key}.title`)}</dt><dd>{text(`guide.${key}.body`)}</dd></div>)}
                  </dl>
                </aside>
              </>}
            </div>
            <div className="momentum-map">
              {groups.map((group) => {
                const value = metric === 'rank' ? group.averageRank : group.dailyMove;
                return <button type="button" key={group.name}
                  className={`momentum-tile momentum-tile--${colorBand(value, metric)}`}
                  style={metric === 'daily' && isAvailableNumber(value) ? { '--move-intensity': `${Math.min(80, 18 + Math.abs(Number(value)) * 2000)}%` } : undefined}
                  aria-pressed={selectedGroup === group.name}
                  aria-label={text('groupButton', { group: groupLabel(group.name), value: metric === 'rank' ? score(value) : percent(value) })}
                  onClick={() => {
                    selectGroup(group.name);
                    requestAnimationFrame(() => {
                      assetsRef.current?.focus({ preventScroll: true });
                      assetsRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth', block: 'start' });
                    });
                  }}>
                  <span className="momentum-tile__name">{groupLabel(group.name)}{groupHint(group.name) && <small>{groupHint(group.name)}</small>}</span>
                  <span className="momentum-tile__value">{metric === 'rank' ? score(value) : percent(value)}{metric === 'rank' && isAvailableNumber(value) && <small>/100</small>}</span>
                  <span className="momentum-tile__footer"><span>{text('assetCount', { count: group.count })}</span><span aria-hidden="true">{selectedGroup === group.name ? '✓' : '→'}</span></span>
                </button>;
              })}
            </div>
          </section>

          <section className="momentum-assets" ref={assetsRef} tabIndex={-1} aria-labelledby="momentum-assets-title">
            <div className="momentum-assets-heading">
              <div><h2 id="momentum-assets-title">{selectedGroup ? groupLabel(selectedGroup) : text('allAssets')}</h2><p aria-live="polite">{text(`${metric}Order${sortOrder === 'asc' ? 'Asc' : ''}`)}</p></div>
              <label className="momentum-search"><span className="sr-only">{text('searchLabel')}</span><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedSymbol(null); setVisibleCount(PAGE_SIZE); }} placeholder={text('searchPlaceholder')} /></label>
            </div>
            {selectedGroup && text(`groupDescriptions.${groupKey(selectedGroup)}`, { defaultValue: '' }) && <p className="momentum-group-description">{text(`groupDescriptions.${groupKey(selectedGroup)}`)}</p>}
            {selectedGroup && <button type="button" className="momentum-clear" onClick={() => selectGroup(selectedGroup)}>{text('showAll')} <span aria-hidden="true">×</span></button>}
            <div className="momentum-list" aria-label={text('assetList')}>
              <div className="momentum-list-head"><span>{text('asset')}</span>{['daily', 'rank'].map((key) => <button type="button" key={key} className="momentum-sort" aria-pressed={metric === key} aria-label={text('sortColumn', { column: text(`${key}Mode`), order: text(metric === key && sortOrder === 'desc' ? 'ascending' : 'descending') })} onClick={() => changeSort(key)}>
                <span>{text(`${key}Mode`)}</span><span aria-hidden="true">{metric === key ? sortOrder === 'desc' ? '↓' : '↑' : '↕'}</span>
              </button>)}</div>
              {filteredRows.slice(0, visibleCount).map((row) => <React.Fragment key={row.symbol}>
                <button type="button" className="momentum-row" aria-expanded={selectedSymbol === row.symbol} aria-controls={`momentum-detail-${row.symbol.replace(/[^a-z0-9]/gi, '-')}`} onClick={() => { if (selectedSymbol !== row.symbol) trackInteraction('asset_open', { asset_symbol: row.symbol.replace(/^BATS:/, '') }); setSelectedSymbol((current) => current === row.symbol ? null : row.symbol); }}>
                  <span className="momentum-row__identity"><strong>{row.symbol.replace(/^BATS:/, '')}</strong><small>{text(`assetDescriptions.${row.symbol.replace(/^BATS:/, '')}`, { defaultValue: row.name })}</small></span>
                  <span className={`momentum-row__daily momentum-${direction(row.change1dPct)}`}>{percent(row.change1dPct)}</span>
                  <span className="momentum-row__rank"><span className="momentum-rail" aria-hidden="true"><i style={{ width: `${isAvailableNumber(row.Rank) ? Math.max(0, Math.min(100, Number(row.Rank))) : 0}%` }} /></span><strong>{score(row.Rank)}</strong><span className="momentum-expand" aria-hidden="true">{selectedSymbol === row.symbol ? '−' : '+'}</span></span>
                </button>
                {selectedSymbol === row.symbol && <div className="momentum-inline-detail" id={`momentum-detail-${row.symbol.replace(/[^a-z0-9]/gi, '-')}`}>
                  <div className="momentum-inline-detail__heading"><span>{row.name}</span><span>{text('currentPrice')} <strong>{isAvailableNumber(row.price) ? `$${Number(row.price).toFixed(2)}` : '—'}</strong></span></div>
                  <dl>{[20, 60, 120].map((horizon, index) => <div key={horizon}>
                    <dt>{text('months', { months: [1, 3, 6][index] })}<small>{text('tradingDays', { days: horizon })}</small></dt>
                    {isAvailableNumber(row[`return${horizon}`]) || isAvailableNumber(row[`benchmarkReturn${horizon}`]) ? <>
                      <dd className="momentum-period-return"><span>{text('assetReturn')}</span><strong className={`momentum-${direction(row[`return${horizon}`])}`}>{isAvailableNumber(row[`return${horizon}`]) ? percent(row[`return${horizon}`]) : text('unavailable')}</strong></dd>
                      <dd className="momentum-period-return momentum-period-return--benchmark"><span>SPY</span><strong>{isAvailableNumber(row[`benchmarkReturn${horizon}`]) ? percent(row[`benchmarkReturn${horizon}`]) : text('unavailable')}</strong></dd>
                    </> : <dd className="momentum-return-unavailable">{text('periodReturnUnavailable')}</dd>}
                    {isAvailableNumber(row[`${horizon}R`]) && <dd className="momentum-relative-return">{text('periodScore', { score: score(row[`${horizon}R`]) })}</dd>}
                  </div>)}</dl>
                  <p className="momentum-inline-detail__date">{text('benchmarkExplanation')}</p>
                  <p className="momentum-inline-detail__date">{text('asOf')} {row.asOf || row.priceAsOf || snapshot.asOf}</p>
                  <a className="momentum-research-link" onClick={() => trackInteraction('research_click', { asset_symbol: row.symbol.replace(/^BATS:/, '') })} href={`https://finance.yahoo.com/quote/${encodeURIComponent(row.symbol.replace(/^BATS:/, ''))}/`} target="_blank" rel="noopener noreferrer">{text('researchLink')} <span aria-hidden="true">↗</span></a>
                </div>}
              </React.Fragment>)}
              {!filteredRows.length && <div className="momentum-no-matches" role="status"><p>{text('noMatches')}</p><button type="button" onClick={() => { setQuery(''); setSelectedGroup(null); }}>{text('clearFilters')}</button></div>}
            </div>
            {filteredRows.length > PAGE_SIZE && <button type="button" className="momentum-show-more" onClick={() => { trackInteraction(visibleCount < filteredRows.length ? 'show_more' : 'show_less'); setVisibleCount(visibleCount < filteredRows.length ? filteredRows.length : PAGE_SIZE); }}>{text(visibleCount < filteredRows.length ? 'showMore' : 'showLess', { count: filteredRows.length - PAGE_SIZE })}</button>}
          </section>
        </>}

      <details className="momentum-method"><summary>{text('methodTitle')}</summary><p>{text('methodBody')}</p><p>{text('methodCaveat')}</p></details>
      {uniqueAssetCount > 0 && <details className="momentum-method momentum-coverage"><summary>{text('coverageTitle', { count: uniqueAssetCount })}</summary><p>{text('coverageBody')}</p><p>{text('coverageGroups')}</p></details>}
    </div>
  );
}
