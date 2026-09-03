import React, { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import PageContainer from '../PageContainer/PageContainer';
import { getDecimalPlaces } from '../../utils/priceUtils';
import { findIndicatorPage } from './indicatorPages';
import './SentimentIndicatorPage.css';

/**
 * 單一指標的常青解說頁。
 *
 * 解說內容（什麼是、怎麼解讀、歷史區間、與 SIO 的關係）寫死在 i18n，長期不變；
 * 當前值向 API 取，所以這頁同時是解說也是即時查詢。
 * 取不到資料時只是少一張卡，解說照常顯示：常青內容不該依賴 API。
 *
 * 各段標題刻意帶指標全名（含中文名），讓 h2 本身就是搜尋得到的問句。
 */
const SentimentIndicatorPage = () => {
  const { t } = useTranslation();
  const { lang, slug } = useParams();
  const page = findIndicatorPage(slug);
  const [reading, setReading] = useState(null);

  useEffect(() => {
    if (!page) return undefined;
    let cancelled = false;

    if (page.boardItemId) {
      apiClient.get('/api/sentiment-board')
        .then((res) => {
          if (cancelled) return;
          const items = (res.data?.data?.groups || []).flatMap((group) => group.items);
          setReading(items.find((item) => item.id === page.boardItemId) || null);
        })
        .catch(() => { /* 解說內容不依賴 API */ });
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
        </header>

        {reading && reading.value !== null && (
          <section className="indicator-page__current">
            <p className="indicator-page__currentLabel">{t('sentimentIndicatorPages.currentReading')}</p>
            <p className="indicator-page__currentValue">{formatReading(reading.value)}</p>
            <p className="indicator-page__currentMeta">
              {reading.date}
              {reading.publisher ? ` · ${reading.publisher}` : ''}
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

        {Array.isArray(components) && components.length > 0 && (
          <Section title={t(`${key}.componentsTitle`)}>
            <p>{t(`${key}.componentsIntro`)}</p>
            <ul className="indicator-page__components">
              {components.map((component) => {
                // 有即時值就一起顯示。CNN 給的是標準化分數加級距，
                // BofA 那份試算表給的是 0~1 的百分位，所以兩種都要能呈現。
                const live = component.key && reading?.components?.[component.key];
                return (
                  <li key={component.key || component.name}>
                    <b>{component.name}</b>
                    <span>{component.note}</span>
                    {live && <span className="indicator-page__componentLive">{formatComponent(live)}</span>}
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
