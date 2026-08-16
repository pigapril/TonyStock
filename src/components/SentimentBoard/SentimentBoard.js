import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import PageContainer from '../PageContainer/PageContainer';
import { PUBLISHED_INDICATOR_PAGES } from './indicatorPages';
import './SentimentBoard.css';

const EXPLAINER_BY_ITEM_ID = Object.fromEntries(
  PUBLISHED_INDICATOR_PAGES.filter((page) => page.boardItemId).map((page) => [page.boardItemId, page.slug])
);

/**
 * 情緒指標總覽。
 *
 * 與 /market-sentiment、/tw-market-sentiment 的分工：那兩頁是 SIO 自家指標的
 * 深度（儀表、分項、歷史圖），這頁是全市場情緒指標的廣度（CNN、BofA、AAII…
 * 各家當前值並排）。廣度與深度混在一起會兩邊都做不好。
 *
 * 免費／付費界線由後端 sentimentBoard.service 決定，前端只負責把 locked 呈現好。
 */
const SentimentBoard = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    apiClient.get('/api/sentiment-board')
      .then((res) => {
        if (cancelled) return;
        setBoard(res.data?.data || null);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, []);

  const seo = {
    title: t('sentimentBoard.pageTitle'),
    description: t('sentimentBoard.pageDescription'),
    keywords: t('sentimentBoard.keywords')
  };

  if (status === 'loading') {
    return (
      <PageContainer {...seo}>
        <div className="sentiment-board sentiment-board--loading">
          <div className="sentiment-board__skeleton" aria-hidden="true" />
          <p className="sentiment-board__status">{t('sentimentBoard.loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (status === 'error' || !board) {
    return (
      <PageContainer {...seo}>
        <div className="sentiment-board">
          <p className="sentiment-board__status sentiment-board__status--error">
            {t('sentimentBoard.error')}
          </p>
        </div>
      </PageContainer>
    );
  }

  const isPro = board.userPlan === 'pro';

  return (
    <PageContainer {...seo}>
      <div className="sentiment-board">
        <header className="sentiment-board__header">
          <h1 className="sentiment-board__title">{t('sentimentBoard.heading')}</h1>
          <p className="sentiment-board__subtitle">{t('sentimentBoard.subheading')}</p>
        </header>

        <section className="sentiment-board__composite" aria-label={t('sentimentBoard.compositeLabel')}>
          <CompositeCard
            label={t('sentimentBoard.compositeUs')}
            data={board.composite.us}
            href={`/${lang}/market-sentiment`}
            t={t}
          />
          <CompositeCard
            label={t('sentimentBoard.compositeTw')}
            data={board.composite.tw}
            href={`/${lang}/tw-market-sentiment`}
            t={t}
          />
        </section>

        {board.divergences && board.divergences.length > 0 && (
          <section className="sentiment-board__divergences">
            <h2 className="sentiment-board__sectionTitle">{t('sentimentBoard.divergenceTitle')}</h2>
            <p className="sentiment-board__sectionNote">{t('sentimentBoard.divergenceNote')}</p>
            <div className="sentiment-board__divergenceGrid">
              {board.divergences.map((item) => (
                <div key={item.key} className="divergence-card">
                  <p className="divergence-card__label">{t(`sentimentBoard.divergences.${item.key}`)}</p>
                  <div className="divergence-card__sides">
                    <div className="divergence-card__side">
                      <span className="divergence-card__sideLabel">{t(`sentimentBoard.sides.${item.left.key}`)}</span>
                      <span className="divergence-card__sideValue">{formatNumber(item.left.value ?? item.left.percentile)}</span>
                    </div>
                    <div className="divergence-card__gap">
                      <span className="divergence-card__gapLabel">{t('sentimentBoard.gap')}</span>
                      <span className="divergence-card__gapValue">{formatNumber(item.gap)}</span>
                    </div>
                    <div className="divergence-card__side divergence-card__side--right">
                      <span className="divergence-card__sideLabel">{t(`sentimentBoard.sides.${item.right.key}`)}</span>
                      <span className="divergence-card__sideValue">{formatNumber(item.right.value ?? item.right.percentile)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {board.groups.map((group) => (
          <section key={group.key} className="sentiment-board__group">
            <h2 className="sentiment-board__sectionTitle">{t(`sentimentBoard.groups.${group.key}.title`)}</h2>
            {/* 說明用小字副標而非 i 圖示：副標是可被爬蟲讀到的正文，
                而且不需要 hover 或點擊，手機上尤其如此。 */}
            <p className="sentiment-board__sectionNote">{t(`sentimentBoard.groups.${group.key}.note`)}</p>
            <div className="sentiment-board__grid">
              {group.items.map((item) => (
                <IndicatorCard key={item.id} item={item} lang={lang} t={t} />
              ))}
            </div>
          </section>
        ))}

        {!isPro && (
          <aside className="sentiment-board__upsell">
            <p>{t('sentimentBoard.upsellCopy')}</p>
            <Link className="sentiment-board__upsellLink" to={`/${lang}/subscription`}>
              {t('sentimentBoard.upsellCta')}
            </Link>
          </aside>
        )}

        <p className="sentiment-board__generatedAt">
          {t('sentimentBoard.generatedAt')} {formatDateTime(board.generatedAt)}
        </p>
      </div>
    </PageContainer>
  );
};

const CompositeCard = ({ label, data, href, t }) => (
  <article className={`composite-card${data.locked ? ' composite-card--locked' : ''}`}>
    <p className="composite-card__label">{label}</p>
    <p className="composite-card__value">
      {data.locked ? <span className="composite-card__lock">{t('sentimentBoard.proOnly')}</span> : formatNumber(data.value)}
    </p>
    {data.date && <p className="composite-card__date">{data.date}</p>}
    <Link className="composite-card__link" to={href}>{t('sentimentBoard.viewDetail')}</Link>
  </article>
);

const IndicatorCard = ({ item, lang, t }) => {
  const explainerSlug = EXPLAINER_BY_ITEM_ID[item.id];
  // 後端的 label 只當保底：新增指標時翻譯還沒補上，也不會變成空白卡片。
  const name = t(`sentimentBoard.indicatorNames.${item.id}`, { defaultValue: item.label });

  return (
  <article className={`indicator-card${item.locked ? ' indicator-card--locked' : ''}`}>
    <div className="indicator-card__head">
      <h3 className="indicator-card__label">
        {explainerSlug
          ? <Link to={`/${lang}/sentiment-indicators/${explainerSlug}`}>{name}</Link>
          : name}
      </h3>
      {item.publisher && <span className="indicator-card__publisher">{item.publisher}</span>}
    </div>

    <p className="indicator-card__value">
      {item.locked
        ? <span className="indicator-card__lock">{t('sentimentBoard.proOnly')}</span>
        : (item.value === null ? <span className="indicator-card__empty">—</span> : formatNumber(item.value))}
    </p>

    {item.rating && !item.locked && <p className="indicator-card__rating">{item.rating}</p>}

    <footer className="indicator-card__foot">
      {/* 資料時間一律顯示，即使值是鎖住的 —— 讓過期是看得見的，而不是隱形的。 */}
      <span className="indicator-card__date">{item.date || t('sentimentBoard.noData')}</span>
      {item.publisherUrl && (
        <a className="indicator-card__source" href={item.publisherUrl} target="_blank" rel="noopener noreferrer">
          {t('sentimentBoard.source')}
        </a>
      )}
    </footer>
  </article>
  );
};

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
}

export default SentimentBoard;
