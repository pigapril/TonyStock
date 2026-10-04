import { moveTabFocus } from './tabNavigation';
import React, { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MomentumConstituents, { MomentumAssetIndicators } from './MomentumConstituents';
import { AssetTrendChart, RelativeStrengthChart } from './MomentumTrendChart';
import { isAvailableNumber } from './momentumViewModel';

const score = value => isAvailableNumber(value) ? Number(value).toFixed(0) : '—';
const percent = value => !isAvailableNumber(value) ? '—' : `${Number(value) > 0 ? '+' : ''}${(Number(value) * 100).toFixed(1)}%`;
const direction = value => !isAvailableNumber(value) || Number(value) === 0 ? 'flat' : Number(value) > 0 ? 'up' : 'down';

export function MomentumAssetDetails({ row, asOf, onResearch }) {
  const { t } = useTranslation();
  const text = (key, options) => t(`momentumDashboard.${key}`, options);
  const benchmarkGap = (asset, days) => {
    if (!isAvailableNumber(asset[`return${days}`]) || !isAvailableNumber(asset[`benchmarkReturn${days}`])) return '—';
    const gap = Number(asset[`return${days}`]) - Number(asset[`benchmarkReturn${days}`]);
    const value = (Math.abs(gap) * 100).toFixed(1);
    return Number(value) === 0 ? text('benchmarkEqual') : text(gap > 0 ? 'benchmarkAhead' : 'benchmarkBehind', { value });
  };
  return <div className="momentum-detail-content">
    <div className="momentum-inline-detail__heading"><span>{text('currentPrice')} <strong>{isAvailableNumber(row.price) ? `$${Number(row.price).toFixed(2)}` : '—'}</strong></span></div>
    <MomentumAssetIndicators row={row} />
    <table className="momentum-period-table">
      <caption>{text('periodComparison')}</caption>
      <thead><tr><th scope="col"><span className="sr-only">{text('comparisonItem')}</span></th>{[20, 60, 120].map((horizon) => <th key={horizon} scope="col" aria-label={text('tradingDays', { days: horizon })}>{text('detail.periodShort', { days: horizon })}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">{row.symbol.replace(/^BATS:/, '')}</th>{[20, 60, 120].map((horizon) => <td key={horizon} className={`momentum-${direction(row[`return${horizon}`])}`}>{percent(row[`return${horizon}`])}</td>)}</tr>
        <tr><th scope="row">SPY</th>{[20, 60, 120].map((horizon) => <td key={horizon}>{percent(row[`benchmarkReturn${horizon}`])}</td>)}</tr>
        <tr className="momentum-period-table__gap"><th scope="row">{text('benchmarkComparison')}</th>{[20, 60, 120].map((horizon) => <td key={horizon}>{benchmarkGap(row, horizon)}</td>)}</tr>
        <tr className="momentum-period-table__score"><th scope="row">{text('periodComponentScore')}</th>{[20, 60, 120].map((horizon) => <td key={horizon}>{score(row[`${horizon}R`])}</td>)}</tr>
      </tbody>
    </table>
    {row.trend60?.length > 0 && <div className="momentum-asset-trend-section">
      <h4>{text('assetTrendTitle')}</h4>
      <AssetTrendChart points={row.trend60} label={text('assetTrendAria', { symbol: row.symbol.replace(/^BATS:/, ''), start: row.trend60[0][0], end: row.trend60[row.trend60.length - 1][0], asset: percent(row.trend60[row.trend60.length - 1][1]), benchmark: percent(row.trend60[row.trend60.length - 1][2]) })} assetName={row.symbol.replace(/^BATS:/, '')} benchmarkName="SPY" formatPercent={percent} />
    </div>}
    {row.relativeTrend60?.length > 0 && <div className="momentum-asset-trend-section">
      <h4>{text('relativeTrendTitle')}</h4>
      <RelativeStrengthChart points={row.relativeTrend60} label={text('relativeTrendAria', { symbol: row.symbol.replace(/^BATS:/, '') })} lineLabel={text('relativeTrendLine')} averageLabel={text('relativeTrendAverage')} />
      <p className="momentum-relative-note">{text('relativeTrendHelp')}</p>
    </div>}
    {row.dataStatus === 'stale_price' && <p className="momentum-relative-note">{text('staleAsset')}</p>}

    <p className="momentum-inline-detail__date">{text('asOf')} {row.asOf || row.priceAsOf || asOf}</p>
    <a className="momentum-research-link" onClick={onResearch} href={`https://finance.yahoo.com/quote/${encodeURIComponent(row.symbol.replace(/^BATS:/, ''))}/`} target="_blank" rel="noopener noreferrer">{text('researchLink')} <span aria-hidden="true">↗</span></a>
  </div>;
}

export default function MomentumDetailPanel({ row, asOf, isFund = false, onBack, backLabel, panelRef, onResearch, hideDesktopBack = false, sourceLabel }) {
  const { t } = useTranslation();
  const text = (key, options) => t(`momentumDashboard.${key}`, options);
  const panelId = useId();
  const mobileScroll = useRef(0);
  const [tab, setTab] = useState('overview');
  const [holdingsVisited, setHoldingsVisited] = useState(false);
  const [stock, setStock] = useState(null);
  const holdingsTrigger = useRef(null);
  const headingRef = useRef(null);
  const holdingsScroll = useRef(0);
  const activeRow = stock || row;
  const selectStock = (value, trigger) => {
    holdingsTrigger.current = trigger;
    mobileScroll.current = window.scrollY;
    holdingsScroll.current = panelRef?.current?.scrollTop || 0;
    setStock(value);
    requestAnimationFrame(() => {
      panelRef?.current?.scrollTo?.({ top: 0 });
      if (window.matchMedia?.('(max-width: 900px)')?.matches) {
        panelRef?.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
      }
      headingRef.current?.focus({ preventScroll: true });
    });
  };
  const back = () => {
    if (!stock) { onBack(); return; }
    setStock(null);
    requestAnimationFrame(() => {
      panelRef?.current?.scrollTo?.({ top: holdingsScroll.current });
      holdingsTrigger.current?.focus({ preventScroll: true });
      if (window.matchMedia?.('(max-width: 900px)')?.matches) {
        window.scrollTo({ top: mobileScroll.current, behavior: 'auto' });
      }
    });
  };
  return <aside className="momentum-detail-panel" ref={panelRef} tabIndex={-1} aria-label={text('detail.label', { symbol: activeRow.symbol })}>
    <div className="momentum-detail-toolbar">
    <button type="button" className={`momentum-detail-back${hideDesktopBack && !stock ? ' momentum-detail-back--mobile-only' : ''}`} onClick={back}>← {stock ? text('detail.backToFund', { symbol: row.symbol.replace(/^BATS:/, '') }) : backLabel}</button>
    {sourceLabel && !stock && <span className="momentum-detail-role">{sourceLabel}</span>}
    <div className="momentum-detail-heading"><h3 ref={headingRef} tabIndex={-1}>{activeRow.symbol.replace(/^BATS:/, '')}<small>{activeRow.name}</small></h3><div className="momentum-detail-score"><span>{text('detail.scoreLabel')}</span><strong>{score(activeRow.Rank)}<small> /100</small></strong></div></div>
    {isFund && !stock && <div className="momentum-detail-tabs" role="tablist" aria-label={text('detail.fundTabs')}>
      {['overview', 'holdings'].map(key => <button key={key} type="button" role="tab" id={`momentum-${panelId}-${key}-tab`} tabIndex={tab === key ? 0 : -1} onKeyDown={moveTabFocus} aria-selected={tab === key} aria-controls={`momentum-${panelId}-${key}`} onClick={() => { setTab(key); if (key === 'holdings') setHoldingsVisited(true); }}>{text(`detail.${key}`)}</button>)}
    </div>}
    </div>
    <div hidden={Boolean(stock) || tab !== 'overview'} role={isFund ? 'tabpanel' : undefined} id={`momentum-${panelId}-overview`} aria-labelledby={isFund ? `momentum-${panelId}-overview-tab` : undefined}>
      <MomentumAssetDetails row={row} asOf={asOf} onResearch={onResearch} />
    </div>
    {isFund && holdingsVisited && <div hidden={Boolean(stock) || tab !== 'holdings'} role="tabpanel" id={`momentum-${panelId}-holdings`} aria-labelledby={`momentum-${panelId}-holdings-tab`}>
      <MomentumConstituents symbol={row.symbol} onSelectStock={selectStock} />
    </div>}
    {stock && <MomentumAssetDetails row={stock} asOf={asOf} />}
    {!isFund && row.funds?.length > 0 && <ul className="momentum-screen-sources">{row.funds.map(fund => <li key={fund.symbol}>{fund.symbol} · {text('holdingWeight')} {percent(fund.weight)} · {text(fund.completeness === 'full' ? 'screen.full' : 'screen.partial')} · {fund.holdingsAsOf ? text('holdingsDate', { date: fund.holdingsAsOf }) : text('holdingsDateUnknown')} · {text('screen.coverageWeight', { weight: percent(fund.coverageWeight) })}</li>)}</ul>}
  </aside>;
}
