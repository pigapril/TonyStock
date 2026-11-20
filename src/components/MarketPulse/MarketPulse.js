import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import { getIntlLocale } from '../../locales/localeConfig';
import { resolveMarketLocaleText } from '../MarketSentimentIndex/marketLocaleCopy';
import './MarketPulse.css';

const REFRESH_MS = 60 * 1000;
export const MARKETS = [
  { id: 'sp500', labels: { 'zh-TW': 'S&P 500', 'zh-CN': '标普 500', 'ko-KR': 'S&P 500', en: 'S&P 500' } },
  { id: 'nasdaq100', labels: { 'zh-TW': 'NASDAQ 100', 'zh-CN': '纳斯达克 100', 'ko-KR': '나스닥 100', en: 'Nasdaq 100' } },
  { id: 'dow', labels: { 'zh-TW': '道瓊工業', 'zh-CN': '道琼斯工业指数', 'ko-KR': '다우존스 산업평균지수', en: 'Dow Jones' } },
  { id: 'taiwan', labels: { 'zh-TW': '台灣加權', 'zh-CN': '台湾加权指数', 'ko-KR': '대만 가권지수', en: 'TAIEX' } },
  { id: 'nikkei', labels: { 'zh-TW': '日經 225', 'zh-CN': '日经 225', 'ko-KR': '닛케이 225', en: 'Nikkei 225' } },
  { id: 'shanghai', labels: { 'zh-TW': '上證指數', 'zh-CN': '上证指数', 'ko-KR': '상하이 종합지수', en: 'Shanghai Composite' } },
  { id: 'kospi', labels: { 'zh-TW': '韓國綜合', 'zh-CN': '韩国综合指数', 'ko-KR': '코스피', en: 'KOSPI' } },
  { id: 'hangseng', labels: { 'zh-TW': '恆生指數', 'zh-CN': '恒生指数', 'ko-KR': '항셍지수', en: 'Hang Seng' } },
  { id: 'ftse100', labels: { 'zh-TW': '富時 100', 'zh-CN': '富时 100', 'ko-KR': 'FTSE 100', en: 'FTSE 100' } }
];

let sharedSnapshot = null;
let sharedFetchedAt = 0;

function Sparkline({ points, direction }) {
  const path = useMemo(() => {
    if (!Array.isArray(points) || points.length < 2) return '';
    const valid = points.filter(([time, price]) => Number.isFinite(time) && Number.isFinite(price));
    if (valid.length < 2) return '';
    const times = valid.map(([time]) => time);
    const prices = valid.map(([, price]) => price);
    const first = Math.min(...times);
    const duration = Math.max(1, Math.max(...times) - first);
    const low = Math.min(...prices);
    const range = Math.max(0.001, Math.max(...prices) - low);
    return valid.map(([time, price], index) => (
      `${index ? 'L' : 'M'}${((time - first) / duration * 94 + 1).toFixed(1)},${(45 - (price - low) / range * 42).toFixed(1)}`
    )).join(' ');
  }, [points]);

  return (
    <svg className={`market-pulse__sparkline market-pulse__sparkline--${direction}`} viewBox="0 0 96 48" preserveAspectRatio="none" aria-hidden="true">
      {path && <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export default function MarketPulse() {
  const { t, i18n } = useTranslation();
  const [snapshot, setSnapshot] = useState(sharedSnapshot);
  const [unavailable, setUnavailable] = useState(false);
  const [shouldRotate, setShouldRotate] = useState(false);
  const viewportRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (document.visibilityState === 'hidden' || inFlight) return;
      if (sharedSnapshot && Date.now() - sharedFetchedAt < REFRESH_MS) {
        setSnapshot(sharedSnapshot);
        return;
      }
      inFlight = true;
      try {
        const response = await apiClient.get('/api/public/market-pulse');
        if (!active) return;
        sharedSnapshot = response.data?.data || null;
        sharedFetchedAt = Date.now();
        setSnapshot(sharedSnapshot);
        setUnavailable(!sharedSnapshot?.markets?.length);
      } catch (error) {
        if (active) setUnavailable(true);
      } finally {
        inFlight = false;
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  const byId = new Map((snapshot?.markets || []).map((market) => [market.id, market]));
  const visible = MARKETS.map((market) => ({ ...market, data: byId.get(market.id) })).filter(({ data }) => data?.points?.length);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return undefined;
    const measure = () => setShouldRotate(group.scrollWidth > viewport.clientWidth + 2);
    measure();
    if (typeof window.ResizeObserver !== 'function') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new window.ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, [visible.length]);

  const renderMarkets = (duplicate = false) => visible.map(({ id, labels, data }) => {
    const name = resolveMarketLocaleText(labels, i18n.language);
    const change = Number.isFinite(data.changePercent) ? data.changePercent : null;
    const direction = change === null || Math.abs(change) < 0.005 ? 'flat' : change > 0 ? 'up' : 'down';
    const percent = change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
    const latestValue = data.points[data.points.length - 1]?.[1];
    const value = Number.isFinite(latestValue)
      ? latestValue.toLocaleString(getIntlLocale(i18n.language), { maximumFractionDigits: 0 })
      : '—';
    return (
      <div className="market-pulse__item" key={`${id}${duplicate ? '-copy' : ''}`} aria-label={t('marketPulse.itemLabel', { name, value, percent })}>
        <span className="market-pulse__name">{name}</span>
        <span className="market-pulse__value">{value}</span>
        <span className={`market-pulse__change market-pulse__change--${direction}`}>{percent}</span>
        <Sparkline points={data.points} direction={direction} />
      </div>
    );
  });

  return (
    <section className="market-pulse" aria-label={t('marketPulse.title')}>
      {visible.length ? (
        <div className={`market-pulse__viewport${shouldRotate ? ' is-rotating' : ''}`} ref={viewportRef}>
          <div className="market-pulse__track">
            <div className="market-pulse__group" ref={groupRef}>{renderMarkets()}</div>
            {shouldRotate && <div className="market-pulse__group market-pulse__group--copy" aria-hidden="true">{renderMarkets(true)}</div>}
          </div>
        </div>
      ) : (
        <p className="market-pulse__empty">{unavailable ? t('marketPulse.unavailable') : t('marketPulse.loading')}</p>
      )}
      <p className="market-pulse__refresh-note">{t('marketPulse.refreshNote')}</p>
    </section>
  );
}
