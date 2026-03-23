import React, { Suspense, lazy, useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChevronDown, FaLock } from 'react-icons/fa';
import { useMediaQuery } from 'react-responsive';
import './Home.css';
import { useDialog } from '../../components/Common/Dialog/useDialog';
import { useAuth } from '../../components/Auth/useAuth';
import PageContainer from '../PageContainer/PageContainer';
import { useTranslation } from 'react-i18next';
import { Badge } from '../Common/Badge/Badge';
import { Button } from '../Common/Button/Button';
import homepageService from '../../services/homepageService';
import MarketSentimentGauge from '../MarketSentimentIndex/MarketSentimentGauge';
import { formatPrice } from '../../utils/priceUtils';
import { useDeferredFeature } from '../../hooks/useDeferredFeature';

const HomePricePreviewChart = lazy(() => import('./HomePricePreviewChart').then((module) => ({ default: module.HomePricePreviewChart })));
const SharedSentimentHistoryChart = lazy(() => import('../MarketSentimentIndex/SharedSentimentHistoryChart').then((module) => ({ default: module.SharedSentimentHistoryChart })));

const BUTTON_LINK_CLASS = (variant) => [
  'ui-button',
  `ui-button--${variant}`,
  'ui-button--large',
  'home-link-button'
].join(' ');

const HISTORY_PREVIEW_START_YEAR = 2017;
const HISTORY_PREVIEW_END_YEAR = 2023;
const HISTORY_PREVIEW_MOBILE_START_YEAR = 2018;
const HISTORY_PREVIEW_MOBILE_END_YEAR = 2022;

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
      <span className={index > 0 ? 'home-hero__titleSegment home-hero__titleSegment--noBreak' : 'home-hero__titleSegment'}>
        {segment}
      </span>
    </React.Fragment>
  ));
}

function renderPriceStoryTitle(title, isChinese) {
  const normalizedTitle = String(title);
  const secondLine = '分析極端情緒位階';

  if (!isChinese || !normalizedTitle.includes(secondLine)) {
    return title;
  }

  const firstLine = normalizedTitle.replace(secondLine, '');

  return (
    <>
      <span>{firstLine}</span>
      <br />
      <span className="home-storyBlock__titleSegment home-storyBlock__titleSegment--noBreak">{secondLine}</span>
    </>
  );
}

function mergeHomepageData(currentData, nextData) {
  return {
    ...(currentData || {}),
    ...nextData,
    announcement: nextData?.announcement
      ? {
          ...(currentData?.announcement || {}),
          ...nextData.announcement
        }
      : currentData?.announcement,
    sentiment: nextData?.sentiment
      ? {
          ...(currentData?.sentiment || {}),
          ...nextData.sentiment
        }
      : currentData?.sentiment,
    pricePreview: nextData?.pricePreview
      ? {
          ...(currentData?.pricePreview || {}),
          ...nextData.pricePreview
        }
      : currentData?.pricePreview
  };
}

