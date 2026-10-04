import PageContainer from '../PageContainer/PageContainer';
import { moveTabFocus } from './tabNavigation';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import { useAuth } from '../Auth/useAuth';
import { trackProductEvent } from '../../utils/productAnalytics';
import { isAvailableNumber, sortRowsByDailyMove, sortRowsByRank, summarizeGroups } from './momentumViewModel';
import { GroupSparkline } from './MomentumTrendChart';
import MomentumDetailPanel from './MomentumDetailPanel';
import useDetailNavigation from './useDetailNavigation';
import MomentumScreenResults from './MomentumScreenResults';
import { hasSeenMomentumTour, markMomentumTourSeen } from './tourStorage';
import './MomentumDashboardPage.css';

const UNIVERSES = ['Industry', 'Assets', 'Structure'];
const EMPTY_ROWS = [];
const PAGE_SIZE = 12;
const MomentumDashboardTour = lazy(() => import('./MomentumDashboardTour'));
const score = (value) => isAvailableNumber(value) ? Number(value).toFixed(0) : '—';
const percent = (value) => {
  if (!isAvailableNumber(value)) return '—';
  const raw = Number(value) * 100;
  const rounded = Math.abs(raw) < 0.05 ? 0 : raw;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;
};
const direction = (value) => !isAvailableNumber(value) || Math.abs(Number(value) * 100) < 0.05 ? 'flat' : Number(value) > 0 ? 'up' : 'down';
const groupKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function colorBand(value, metric) {
  if (!isAvailableNumber(value)) return 'missing';
  if (metric === 'daily') return Number(value) > 0 ? 'gain' : Number(value) < 0 ? 'loss' : 'neutral';
  const scoreValue = Number(value);
  return scoreValue < 30 ? 'weak' : scoreValue < 45 ? 'soft' : scoreValue < 55 ? 'neutral' : scoreValue < 70 ? 'firm' : 'strong';
}

