import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChevronDown, FaLock } from 'react-icons/fa';
import './Home.css';
import { useDialog } from '../../components/Common/Dialog/useDialog';
import { useAuth } from '../../components/Auth/useAuth';
import PageContainer from '../PageContainer/PageContainer';
import { useTranslation } from 'react-i18next';
import { Badge } from '../Common/Badge/Badge';
import { Button } from '../Common/Button/Button';
import homepageService from '../../services/homepageService';
import { HomePricePreviewChart } from './HomePricePreviewChart';
import MarketSentimentGauge from '../MarketSentimentIndex/MarketSentimentGauge';
import { SharedSentimentHistoryChart } from '../MarketSentimentIndex/SharedSentimentHistoryChart';

const BUTTON_LINK_CLASS = (variant) => [
  'ui-button',
  `ui-button--${variant}`,
  'ui-button--large',
  'home-link-button'
].join(' ');

const HISTORY_PREVIEW_START_YEAR = 2017;
const HISTORY_PREVIEW_END_YEAR = 2023;

const HERO_GAUGE_HEADLINE = (
  <>
    <span className="home-marketPreviewShell__headlineLine">Sentiment Inside Out</span>
    <span className="home-marketPreviewShell__headlineLine">恐懼貪婪指標</span>
  </>
);

const WATCHLIST_MOCK_ITEMS = [
  { symbol: 'SPY', nameKey: 'spy', tone: 'neutral' },
  { symbol: 'QQQ', nameKey: 'qqq', tone: 'greed' },
  { symbol: 'VOO', nameKey: 'voo', tone: 'fear' },
  { symbol: 'AAPL', nameKey: 'aapl', tone: 'extremeGreed' },
  { symbol: 'NVDA', nameKey: 'nvda', tone: 'neutral' },
  { symbol: 'MSFT', nameKey: 'msft', tone: 'extremeFear' }
];

function getSentimentSuffix(key) {
  if (!key) {
    return 'neutral';
  }

  const segments = key.split('.');
  return segments[segments.length - 1];
}