function HomeSkeletonLine({ className = '' }) {
  return <div className={`home-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export const Home = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const locale = currentLang === 'zh' ? 'zh-TW' : currentLang;
  const heroGaugeHeadline = (
    <>
      <span className="home-marketPreviewShell__headlineLine">{t('home.hero.marketPreviewHeadline.brand')}</span>
      <span className="home-marketPreviewShell__headlineLine">{t('home.hero.marketPreviewHeadline.index')}</span>
    </>
  );
  const isMobileHistoryPreview = useMediaQuery({ query: '(max-width: 768px)' });
  const { openDialog } = useDialog();
  const { isAuthenticated } = useAuth();
  const [homepageData, setHomepageData] = useState(null);
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [isNarrativeLoading, setIsNarrativeLoading] = useState(true);
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [activeExtremeIndex, setActiveExtremeIndex] = useState(0);
  const [, startTransition] = useTransition();
  const shouldLoadSecondaryContent = useDeferredFeature({ timeoutMs: 1600, useIdleCallback: true, triggerOnInteraction: true });
  const shouldLoadPreviewCharts = useDeferredFeature({ timeoutMs: 2400, useIdleCallback: true, triggerOnInteraction: true });

  useEffect(() => {
    let isMounted = true;

    const loadHeroData = async () => {
      const data = await homepageService.getHomepageHeroData();

      if (!isMounted) {
        return;
      }

      startTransition(() => {
        setHomepageData((currentData) => mergeHomepageData(currentData, data));
        setIsHeroLoading(false);
      });
    };

    loadHeroData();

    return () => {
      isMounted = false;
    };
  }, [startTransition]);

  useEffect(() => {
    if (isHeroLoading || !shouldLoadSecondaryContent) {
      return undefined;
    }

    let isMounted = true;

    const loadNarrativeData = async () => {
      const data = await homepageService.getHomepageNarrativeData();

      if (!isMounted) {
        return;
      }

      startTransition(() => {
        setHomepageData((currentData) => mergeHomepageData(currentData, data));
        setIsNarrativeLoading(false);
      });
    };

    const loadPriceData = async () => {
      const data = await homepageService.getHomepagePriceData();

      if (!isMounted) {
        return;
      }

      startTransition(() => {
        setHomepageData((currentData) => mergeHomepageData(currentData, data));
        setIsPriceLoading(false);
      });
    };

    loadNarrativeData();
    loadPriceData();

    return () => {
      isMounted = false;
    };
  }, [isHeroLoading, shouldLoadSecondaryContent, startTransition]);

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
  const historyPreviewYearRange = useMemo(() => (
    isMobileHistoryPreview
      ? {
          start: HISTORY_PREVIEW_MOBILE_START_YEAR,
          end: HISTORY_PREVIEW_MOBILE_END_YEAR
        }
      : {
          start: HISTORY_PREVIEW_START_YEAR,
          end: HISTORY_PREVIEW_END_YEAR
        }
  ), [isMobileHistoryPreview]);
  const historyPreviewMilestones = useMemo(() => {
    const preferredIds = ['tradeWarSelloff', 'pandemicPanic', 'liquidityPeak', 'inflationBearLow', 'aiRally'];

    return preferredIds.map((eventId) => {
      const moment = featuredMoments.find((item) => item.eventId === eventId);

      if (!moment?.date || moment?.score === null || moment?.score === undefined) {
        return null;
      }

      const date = new Date(moment.date);
      const year = date.getUTCFullYear();

      if (Number.isNaN(date.getTime()) || year < historyPreviewYearRange.start || year > historyPreviewYearRange.end) {
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
  }, [featuredMoments, historyPreviewYearRange, t]);
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

      if (date.getUTCFullYear() < historyPreviewYearRange.start || date.getUTCFullYear() > historyPreviewYearRange.end) {
        return;
      }

      mergedPoints.set(date.toISOString(), {
        date,
        score,
        spyClose
      });
    });

    return Array.from(mergedPoints.values())
      .filter((item) => {
        const year = item.date.getUTCFullYear();
        return year >= historyPreviewYearRange.start && year <= historyPreviewYearRange.end;
      })
      .sort((left, right) => left.date - right.date);
  }, [featuredMoments, historyPreviewYearRange, sentimentData.historyPreview]);
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

  const narrativeLoadingState = (
    <div className="home-historyPreview home-historyPreview--loading" aria-busy="true" aria-live="polite">
      <div className="home-historyPreview__header">
        <HomeSkeletonLine className="home-historyPreview__loadingTitle" />
      </div>
      <HomeSkeletonLine className="home-historyPreview__loadingBody" />
      <div className="home-historyPreview__chartShell home-historyPreview__chartShell--loading">
        <div className="home-historyPreview__loadingChart" />
      </div>
    </div>
  );

  const priceLoadingState = (
    <div className="home-pricePreview home-pricePreview--loading" aria-busy="true" aria-live="polite">
      <div className="home-pricePreview__header">
        <HomeSkeletonLine className="home-pricePreview__loadingTitle" />
      </div>
      <HomeSkeletonLine className="home-pricePreview__loadingBody" />
      <div className="home-pricePreview__stats">
        <div>
          <HomeSkeletonLine className="home-pricePreview__loadingStatLabel" />
          <HomeSkeletonLine className="home-pricePreview__loadingStatValue" />
        </div>
        <div>
          <HomeSkeletonLine className="home-pricePreview__loadingStatLabel" />
          <HomeSkeletonLine className="home-pricePreview__loadingStatValue" />
        </div>
        <div>
          <HomeSkeletonLine className="home-pricePreview__loadingStatLabel" />
          <HomeSkeletonLine className="home-pricePreview__loadingStatValue" />
        </div>
      </div>
      <div className="home-pricePreview__chartShell home-pricePreview__chartShell--loading">
        <div className="home-pricePreview__loadingChart" />
      </div>
    </div>
  );

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
            <>
              <div className="home-hero__content">
                <h1>{renderTitleWithBreaks(t('home.hero.title'))}</h1>
                <p className="home-hero__subtitle">{t('home.hero.subtitle')}</p>
              </div>

              <div className="home-hero__visual">
                {isHeroLoading ? (
                  <div className="home-marketPreviewShell home-marketPreviewShell--loading ui-surface-card" aria-hidden="true">
                    <div className="home-hero__loadingGauge" />
                    <div className="home-hero__loadingGaugeFoot">
                      <HomeSkeletonLine className="home-hero__loadingBadge" />
                      <HomeSkeletonLine className="home-hero__loadingBadge home-hero__loadingBadge--short" />
                    </div>
                  </div>
                ) : (
                  <div className="home-marketPreviewShell">
                    <MarketSentimentGauge
                      className="home-marketPreviewShell__gauge"
                      sentimentData={heroGaugeData}
                      isDataLoaded={!isHeroLoading}
                      showAnalysisResult={false}
                      showLastUpdate={false}
                      headlineText={heroGaugeHeadline}
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
                )}
              </div>

              <div className="home-hero__actions">
                {isAuthenticated ? (
                  <Link
                    to={`/${currentLang}/market-sentiment`}
                    className={`${BUTTON_LINK_CLASS('primary')} home-hero__action home-hero__action--primary`}
                  >
                    <span>{t('home.hero.primaryAuthenticated')}</span>
                    <FaArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  <Button
                    size="large"
                    onClick={handlePrimaryAction}
                    className="home-hero__authButton home-hero__action home-hero__action--primary"
                  >
                    <span>{t('home.hero.primaryGuest')}</span>
                    <FaLock aria-hidden="true" />
                  </Button>
                )}

                <Link
                  to={`/${currentLang}/priceanalysis?stockCode=SPY&years=3.5`}
                  className={`${BUTTON_LINK_CLASS('outline')} home-hero__action home-hero__action--secondary`}
                >
                  <span>{t('home.hero.secondary')}</span>
                  <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            </>
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

        {!isNarrativeLoading && homepageData?.announcement?.enabled && announcementMessage && (
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
                {isNarrativeLoading ? (
                  narrativeLoadingState
                ) : (
                  <div className="home-historyPreview">
                    <div className="home-historyPreview__header">
                      <div>
                        <h3>{t('home.methodology.historyPreview.title')}</h3>
                      </div>
                    </div>
                    <p className="home-historyPreview__body">{t('home.methodology.historyPreview.description')}</p>

                    {historyPreview.length > 1 ? (
                      <div className="home-historyPreview__chartShell">
                        {shouldLoadPreviewCharts ? (
                          <Suspense fallback={<div className="home-historyPreview__loadingChart" aria-hidden="true" />}>
                            <SharedSentimentHistoryChart
                              className="home-historyPreview__chart"
                              historicalData={historyPreview}
                              lowPoints={historyChartLowPoints}
                              showLegend={true}
                              compact={true}
                            />
                          </Suspense>
                        ) : (
                          <div className="home-historyPreview__loadingChart" aria-hidden="true" />
                        )}
                      </div>
                    ) : (
                      <p className="home-historyPreview__empty">{t('home.methodology.historyPreview.empty')}</p>
                    )}

                  </div>
                )}
              </div>
            </article>

            <article className="home-storyBlock home-storyBlock--price home-reveal">
              <div className="home-storyMedia home-storyMedia--price ui-surface-card">
                {isPriceLoading ? (
                  priceLoadingState
                ) : (
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
                        <strong>{pricePreview.currentPrice === null || pricePreview.currentPrice === undefined ? '--' : `$${formatPrice(pricePreview.currentPrice)}`}</strong>
                      </div>
                      <div>
                        <span>{t('home.methodology.pricePreview.currentSentiment')}</span>
                        <strong className={`sentiment-${getSentimentSuffix(pricePreview.sentimentKey)}`}>{pricePreviewSentimentLabel}</strong>
                      </div>
                    </div>
                    {pricePreviewSeries.length > 1 ? (
                      <div className="home-pricePreview__chartShell">
                        {shouldLoadPreviewCharts ? (
                          <Suspense fallback={<div className="home-pricePreview__loadingChart" aria-hidden="true" />}>
                            <HomePricePreviewChart className="home-pricePreview__chart" series={pricePreviewSeries} />
                          </Suspense>
                        ) : (
                          <div className="home-pricePreview__loadingChart" aria-hidden="true" />
                        )}
                      </div>
                    ) : (
                      <p className="home-pricePreview__empty">{t('home.methodology.pricePreview.empty')}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="home-storyBlock__content">
                <h3>{renderPriceStoryTitle(t('home.story.blocks.price.title'), currentLang.startsWith('zh'))}</h3>
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

      </div>
    </PageContainer>
  );
};