export default function MomentumDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const authKey = JSON.stringify([user?.id || user?.userId || null, user?.plan || 'free', Boolean(authLoading)]);
  const upgradeUrl = `/${i18n.language}/subscription-plans`;
  const guideUrl = `/${i18n.language}/articles/${i18n.language === 'en' ? 'market-momentum-dashboard-guide' : '5.市場動能儀表板使用指南'}/`;
  const text = useCallback((key, options) => t(`momentumDashboard.${key}`, options), [t]);
  const groupLabel = (name) => text(`groups.${groupKey(name)}`, { defaultValue: name });
  const groupHint = (name) => universe === 'Structure' ? text(`groupHints.${groupKey(name)}`, { defaultValue: '' }) : '';
  const [responseState, setResponseState] = useState(null);
  // Hide the previous account's data immediately, before the refetch effect runs.
  const snapshot = responseState?.authKey === authKey ? responseState.value : null;
  const isFree = snapshot?.access?.plan === 'free';
  const requestVersion = useRef(0);
  const [view, setView] = useState('market');
  const detailRef = useRef(null);
  const detailTrigger = useRef(null);
  const [universe, setUniverse] = useState('Industry');
  const [metric, setMetric] = useState('rank');
  const [sortOrder, setSortOrder] = useState('desc');
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() => Boolean(window.matchMedia?.('(min-width: 901px)')?.matches));
  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 901px)');
    if (!media) return undefined;
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTour, setShowTour] = useState(false);
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

  const loadDashboard = useCallback(async (signal, background = false) => {
    if (authLoading) return;
    const version = ++requestVersion.current;
    if (!background) setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get('/api/public/momentum-dashboard?access=v2', { signal });
      const value = response.data?.data || null;
      // Refuse a legacy, publicly cached payload from a backend not yet upgraded.
      if (value && value.access?.version !== 2) throw new Error('Unsupported momentum access contract');
      if (!signal?.aborted && version === requestVersion.current) {
        setResponseState({ authKey, value });
        trackProductEvent('momentum_load', { status: response.data?.data ? 'success' : 'empty' });
      }
    } catch (requestError) {
      if (!signal?.aborted && version === requestVersion.current) {
        setError(true);
        trackProductEvent('momentum_load', { status: 'failed' });
      }
    } finally {
      if (!signal?.aborted && version === requestVersion.current) setLoading(false);
    }
  }, [authKey, authLoading]);

  useEffect(() => {
    setResponseState(null);
    setView('market');
    setSelectedSymbol(null);
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => { controller.abort(); requestVersion.current += 1; };
  }, [loadDashboard]);

  const rows = snapshot?.data?.[universe] || EMPTY_ROWS;
  const groupTrends = snapshot?.groupTrends?.[universe] || {};
  const uniqueAssetCount = snapshot?.access?.totalCount || 0;
  const lockedRows = snapshot?.locked?.[universe] || EMPTY_ROWS;
  const groups = useMemo(() => {
    const summaries = [...(snapshot?.groups?.[universe] || summarizeGroups(rows))];
    if (metric === 'rank') summaries.sort((a, b) => (b.averageRank ?? -1) - (a.averageRank ?? -1));
    else summaries.sort((a, b) => (b.dailyMove ?? -Infinity) - (a.dailyMove ?? -Infinity));
    return summaries;
  }, [snapshot, universe, rows, metric]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matching = rows.filter((row) => (!selectedGroup || row.group === selectedGroup)
      && (!term || `${row.symbol} ${row.name} ${row.group} ${text(`groups.${groupKey(row.group || 'Other')}`, { defaultValue: row.group })}`.toLowerCase().includes(term)));
    return metric === 'daily' ? sortRowsByDailyMove(matching, sortOrder) : sortRowsByRank(matching, sortOrder);
  }, [rows, selectedGroup, query, metric, sortOrder, text]);

  const filteredLocked = useMemo(() => {
    const term = query.trim().toLowerCase();
    return lockedRows.filter((row) => (!selectedGroup || row.group === selectedGroup)
      && (!term || `${row.symbol} ${row.name} ${row.group} ${text(`groups.${groupKey(row.group || 'Other')}`, { defaultValue: row.group })}`.toLowerCase().includes(term)));
  }, [lockedRows, query, selectedGroup, text]);
  const trackUpgrade = (source) => trackInteraction('upgrade_click', { source });

  useEffect(() => {
    if (!query.trim()) return undefined;
    const timer = setTimeout(() => trackProductEvent('momentum_search', {
      universe, group_name: selectedGroup, result_count: filteredRows.length + filteredLocked.length
    }), 600);
    return () => clearTimeout(timer);
  }, [query, universe, selectedGroup, filteredRows.length, filteredLocked.length]);

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
  const selectedRow = filteredRows.find(row => row.symbol === selectedSymbol) || (isDesktop ? filteredRows[0] : undefined);
  useDetailNavigation(selectedRow?.symbol, detailRef, detailTrigger, view === 'market', false);
  const hasRows = uniqueAssetCount > 0;
  const finishTour = useCallback(() => { markMomentumTourSeen(); setShowTour(false); }, []);
  useEffect(() => { setShowTour(false); }, [authKey]);
  useEffect(() => {
    if (view !== 'market' || showTour || loading || authLoading || !hasRows || hasSeenMomentumTour()) return undefined;
    const timer = window.setTimeout(() => setShowTour(true), 900);
    return () => window.clearTimeout(timer);
  }, [view, showTour, loading, authLoading, hasRows]);

  // First deploy may still be preparing the snapshot. Recover without requiring a reload.
  useEffect(() => {
    if (authLoading || loading || error || hasRows) return undefined;
    const controller = new AbortController();
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try { await loadDashboard(controller.signal, true); }
      finally { inFlight = false; }
    }, 30000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [authLoading, loading, error, hasRows, loadDashboard]);

  return (
    <PageContainer metadataOnly title={text('pageTitle')} description={text('pageDescription')}>
    <div className="momentum-page">
      <header className="momentum-header">
        <div>
          <h1>{text('title')}</h1>
          <p>{text('subtitle')}</p>
          <button type="button" className="momentum-tour-trigger" disabled={!hasRows || authLoading || loading} onClick={() => { setView('market'); setSelectedSymbol(null); setShowTour(true); }}>{text('tour.start')}</button>
        </div>
        {snapshot?.asOf && <div className="momentum-date"><span>{text(isFree ? 'access.freeAsOf' : 'access.proAsOf')}</span><time dateTime={snapshot.asOf}>{snapshot.asOf}</time>{isFree && <a href={upgradeUrl} onClick={() => trackUpgrade('header')}>{text('access.upgrade')}</a>}</div>}
      </header>

      <div className="momentum-primary-tabs" role="tablist" aria-label={text('navigation.label')}>
        {['market', 'screen'].map(key => <button key={key} type="button" role="tab" disabled={key === 'screen' && !hasRows} id={`momentum-${key}-tab`} tabIndex={view === key ? 0 : -1} onKeyDown={moveTabFocus} aria-selected={view === key} aria-controls={`momentum-${key}-view`} onClick={() => { setView(key); if (showTour) finishTour(); }}>{text(`navigation.${key}`)}</button>)}
      </div>
      {hasRows && snapshot && <div id="momentum-screen-view" role="tabpanel" aria-labelledby="momentum-screen-tab" hidden={view !== 'screen'}>
        <MomentumScreenResults key={authKey} initiallyOpen active={view === 'screen'} plan={snapshot.access.plan} asOf={snapshot.asOf} fundRows={snapshot.data.Industry} onShowRankings={() => {
          setView('market'); setUniverse('Industry'); setMetric('rank'); setSelectedGroup(null); setSelectedSymbol(null); setQuery(''); setSortOrder('desc');
        }} />
      </div>}
      <div id="momentum-market-view" role="tabpanel" aria-labelledby="momentum-market-tab" hidden={view !== 'market'} className={selectedRow ? 'momentum-market-view has-detail' : 'momentum-market-view'}>

      <div className="momentum-controls">
        <div className="momentum-scopes" role="group" aria-label={text('universeLabel')}>
          {UNIVERSES.map((key) => <button type="button" key={key} aria-pressed={universe === key} onClick={() => changeScope(key)}>{text(`tabs.${key}`)}</button>)}
        </div>
        <div className="momentum-metrics" role="group" aria-label={text('displayMetric')}>
          <button type="button" aria-pressed={metric === 'rank'} onClick={() => changeMetric('rank')}>{text('rankMode')}</button>
          <button type="button" aria-pressed={metric === 'daily'} onClick={() => changeMetric('daily')}>{text('dailyMode')}</button>
        </div>
      </div>

      {(loading || authLoading) && !hasRows ? <div className="momentum-loading" role="status"><span>{text('loading')}</span><div aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div></div>
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
              {metric === 'daily' && <p className="momentum-map-caption">{text('dailyCaption')}</p>}

            </div>
            <div className="momentum-map">
              {groups.map((group) => {
                const value = metric === 'rank' ? group.averageRank : group.dailyMove;
                const trend = groupTrends[group.name] || EMPTY_ROWS;
                return <button type="button" key={group.name}
                  className={`momentum-tile momentum-tile--${colorBand(value, metric)}${metric === 'rank' ? ' momentum-tile--rank' : ''}`}
                  style={metric === 'daily' && isAvailableNumber(value) ? { '--move-intensity': `${Math.min(80, 18 + Math.abs(Number(value)) * 2000)}%` } : undefined}
                  aria-pressed={selectedGroup === group.name}
                  aria-label={text(metric === 'rank' && trend.filter((point) => isAvailableNumber(point.score)).length > 1 ? 'groupButtonSparkline' : 'groupButton', { group: groupLabel(group.name), value: metric === 'rank' ? score(value) : percent(value) })}
                  onClick={() => {
                    selectGroup(group.name);
                    requestAnimationFrame(() => {
                      assetsRef.current?.focus({ preventScroll: true });
                      assetsRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth', block: 'start' });
                    });
                  }}>
                  <span className="momentum-tile__name">{groupLabel(group.name)}{groupHint(group.name) && <small>{groupHint(group.name)}</small>}</span>
                  <span className="momentum-tile__value">{metric === 'rank' ? score(value) : percent(value)}{metric === 'rank' && isAvailableNumber(value) && <small>/100</small>}</span>
                  {metric === 'rank' && <GroupSparkline points={trend} />}
                  <span className="momentum-tile__footer"><span>{text('assetCount', { count: group.count })}</span><span aria-hidden="true">{selectedGroup === group.name ? '✓' : '→'}</span></span>
                </button>;
              })}
            </div>
          </section>

          <div className={`momentum-workspace momentum-market-workspace${selectedRow ? ' has-detail' : ''}`}>
          <section className="momentum-assets" ref={assetsRef} tabIndex={-1} aria-labelledby="momentum-assets-title">
            <div className="momentum-assets-heading">
              <div><h2 id="momentum-assets-title">{selectedGroup ? groupLabel(selectedGroup) : text(metric === 'daily' ? isFree ? 'access.freeDailyRanking' : 'dailyAssets' : isFree ? 'access.freeRanking' : 'allAssets')}</h2><p aria-live="polite">{text(`${metric}Order${sortOrder === 'asc' ? 'Asc' : ''}`)}</p></div>
              <label className="momentum-search"><span className="sr-only">{text('searchLabel')}</span><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedSymbol(null); setVisibleCount(PAGE_SIZE); }} placeholder={text('searchPlaceholder')} /></label>
            </div>
            {isFree && <p className="momentum-access-note">{selectedGroup
              ? text('access.groupDetail', { visible: rows.filter((row) => row.group === selectedGroup).length, total: groups.find((group) => group.name === selectedGroup)?.count || 0 })
              : text('access.freeDetail', { count: snapshot.access.freeCount })}</p>}
            {selectedGroup && text(`groupDescriptions.${groupKey(selectedGroup)}`, { defaultValue: '' }) && <p className="momentum-group-description">{text(`groupDescriptions.${groupKey(selectedGroup)}`)}</p>}
            {selectedGroup && <button type="button" className="momentum-clear" onClick={() => selectGroup(selectedGroup)}>{text('showAll')} <span aria-hidden="true">×</span></button>}
            <div className="momentum-assets-scroll">
            {(filteredRows.length > 0 || !filteredLocked.length) && <div className="momentum-list" aria-label={text('assetList')}>
              <div className="momentum-list-head"><span>{text('asset')}</span>{['daily', 'rank'].map((key) => <button type="button" key={key} className="momentum-sort" aria-pressed={metric === key} aria-label={text('sortColumn', { column: text(`${key}Mode`), order: text(metric === key && sortOrder === 'desc' ? 'ascending' : 'descending') })} onClick={() => changeSort(key)}>
                <span>{text(key === 'rank' ? 'detail.scoreLabel' : 'dailyMode')}</span><span aria-hidden="true">{metric === key ? sortOrder === 'desc' ? '↓' : '↑' : '↕'}</span>
              </button>)}</div>
              {filteredRows.slice(0, visibleCount).map((row) => <React.Fragment key={row.symbol}>
                <button type="button" className="momentum-row" aria-expanded={selectedRow?.symbol === row.symbol} aria-pressed={selectedRow?.symbol === row.symbol} onClick={(event) => { detailTrigger.current = event.currentTarget; if (selectedRow?.symbol !== row.symbol) trackInteraction('asset_open', { asset_symbol: row.symbol.replace(/^BATS:/, '') }); setSelectedSymbol((current) => !isDesktop && current === row.symbol ? null : row.symbol); }}>
                  <span className="momentum-row__identity"><strong>{row.symbol.replace(/^BATS:/, '')}</strong><small>{text(`assetDescriptions.${row.symbol.replace(/^BATS:/, '')}`, { defaultValue: row.name })}</small></span>
                  <span className={`momentum-row__daily momentum-${direction(row.change1dPct)}`}>{percent(row.change1dPct)}</span>
                  <span className="momentum-row__rank"><span className="momentum-rail" aria-hidden="true"><i style={{ width: `${isAvailableNumber(row.Rank) ? Math.max(0, Math.min(100, Number(row.Rank))) : 0}%` }} /></span><strong>{score(row.Rank)}</strong><span className="momentum-expand" aria-hidden="true">{'›'}</span></span>
                </button>

              </React.Fragment>)}
              {!filteredRows.length && !filteredLocked.length && <div className="momentum-no-matches" role="status"><p>{text('noMatches')}</p><button type="button" onClick={() => { setQuery(''); setSelectedGroup(null); }}>{text('clearFilters')}</button></div>}
            </div>}
            {isFree && filteredLocked.length > 0 && <aside className="momentum-upgrade" aria-label={text('access.lockedLabel')}>
              <div className="momentum-upgrade__copy"><span className="momentum-pro-badge">PRO</span><h3>{text('access.upgradeTitle', { count: uniqueAssetCount })}</h3>
                <p>{text('access.upgradeBody', { count: filteredLocked.length })}</p>
                <ul className="momentum-locked-preview" aria-label={text('access.lockedLabel')}>{filteredLocked.slice(0, 3).map((row) => <li key={row.symbol}>
                  <strong>{row.symbol.replace(/^BATS:/, '')}</strong><span>{text(`assetDescriptions.${row.symbol.replace(/^BATS:/, '')}`, { defaultValue: row.name })}</span><small>{text('access.proOnly')}</small>
                </li>)}</ul>
              </div>
              <a className="momentum-upgrade-button" href={upgradeUrl} onClick={() => trackUpgrade(query ? 'search' : selectedGroup ? 'group' : 'ranking')}>{text('access.upgradeAction')} <span aria-hidden="true">→</span></a>
            </aside>}
            {filteredRows.length > PAGE_SIZE && <button type="button" className="momentum-show-more" onClick={() => { trackInteraction(visibleCount < filteredRows.length ? 'show_more' : 'show_less'); setVisibleCount(visibleCount < filteredRows.length ? filteredRows.length : PAGE_SIZE); }}>{text(visibleCount < filteredRows.length ? 'showMore' : 'showLess', { count: filteredRows.length - PAGE_SIZE })}</button>}
            </div>
          </section>
          {selectedRow && <MomentumDetailPanel key={`${authKey}:${selectedRow.symbol}`} row={selectedRow} asOf={snapshot.asOf} isFund hideDesktopBack panelRef={detailRef} backLabel={text('detail.backToEtfs')} onBack={() => setSelectedSymbol(null)} onResearch={() => trackInteraction('research_click', { asset_symbol: selectedRow.symbol.replace(/^BATS:/, '') })} />}
          </div>
              {metric === 'rank' && <>
                <aside id="momentum-reading-guide" className="momentum-reading-guide" aria-label={text('guideLabel')}>
                  <dl>
                    {['score', 'period', 'action'].map((key) => <div key={key}><dt>{text(`guide.${key}.title`)}</dt><dd>{text(`guide.${key}.body`)}</dd></div>)}
                  </dl>
                  <a className="momentum-reading-guide__link" href={guideUrl}>{text('readGuide')} <span aria-hidden="true">↗</span></a>
                </aside>
              </>}
        </>}

      <details className="momentum-method"><summary>{text('methodTitle')}</summary><p>{text('methodBody')}</p><p>{text('methodTrend')}</p><p>{text('methodCaveat')}</p></details>
      {uniqueAssetCount > 0 && <details className="momentum-method momentum-coverage"><summary>{text('coverageTitle', { count: uniqueAssetCount })}</summary><p>{text('coverageBody')}</p><p>{text('coverageGroups')}</p></details>}
      </div>
      {showTour && <Suspense fallback={null}><MomentumDashboardTour text={text} metric={metric} onFinish={finishTour} /></Suspense>}
    </div>
    </PageContainer>
  );
}
