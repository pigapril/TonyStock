import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import PageContainer from '../PageContainer/PageContainer';
import { getDecimalPlaces } from '../../utils/priceUtils';
import { findIndicatorPage } from './indicatorPages';
import './SentimentIndicatorPage.css';
import SentimentHistoryExamples from './SentimentHistoryExamples';

/**
 * 單一指標的常青解說頁。
 *
 * 解說內容（什麼是、怎麼解讀、歷史區間、與 SIO 的關係）寫死在 i18n，長期不變；
 * 當前值向 API 取，所以這頁同時是解說也是即時查詢。
 * 讀值區塊從首屏就保留位置；載入失敗也不移除，避免把正在閱讀的正文推移。
 * 解說照常顯示：常青內容不該依賴 API。
 *
 * 各段標題刻意帶指標全名（含中文名），讓 h2 本身就是搜尋得到的問句。
 */
const SentimentIndicatorPage = () => {
  const { t } = useTranslation();
  const { lang, slug } = useParams();
  const { pathname, search } = useLocation();
  const page = findIndicatorPage(slug);
  const [readingState, setReadingState] = useState(null);
  // 路由切換後舊回應不屬於新指標，不能在新頁的載入期間顯示。
  const reading = readingState?.pageId === page?.boardItemId ? readingState?.item : null;
  const loadingReading = Boolean(page?.boardItemId && readingState?.pageId !== page.boardItemId);
  const hasReading = reading?.value !== null && reading?.value !== undefined;

  useEffect(() => {
    if (!page) return undefined;
    let cancelled = false;

    if (page.boardItemId) {
      apiClient.get('/api/sentiment-board')
        .then((res) => {
          if (cancelled) return;
          const items = (res.data?.data?.groups || []).flatMap((group) => group.items);
          setReadingState({ pageId: page.boardItemId, item: items.find((item) => item.id === page.boardItemId) || null });
        })
        .catch(() => {
          if (!cancelled) setReadingState({ pageId: page.boardItemId, item: null });
        });
    }


    return () => { cancelled = true; };
  }, [page]);

  if (!page) {
    return <Navigate to={`/${lang}/sentiment-indicators`} replace />;
  }

  const key = `sentimentIndicatorPages.${page.i18nKey}`;
  const bands = t(`${key}.bands`, { returnObjects: true });
  const components = t(`${key}.components`, { returnObjects: true });

  return (
    <PageContainer
      title={t(`${key}.pageTitle`)}
      description={t(`${key}.pageDescription`)}
      keywords={t(`${key}.keywords`)}
    >
      <article className="indicator-page">
        <nav className="indicator-page__breadcrumb">
          <Link to={`/${lang}/sentiment-indicators`}>{t('sentimentBoard.heading')}</Link>
          <span aria-hidden="true"> / </span>
          <span>{t(`${key}.shortName`)}</span>
        </nav>

        <header className="indicator-page__header">
          <h1 className="indicator-page__title">{t(`${key}.heading`)}</h1>
          <p className="indicator-page__lede">{t(`${key}.lede`)}</p>
          {page.slug === 'bofa-bull-bear' && (
            <a className="indicator-page__example-shortcut" href={`${pathname}${search}#sio-history-examples`}>
              {t('sentimentHistoryExamples.shortcut')} <span aria-hidden="true">↓</span>
            </a>
          )}
        </header>

        {page.boardItemId && (
          <section className="indicator-page__current" aria-busy={loadingReading}>
            <p className="indicator-page__currentLabel">{t('sentimentIndicatorPages.currentReading')}</p>
            <p className="indicator-page__currentValue">
              {hasReading ? formatReading(reading.value) : '—'}
              {/* 多數指標是無單位的分數（AAII 價差、CNN 0-100），但廣度是百分比，
                  少了 % 會看不懂 31.2 是什麼。單位由註冊表宣告，不猜。 */}
              {hasReading && page.unit ? <span className="indicator-page__currentUnit">{page.unit}</span> : null}
            </p>
            <p className="indicator-page__currentMeta" title={hasReading ? [reading.date, reading.publisher].filter(Boolean).join(' · ') : undefined}>
              {loadingReading ? t('common.loading') : hasReading ? (
                <>{reading.date}{reading.publisher ? ` · ${reading.publisher}` : ''}</>
              ) : t('sentimentBoard.noData')}
            </p>
          </section>
        )}

        <Section title={t(`${key}.whatItIsTitle`)}>
          <p>{t(`${key}.whatItIs`)}</p>
        </Section>

        {Array.isArray(bands) && bands.length > 0 && (
          <Section title={t(`${key}.howToReadTitle`)}>
            <p>{t(`${key}.howToRead`)}</p>

            <ul className="indicator-page__bands">
              {bands.map((band) => (
                <li key={band.range} className="indicator-page__band">
                  <span className="indicator-page__bandRange">{band.range}</span>
                  <span className="indicator-page__bandMeaning">{band.meaning}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {page.slug === 'bofa-bull-bear' && <SentimentHistoryExamples lang={lang} />}

        {Array.isArray(components) && components.length > 0 && (
          <Section title={t(`${key}.componentsTitle`)}>
            <p>{t(`${key}.componentsIntro`)}</p>
            <ul className="indicator-page__components">
              {components.map((component) => {
                // 有即時值就一起顯示。CNN 給的是標準化分數加級距，
                // BofA 那份試算表給的是 0~1 的百分位，所以兩種都要能呈現。
                const live = component.key ? formatComponent(reading?.components?.[component.key]) : null;
                return (
                  <li key={component.key || component.name}>
                    <b>{component.name}</b>
                    <span>{component.note}</span>
                    {component.key && (
                      <span className="indicator-page__componentLive" title={live || undefined}>{live ?? '—'}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title={t(`${key}.historyTitle`)}>
          <p>{t(`${key}.history`)}</p>
        </Section>

        <Section title={t(`${key}.relationToSioTitle`)}>
          <p>{t(`${key}.relationToSio`)}</p>
          <p className="indicator-page__links">
            <Link to={`/${lang}/${page.ctaPath || 'market-sentiment'}`}>{t(`${key}.relationToSioCta`)}</Link>
          </p>
        </Section>

        <Section title={t('sentimentIndicatorPages.sourceTitle')}>
          <p className="indicator-page__source">{t(`${key}.source`)}</p>
        </Section>

        <p className="indicator-page__disclaimer">
          {t(page.ownIndicator ? 'sentimentIndicatorPages.disclaimerOwn' : 'sentimentIndicatorPages.disclaimer')}
        </p>
      </article>
    </PageContainer>
  );
};

// 分項的即時值。CNN 給 score（0~100）加 rating，BofA 試算表給 0~1 的百分位。
function formatComponent(live) {
  if (live === null || live === undefined) return null;
  if (Number.isFinite(Number(live?.score))) {
    const score = formatReading(live.score);
    return live.rating ? `${score} · ${live.rating}` : score;
  }
  // 0~1 的百分位照站內慣例四捨五入到整數再加 %。
  if (Number.isFinite(Number(live))) {
    return `${Math.round(Number(live) * 100)}%`;
  }
  if (Number.isFinite(Number(live?.value))) {
    const value = formatReading(live.value);
    return live.rating ? `${value} · ${live.rating}` : value;
  }
  return null;
}

// DB 存的是 float，直接印會露出 -7.299999999999997 這種浮點誤差。
// 位數判準與 board、圖表軸標籤共用（見 utils/priceUtils 的 getDecimalPlaces），
// 同一個指標在總覽頁和解說頁不該顯示成不同長度。
function formatReading(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: getDecimalPlaces(parsed) })
    : '—';
}

const Section = ({ title, children }) => (
  <section className="indicator-page__section">
    <h2 className="indicator-page__sectionTitle">{title}</h2>
    {children}
  </section>
);

export default SentimentIndicatorPage;