function formatDate(value, locale) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatCurrency(value, locale, currency = 'TWD') {
  if (value === null || value === undefined) {
    return '--';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPriceValue(value, locale, currency = 'USD') {
  if (value === null || value === undefined) {
    return '--';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatHeroMomentDate(value, locale) {
  if (!value) {
    return { monthDay: 'N/A', year: '' };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { monthDay: 'N/A', year: '' };
  }

  if (locale === 'zh-TW') {
    return {
      monthDay: `${date.getMonth() + 1}月${date.getDate()}日`,
      year: String(date.getFullYear())
    };
  }

  const parts = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).formatToParts(date);

  return {
    monthDay: [
      parts.find(({ type }) => type === 'month')?.value || '',
      parts.find(({ type }) => type === 'day')?.value || ''
    ].filter(Boolean).join(' '),
    year: parts.find(({ type }) => type === 'year')?.value || ''
  };
}

function renderTitleWithBreaks(title) {
  const segments = String(title).split('｜').filter(Boolean);

  if (segments.length <= 1) {
    return title;
  }

  return segments.map((segment, index) => (
    <React.Fragment key={`${segment}-${index}`}>
      {index > 0 ? <br /> : null}
      {segment}
    </React.Fragment>
  ));
}

export const Home = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const locale = currentLang === 'zh' ? 'zh-TW' : currentLang;
  const { openDialog } = useDialog();
  const { isAuthenticated } = useAuth();
  const [homepageData, setHomepageData] = useState(() => homepageService.getFallbackData());
  const [isLoading, setIsLoading] = useState(true);
  const [activeExtremeIndex, setActiveExtremeIndex] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    const loadHomepageData = async () => {
      const data = await homepageService.getHomepageData();

      if (!isMounted) {
        return;
      }

      startTransition(() => {
        setHomepageData(data);
        setIsLoading(false);
      });
    };

    loadHomepageData();

    return () => {
      isMounted = false;
    };
  }, [startTransition]);

  useEffect(() => {
    const revealNodes = document.querySelectorAll('.home-reveal');

    if (revealNodes.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -8% 0px'
    });

    revealNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!homepageData?.sentiment?.featuredMoments?.length || homepageData.sentiment.featuredMoments.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveExtremeIndex((currentIndex) => (
        (currentIndex + 1) % homepageData.sentiment.featuredMoments.length
      ));
    }, 6800);

    return () => window.clearInterval(intervalId);
  }, [homepageData]);

  const homeJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('home.jsonLd.name'),
    description: t('home.jsonLd.description'),
    url: `${window.location.origin}/${currentLang}`,
    inLanguage: currentLang
  }), [t, currentLang]);

  const sentimentData = homepageData?.sentiment || {};
  const pricingData = homepageData?.pricing || {};
  const freeExperience = homepageData?.freeExperience || {};
  const pricePreview = homepageData?.pricePreview || {};
  const featuredMoments = sentimentData.featuredMoments || [];
  const activeHeroMoment = featuredMoments[activeExtremeIndex] || null;
  const activeHeroDate = activeHeroMoment?.date || sentimentData.restrictionCutoffDate || sentimentData.lastUpdated || null;
  const activeHeroDateParts = formatHeroMomentDate(activeHeroDate, locale);
  const activeHeroMomentTitle = activeHeroMoment
    ? t(`home.hero.moments.events.${activeHeroMoment.eventId}.title`, {
        defaultValue: activeHeroMoment.title || ''
      })
    : '';
  const activeHeroMomentDescription = activeHeroMoment
    ? t(`home.hero.moments.events.${activeHeroMoment.eventId}.description`, {
        defaultValue: activeHeroMoment.description || ''
      })
    : '';
  const heroGaugeData = {
    totalScore: activeHeroMoment?.score === null || activeHeroMoment?.score === undefined
      ? (sentimentData.score === null || sentimentData.score === undefined ? 0 : Number(sentimentData.score))
      : Number(activeHeroMoment.score),
    compositeScoreLastUpdate: activeHeroDate
  };
  const announcementMessage = currentLang.startsWith('zh')
    ? homepageData?.announcement?.message_zh || homepageData?.announcement?.message
    : homepageData?.announcement?.message_en || homepageData?.announcement?.message;
  const pricePreviewSeries = useMemo(() => (
    (pricePreview.series || [])
      .map((item) => ({
        date: item.date,
        price: Number(item.price),
        trendLine: Number(item.trendLine),
        tlMinus2Sd: Number(item.tlMinus2Sd),
        tlMinusSd: Number(item.tlMinusSd),
        tlPlusSd: Number(item.tlPlusSd),
        tlPlus2Sd: Number(item.tlPlus2Sd)
      }))
      .filter((item) => Number.isFinite(new Date(item.date).getTime()) && Number.isFinite(item.price))
  ), [pricePreview.series]);
  const pricePreviewUpdatedLabel = formatDate(pricePreview.lastUpdated, locale);
  const pricePreviewSentimentLabel = t(pricePreview.sentimentKey || 'priceAnalysis.sentiment.neutral');
  const historyPreviewMilestones = useMemo(() => {
    const preferredIds = ['tradeWarSelloff', 'pandemicPanic', 'liquidityPeak', 'inflationBearLow', 'aiRally'];

    return preferredIds.map((eventId) => {
      const moment = featuredMoments.find((item) => item.eventId === eventId);

      if (!moment?.date || moment?.score === null || moment?.score === undefined) {
        return null;
      }

      const date = new Date(moment.date);
      const year = date.getUTCFullYear();

      if (Number.isNaN(date.getTime()) || year < HISTORY_PREVIEW_START_YEAR || year > HISTORY_PREVIEW_END_YEAR) {
        return null;
      }

      return {
        ...moment,
        date,
        year,
        score: Math.round(Number(moment.score)),
        title: t(`home.hero.moments.events.${moment.eventId}.title`, {
          defaultValue: moment.title || ''
        }),
        sentimentLabel: t(moment.sentimentKey || 'sentiment.notAvailable')
      };
    }).filter(Boolean);
  }, [featuredMoments, t]);
  const historyPreview = useMemo(() => {
    const mergedPoints = new Map();

    (sentimentData.historyPreview || []).forEach((item) => {
      const date = new Date(item.date);
      const score = Number(item.score);
      const spyClose = Number(item.spyClose);

      if (Number.isNaN(date.getTime()) || !Number.isFinite(score) || !Number.isFinite(spyClose)) {
        return;
      }

      mergedPoints.set(date.toISOString(), {
        date,
        score,
        spyClose
      });
    });

    featuredMoments.forEach((item) => {
      const date = new Date(item.date);
      const score = Number(item.score);
      const spyClose = Number(item.spyClose);

      if (Number.isNaN(date.getTime()) || !Number.isFinite(score) || !Number.isFinite(spyClose)) {
        return;
      }

      if (date.getUTCFullYear() < HISTORY_PREVIEW_START_YEAR || date.getUTCFullYear() > HISTORY_PREVIEW_END_YEAR) {
        return;
      }

      mergedPoints.set(date.toISOString(), {
        date,
        score,
        spyClose
      });
    });

    return Array.from(mergedPoints.values()).sort((left, right) => left.date - right.date);
  }, [featuredMoments, sentimentData.historyPreview]);
  const historyChartLowPoints = useMemo(() => (
    historyPreviewMilestones
      .filter((item) => item.score <= 20)
      .map((item) => ({
        date: item.date,
        score: item.score,
        meta: `${item.year} ${item.title}`
      }))
  ), [historyPreviewMilestones]);
  const handlePrimaryAction = () => {
    openDialog('auth', {
      returnPath: `/${currentLang}/market-sentiment`
    });
  };

  return (
    <PageContainer
      title={t('home.pageTitle')}
      description={t('home.pageDescription')}
      keywords={t('home.keywords')}
      ogImage="/home-og-image.png"
      ogUrl={`${window.location.origin}/${currentLang}`}
      jsonLd={homeJsonLd}
    >
      <div className="home-page">
        <section className="home-hero">
          <div className="home-hero__backdrop" aria-hidden="true" />
          <div className="ui-page-shell home-hero__inner">
            <div className="home-hero__content">
              <h1>{renderTitleWithBreaks(t('home.hero.title'))}</h1>
              <p className="home-hero__subtitle">{t('home.hero.subtitle')}</p>

              <div className="home-hero__actions">
                {isAuthenticated ? (
                  <Link
                    to={`/${currentLang}/market-sentiment`}
                    className={BUTTON_LINK_CLASS('primary')}
                  >
                    <span>{t('home.hero.primaryAuthenticated')}</span>
                    <FaArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  <Button
                    size="large"
                    onClick={handlePrimaryAction}
                    className="home-hero__authButton"
                  >
                    <span>{t('home.hero.primaryGuest')}</span>
                    <FaLock aria-hidden="true" />
                  </Button>
                )}

                <Link
                  to={`/${currentLang}/priceanalysis?stockCode=SPY&years=3.5`}
                  className={BUTTON_LINK_CLASS('outline')}
                >
                  <span>{t('home.hero.secondary')}</span>
                  <FaArrowRight aria-hidden="true" />
                </Link>
              </div>

            </div>

            <div className="home-hero__visual">
              <div className="home-marketPreviewShell">
                <MarketSentimentGauge
                  className="home-marketPreviewShell__gauge"
                  sentimentData={heroGaugeData}
                  isDataLoaded={!isLoading}
                  showAnalysisResult={false}
                  showLastUpdate={false}
                  headlineText={HERO_GAUGE_HEADLINE}
                  frameFooterContent={activeHeroMoment ? (
                    <div className="home-marketMomentPanel">
                      <div
                        key={activeHeroMoment?.eventId || String(activeHeroDate || 'fallback')}
                        className="home-marketMomentPanel__content"
                      >
                        <div className="home-marketMomentPanel__dateBlock">
                          <span className="home-marketMomentPanel__date">
                            <span className="home-marketMomentPanel__dateSegment home-marketMomentPanel__dateSegment--year">
                              {activeHeroDateParts.year || '----'}
                            </span>
                            <span className="home-marketMomentPanel__dateDivider" aria-hidden="true" />
                            <span className="home-marketMomentPanel__dateSegment home-marketMomentPanel__dateSegment--day">
                              {activeHeroDateParts.monthDay}
                            </span>
                          </span>
                        </div>
                        <div className="home-marketMomentPanel__body">
                          <div className="home-marketMomentPanel__copy">
                            <strong className="home-marketMomentPanel__title">
                              {activeHeroMomentTitle}
                            </strong>
                            <p className="home-marketMomentPanel__description">
                              {activeHeroMomentDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="home-scrollCue"
            onClick={() => {
              document.querySelector('#home-methodology')?.scrollIntoView({
                behavior: 'smooth'
              });
            }}
            aria-label={t('home.hero.scrollLabel')}
          >
            <FaChevronDown aria-hidden="true" />
          </button>
        </section>

        {homepageData?.announcement?.enabled && announcementMessage && (
          <section className="home-announcement">
            <div className="ui-page-shell">
              <div className="ui-callout ui-callout--brand home-announcement__card">
                <Badge variant="warning" label={t('home.announcement.badge')} />
                <p>{announcementMessage}</p>
              </div>
            </div>
          </section>
        )}

        <section id="home-methodology" className="ui-section home-narrative">
          <div className="ui-page-shell">
            <article className="home-storyBlock home-storyBlock--sentiment home-reveal">
              <div className="home-storyBlock__content">
                <h3>{t('home.story.blocks.sentiment.title')}</h3>
                <p>{t('home.story.blocks.sentiment.description')}</p>
                <Link to={`/${currentLang}/market-sentiment`} className="home-toolCard__link">
                  {t('home.story.blocks.sentiment.cta')} <FaArrowRight aria-hidden="true" />
                </Link>
              </div>

              <div className="home-storyMedia home-storyMedia--sentiment ui-surface-card ui-surface-card--glass">
                <div className="home-historyPreview">
                  <div className="home-historyPreview__header">
                    <div>
                      <h3>{t('home.methodology.historyPreview.title')}</h3>
                    </div>
                  </div>
                  <p className="home-historyPreview__body">{t('home.methodology.historyPreview.description')}</p>

                  {historyPreview.length > 1 ? (
                    <div className="home-historyPreview__chartShell">
                      <SharedSentimentHistoryChart
                        className="home-historyPreview__chart"
                        historicalData={historyPreview}
                        lowPoints={historyChartLowPoints}
                        showLegend={true}
                        compact={true}
                      />
                    </div>
                  ) : (
                    <p className="home-historyPreview__empty">{t('home.methodology.historyPreview.empty')}</p>
                  )}

                </div>
              </div>
            </article>

            <article className="home-storyBlock home-storyBlock--price home-reveal">
              <div className="home-storyMedia home-storyMedia--price ui-surface-card">
                <div className="home-pricePreview">
                  <div className="home-pricePreview__header">
                    <div>
                      <h3>{t('home.methodology.pricePreview.title')}</h3>
                    </div>
                  </div>
                  <p className="home-pricePreview__body">{t('home.methodology.pricePreview.description')}</p>
                  <div className="home-pricePreview__stats">
                    <div>
                      <span>{t('home.methodology.pricePreview.symbol')}</span>
                      <strong>{pricePreview.stockCode || 'SPY'}</strong>
                    </div>
                    <div>
                      <span>{t('home.methodology.pricePreview.currentPrice')}</span>
                      <strong>{formatPriceValue(pricePreview.currentPrice, locale, 'USD')}</strong>
                    </div>
                    <div>
                      <span>{t('home.methodology.pricePreview.currentSentiment')}</span>
                      <strong className={`sentiment-${getSentimentSuffix(pricePreview.sentimentKey)}`}>{pricePreviewSentimentLabel}</strong>
                    </div>
                  </div>
                  {pricePreviewSeries.length > 1 ? (
                    <div className="home-pricePreview__chartShell">
                      <HomePricePreviewChart className="home-pricePreview__chart" series={pricePreviewSeries} />
                    </div>
                  ) : (
                    <p className="home-pricePreview__empty">{t('home.methodology.pricePreview.empty')}</p>
                  )}
                </div>
              </div>

              <div className="home-storyBlock__content">
                <h3>{t('home.story.blocks.price.title')}</h3>
                <p>{t('home.story.blocks.price.description')}</p>
                <Link to={`/${currentLang}/priceanalysis`} className="home-toolCard__link">
                  {t('home.story.blocks.price.cta')} <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>

            <article className="home-storyBlock home-storyBlock--watchlist home-reveal">
              <div className="home-storyBlock__content">
                <h3>{t('home.story.blocks.watchlist.title')}</h3>
                <p>{t('home.story.blocks.watchlist.description')}</p>
                <Link to={`/${currentLang}/watchlist`} className="home-toolCard__link">
                  {t('home.story.blocks.watchlist.cta')} <FaArrowRight aria-hidden="true" />
                </Link>
              </div>

              <div className="home-storyMedia home-storyMedia--watchlist ui-surface-card">
                <div className="home-storyMedia__watchlistStack">
                  {WATCHLIST_MOCK_ITEMS.map((item, index) => (
                    <div key={item.symbol} className={`home-storyMedia__watchRow home-storyMedia__watchRow--${index % 3}`}>
                      <div className="home-storyMedia__watchIdentity">
                        <strong>{item.symbol}</strong>
                        <span>{t(`home.story.blocks.watchlist.items.${item.nameKey}`)}</span>
                      </div>
                      <span className={`home-storyMedia__watchTag sentiment-${item.tone}`}>
                        {t(`home.story.blocks.watchlist.tags.${item.tone}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="ui-section home-entry home-reveal">
          <div className="ui-page-shell">
            <div className="ui-section-intro">
              <span className="ui-section-eyebrow">{t('home.entry.eyebrow')}</span>
              <h2 className="ui-section-title">{t('home.entry.title')}</h2>
              <p className="ui-section-description">{t('home.entry.description')}</p>
            </div>

            <div className="home-entry__grid">
              <div className="ui-callout ui-callout--brand home-entry__pricing">
                <Badge variant="premium" label={t('home.entry.pricing.badge')} />
                <h2>{t('home.entry.pricing.title')}</h2>
                <p>{t('home.entry.pricing.description')}</p>
                <div className="home-entry__prices">
                  <div>
                    <span>{t('home.entry.pricing.monthly')}</span>
                    <strong>{formatCurrency(pricingData?.pro?.monthly, locale, pricingData?.currency)}</strong>
                  </div>
                  <div>
                    <span>{t('home.entry.pricing.yearly')}</span>
                    <strong>{formatCurrency(pricingData?.pro?.yearly, locale, pricingData?.currency)}</strong>
                  </div>
                </div>
                <Link to={`/${currentLang}/subscription-plans`} className={BUTTON_LINK_CLASS('primary')}>
                  <span>{t('home.entry.pricing.cta')}</span>
                  <FaArrowRight aria-hidden="true" />
                </Link>
              </div>

              <div className="ui-data-panel home-entry__tickers">
                <span className="home-entry__kicker">{t('home.entry.tickers.kicker')}</span>
                <h2>{t('home.entry.tickers.title')}</h2>
                <p>{t('home.entry.tickers.description')}</p>
                <div className="home-entry__tickerGrid">
                  {(freeExperience.tickers || []).map((ticker) => (
                    <Link
                      key={ticker}
                      to={`/${currentLang}/priceanalysis?stockCode=${ticker}&years=3.5`}
                      className="home-entry__ticker"
                    >
                      {ticker}
                    </Link>
                  ))}
                </div>
                <Link to={`/${currentLang}/priceanalysis`} className="home-toolCard__link">
                  {t('home.entry.tickers.cta')} <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
};
