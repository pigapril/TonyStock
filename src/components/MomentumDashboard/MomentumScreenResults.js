import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import MomentumDetailPanel from './MomentumDetailPanel';
import useDetailNavigation from './useDetailNavigation';
import { moveTabFocus } from './tabNavigation';
import { isAvailableNumber } from './momentumViewModel';

const DEFAULTS = { minGroupScore: '0', minScore: '80', minTurnoverMillion: '', stage: 'leaders' };

export default function MomentumScreenResults({ asOf, onShowRankings, fundRows = [], active = true, initiallyOpen = false, plan = 'free' }) {
  const { t, i18n } = useTranslation();
  const text = (key, options) => t(`momentumDashboard.${key}`, options);
  const [draft, setDraft] = useState(DEFAULTS);
  const [open, setOpen] = useState(initiallyOpen);
  const [criteria, setCriteria] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const tabsId = useId();
  const [resultTab, setResultTab] = useState('stocks');
  const [detailOpen, setDetailOpen] = useState(false);
  const listScrollRef = useRef(null);
  const scrollPositions = useRef({ stocks: 0, funds: 0 });
  const [selectedFund, setSelectedFund] = useState(null);
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(10);
  const detailRef = useRef(null);
  const selectedButton = useRef(null);
  const requestKey = JSON.stringify([criteria, attempt, asOf, plan]);
  const data = result?.key === requestKey ? result.data : null;
  useEffect(() => {
    if (!active || !open || !criteria || result?.key === requestKey) return undefined;
    const controller = new AbortController();
    setError(false); setSelected(null); setSelectedFund(null); setLimit(10);
    setResultTab('stocks'); setDetailOpen(false); scrollPositions.current = { stocks: 0, funds: 0 };
    apiClient.get('/api/public/momentum-dashboard/screen', { params: criteria, signal: controller.signal })
      .then((response) => {
        const value = response.data.data;
        if (!['free', 'pro'].includes(value?.access)) throw new Error('Unsupported screening access contract');
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, data: value });
          if (plan === 'pro' && value.access === 'pro' && value.status === 'available'
            && window.matchMedia?.('(min-width: 901px)')?.matches) {
            setSelected(value.stocks?.[0]?.symbol || null);
            setDetailOpen(Boolean(value.stocks?.length));
          }
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [active, open, criteria, requestKey, result?.key, plan]);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const runScreen = (stage = draft.stage) => {
    setDraft((current) => ({ ...current, stage }));
    setCriteria({ ...DEFAULTS, stage, minTurnoverMillion: '0' });
    setAttempt((current) => current + 1);
  };
  const paid = plan === 'pro' && data?.access === 'pro';
  const sourceFunds = useMemo(() => {
    if (!paid) return [];
    const matches = new Map();
    (data.stocks || []).forEach(stock => {
      new Set((stock.funds || []).map(fund => fund.symbol)).forEach(symbol => {
        matches.set(symbol, (matches.get(symbol) || 0) + 1);
      });
    });
    return (data.funds || []).filter(fund => matches.has(fund.symbol))
      .map(fund => ({ ...fund, matchedStockCount: matches.get(fund.symbol) }));
  }, [paid, data]);
  const selectedRow = paid && detailOpen && (resultTab === 'funds' ? selectedFund : data?.stocks?.find(row => row.symbol === selected));
  useLayoutEffect(() => {
    if (listScrollRef.current) listScrollRef.current.scrollTop = scrollPositions.current[resultTab];
  }, [resultTab, data]);
  const fundRow = symbol => fundRows.find(row => row.symbol.replace(/^BATS:/, '') === symbol);
  const rememberScroll = () => { scrollPositions.current[resultTab] = listScrollRef.current?.scrollTop || 0; };
  const changeResultTab = tab => {
    if (tab === resultTab) return;
    rememberScroll(); setResultTab(tab);
    const desktop = window.matchMedia?.('(min-width: 901px)')?.matches;
    if (tab === 'funds') {
      const row = selectedFund || sourceFunds.map(fund => fundRow(fund.symbol)).find(Boolean);
      setSelectedFund(row || null); setDetailOpen(Boolean(desktop && row));
    } else {
      const symbol = selected || data.stocks[0]?.symbol;
      setSelected(symbol || null); setDetailOpen(Boolean(desktop && symbol));
    }
  };
  const openFund = (symbol, trigger) => {
    const row = fundRow(symbol);
    if (!row) return;
    if (resultTab !== 'funds') { rememberScroll(); setResultTab('funds'); }
    selectedButton.current = trigger?.dataset.fundSymbol ? trigger
      : listScrollRef.current?.querySelector(`[data-fund-symbol="${symbol}"]`);
    setSelectedFund(row); setDetailOpen(true);
    if (!trigger?.dataset.fundSymbol && window.matchMedia?.('(min-width: 901px)')?.matches) {
      requestAnimationFrame(() => selectedButton.current?.focus({preventScroll: true}));
    }
  };
  useDetailNavigation(selectedRow?.symbol, detailRef, selectedButton, active, false);
  const formatScore = (value) => Number(value).toFixed(1);
  const groups = (name) => text(`groups.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, { defaultValue: name });
  const money = (value) => !isAvailableNumber(value) ? '—' : new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const emptyState = data?.emptyState;
  const emptyMessage = emptyState && ['fund_score', 'fund_strength', 'stock_conditions', 'stage_conditions', 'data_incomplete'].includes(emptyState.reason)
    ? text(`screen.emptyReasons.${emptyState.reason === 'stage_conditions' ? data.criteria.stage : emptyState.reason}`, { score: data.criteria.minScore, highest: Number(Number(emptyState.highestScore).toFixed(1)), funds: data.counts.funds, leaders: emptyState.leaderCount })
    : text('screen.empty');
  return <section className="momentum-screen" aria-labelledby="momentum-screen-title">
    <div className="momentum-screen-entry">
      <div><h2 id="momentum-screen-title">{text(initiallyOpen ? 'screen.stage' : 'screen.title')} <span>{text('screen.scope')}</span></h2>{!initiallyOpen && <p>{text('screen.intro')}</p>}</div>
      {!initiallyOpen && <button type="button" className="momentum-screen-toggle" aria-expanded={open} aria-controls="momentum-screen-panel" onClick={() => {
        setOpen(!open); setCriteria(null); setResult(null); setSelected(null); setSelectedFund(null); setDetailOpen(false); setResultTab('stocks'); setError(false);
      }}>{text(open ? 'screen.close' : 'screen.start')}</button>}
    </div>
    {open && <div id="momentum-screen-panel">
    <form className="momentum-screen-form" onSubmit={(event) => { event.preventDefault(); runScreen(); }}>
      <fieldset className="momentum-screen-modes">
        <legend className={initiallyOpen ? 'sr-only' : undefined}>{text('screen.stage')}</legend>
        <div className="momentum-screen-mode-options">
          {['leaders', 'pullback', 'oversold'].map((stage) => <label key={stage} className={draft.stage === stage ? 'is-selected' : ''}>
            <input type="radio" name="momentum-screen-stage" value={stage} aria-label={text(`screen.${stage}`)} checked={draft.stage === stage} onChange={() => update('stage', stage)} aria-describedby={`momentum-screen-${stage}-help${draft.stage === stage ? ' momentum-screen-explanation' : ''}`} />
            <span>{text(`screen.${stage}`)}</span>
            <small id={`momentum-screen-${stage}-help`}>{text(`screen.${stage}Help`)}</small>
          </label>)}
        </div>
      </fieldset>
      <div className="momentum-screen-actions">
        <p id="momentum-screen-explanation">{text(`screen.${draft.stage}Explanation`)}</p>
        <button type="submit" className="momentum-upgrade-button">{text(criteria ? 'screen.apply' : 'screen.submit')}</button>
      </div>
    </form>
    {criteria && (error ? <div role="alert"><p>{text('screen.error')}</p><button type="button" onClick={() => setAttempt((current) => current + 1)}>{text('retry')}</button></div>
      : !data ? <p role="status">{text('screen.loading')}</p>
        : data.status !== 'available' ? <p role="status">{text(data.status === 'date_mismatch' ? 'screen.dateMismatch' : 'screen.pending', { fundsDate: data.asOf || '—', stocksDate: data.stockAsOf || '—' })}</p>
          : <>
            <p className="momentum-screen-summary">{text('screen.summary', { funds: data.counts.funds, stocks: data.counts.stocks, stage: text(`screen.${data.criteria.stage}Results`) })} · <time dateTime={data.asOf}>{data.asOf}</time></p>
            <p className="momentum-relative-note">{text('screen.applied', { score: data.criteria.minScore })} · {data.criteria.minTurnoverMillion > 0 ? text('screen.appliedVolume', { volume: data.criteria.minTurnoverMillion }) : text('screen.noVolumeLimit')} · {text(data.criteria.stage === 'oversold' ? 'screen.oversold' : data.criteria.stage === 'pullback' ? 'screen.pullback' : 'screen.leaders')}</p>
            {!data.counts.stocks && <div className="momentum-screen-empty">
              <p role="status">{emptyMessage}</p>
              {emptyState?.incomplete && emptyState.reason !== 'data_incomplete' && <p>{text('screen.incompleteNote')}</p>}
              {emptyState?.reason === 'stage_conditions' && <button type="button" className="momentum-screen-toggle" onClick={() => runScreen('leaders')}>{text('screen.viewLeaders')}</button>}
              {['fund_score', 'fund_strength'].includes(emptyState?.reason) && onShowRankings && <button type="button" className="momentum-screen-toggle" onClick={onShowRankings}>{text('screen.viewRankings')}</button>}
            </div>}
            {!paid ? <div className={`momentum-screen-locked${data.counts.stocks > 0 ? ' momentum-screen-locked--preview' : ''}`}>
              {(data.counts.stocks > 0) && <div className="momentum-screen-placeholder momentum-workspace has-detail" aria-hidden="true">
                <div className="momentum-screen-list">
                  <div className="momentum-detail-tabs momentum-result-tabs"><span className="momentum-preview-bar" /><span className="momentum-preview-bar" /></div>
                  <div className="momentum-screen-list-scroll">
                    <ul className="momentum-screen-stocks">{Array.from({ length: Math.min(3, data.counts.stocks) }, (_, index) => <li className="momentum-screen-placeholder-row" key={index}>
                      <div className="momentum-screen-stock-row">
                        <div className="momentum-screen-stock-heading"><div className="momentum-row__identity"><span className="momentum-preview-bar" /><span className="momentum-preview-bar" /></div><span className="momentum-preview-bar" /></div>
                        <div className="momentum-screen-row-note"><span className="momentum-preview-bar" /></div>
                      </div>
                      <div className="momentum-screen-row-sources"><span className="momentum-preview-bar" /></div>
                    </li>)}</ul>
                  </div>
                </div>
                <div className="momentum-detail-panel">
                  <div className="momentum-detail-heading"><div className="momentum-row__identity"><span className="momentum-preview-bar" /><span className="momentum-preview-bar" /></div><span className="momentum-preview-bar" /></div>
                  <div className="momentum-preview-indicators"><span className="momentum-preview-bar" /><span className="momentum-preview-bar" /></div>
                  <div className="momentum-preview-periods">{Array.from({ length: 16 }, (_, index) => <span key={index} className="momentum-preview-bar" />)}</div>
                  <svg className="momentum-preview-chart" viewBox="0 0 360 130" fill="none"><path d="M0 110H360M0 65H360M0 20H360" stroke="var(--momentum-line)" /><path d="M0 108L30 92L60 100L90 72L120 80L150 53L180 62L210 40L240 47L270 28L300 34L330 16L360 22" stroke="var(--momentum-green)" strokeWidth="3" /><path d="M0 108L60 99L120 90L180 79L240 73L300 62L360 58" stroke="var(--momentum-muted)" strokeWidth="2" /></svg>
                </div>
              </div>}
              <div className="momentum-screen-locked-copy"><p><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><span>{text('screen.unlockBody')}</span></p>
                <a className="momentum-upgrade-button" href={`/${i18n.language}/subscription-plans`}>{text('screen.unlockAction')}</a>
              </div>
            </div> : <>
            <div className={`momentum-workspace${selectedRow ? ' has-detail' : ''}`}>
            <div className="momentum-screen-list">
            <div className="momentum-detail-tabs momentum-result-tabs" role="tablist" aria-label={text('screen.resultTypes')}>
              {['stocks', 'funds'].map(tab => <button key={tab} type="button" role="tab" id={`${tabsId}-${tab}-tab`} aria-controls={`${tabsId}-${tab}-list`} aria-selected={resultTab === tab} tabIndex={resultTab === tab ? 0 : -1} onKeyDown={moveTabFocus} onClick={() => changeResultTab(tab)}>{text(`screen.${tab}`, {count: tab === 'funds' ? sourceFunds.length : data.counts.stocks})}</button>)}
            </div>
            <div className="momentum-screen-list-scroll" ref={listScrollRef}>
            <div role="tabpanel" id={`${tabsId}-funds-list`} aria-labelledby={`${tabsId}-funds-tab`} hidden={resultTab !== 'funds'}>
              <ul className="momentum-screen-fund-rows">{sourceFunds.map(fund => <li key={fund.symbol}><button type="button" className="momentum-screen-stock-row" data-fund-symbol={fund.symbol} aria-pressed={selectedFund?.symbol.replace(/^BATS:/, '') === fund.symbol} onClick={event => openFund(fund.symbol, event.currentTarget)}>
                <span className="momentum-screen-stock-heading"><span className="momentum-row__identity"><strong>{fund.symbol}</strong><small>{groups(fund.group)}</small></span><strong>{text('screen.score', {value: formatScore(fund.Rank)})}</strong><span aria-hidden="true">›</span></span>
                <span className="momentum-screen-row-note">{text('screen.matchedStocks', {count: fund.matchedStockCount})}</span>
                <span className="momentum-screen-row-note">{text('screen.fundReason', {score: formatScore(fund.Rank)})}</span>
                {fund.holdingsStatus !== 'full' && <span className="momentum-screen-row-note">{text(fund.holdingsStatus === 'unavailable' ? 'screen.noHoldings' : 'screen.partial')}</span>}
              </button></li>)}</ul>
              {!sourceFunds.length && <p>{text('screen.noFunds')}</p>}
            </div>
            <div role="tabpanel" id={`${tabsId}-stocks-list`} aria-labelledby={`${tabsId}-stocks-tab`} hidden={resultTab !== 'stocks'}>
            {!!data.stocks.length && <ul className="momentum-screen-stocks">
              {data.stocks.slice(0, limit).map((row) => <li key={row.symbol}>
                <button type="button" className="momentum-screen-stock-row" aria-pressed={selected === row.symbol} onClick={event => { selectedButton.current = event.currentTarget; setSelected(row.symbol); setDetailOpen(true); }}>
                <span className="momentum-screen-stock-heading"><span className="momentum-row__identity"><strong>{row.symbol}</strong><small>{row.name}</small></span><strong>{text('screen.score', { value: formatScore(row.Rank) })}</strong><span aria-hidden="true">›</span></span>
                <span className="momentum-screen-row-note">{text('screen.stockReason', { volume: money(row.averageDollarVolume20) })}{row.pullback ? ` · ${text('screen.pullback')}` : row.oversold ? ` · ${text('screen.oversold')}` : ''}</span>
                {isAvailableNumber(row.drawdown20) && row.drawdown20 < 0 && <span className="momentum-screen-row-note">{text('screen.drawdown', { value: (Math.abs(row.drawdown20) * 100).toFixed(1) })}</span>}
                </button>
                <div className="momentum-screen-row-sources"><span>{text('screen.from')}</span>{row.funds.map(fund => <button key={fund.symbol} type="button" className="momentum-screen-source-link" onClick={event => openFund(fund.symbol, event.currentTarget)}>{fund.symbol} <span>({groups(fund.group)})</span></button>)}</div>
              </li>)}
            </ul>}
            {data.stocks.length > limit && <button type="button" className="momentum-show-more" onClick={() => setLimit(limit + 10)}>{text('showMore', { count: Math.min(10, data.stocks.length - limit) })}</button>}
            {!!data.stocks.length && <p className="momentum-relative-note">{text('screen.turnoverReminder')}</p>}
            {!!data.stocks.length && data.criteria.stage === 'oversold' && draft.stage !== 'oversold' && <p className="momentum-screen-caution">{text('screen.oversoldCaution')}</p>}
            </div>
            </div>
            </div>
            {selectedRow && <MomentumDetailPanel key={selectedRow.symbol} row={selectedRow} asOf={data.asOf} isFund={resultTab === 'funds'} sourceLabel={resultTab === 'funds' ? text('screen.sourceLabel') : undefined} hideDesktopBack panelRef={detailRef} backLabel={text('screen.back')} onBack={() => {
              setDetailOpen(false);
              if (window.matchMedia?.('(max-width: 900px)')?.matches) requestAnimationFrame(() => {
                const rect = selectedButton.current?.getBoundingClientRect();
                if (rect && (rect.top < 90 || rect.bottom > window.innerHeight)) {
                  selectedButton.current?.scrollIntoView?.({block: 'nearest', behavior: 'auto'});
                }
              });
            }} />}
            </div>
            <p className="momentum-relative-note">{text('screen.coverage', data.coverage)}</p>
            </>}
          </>)}
    </div>}
  </section>;
}
