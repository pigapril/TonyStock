import React from 'react';
import { useTranslation } from 'react-i18next';
import MarketSentimentGauge from '../MarketSentimentIndex/MarketSentimentGauge';
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


// Every supported event contributes to the same grid cell. Hidden events keep
// their natural height, so loading, short copy and carousel changes cannot
// move the actions underneath the gauge. No fixed text height or clipping.
export default function HomeHeroPreview({ isLoading, sentimentData, activeMoment }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const locale = lang === 'zh' ? 'zh-TW' : lang;
  const translatedEvents = t('home.hero.moments.events', { returnObjects: true });
  const events = typeof translatedEvents === 'object' && translatedEvents !== null
    ? { ...translatedEvents } : {};
  (sentimentData.featuredMoments || []).forEach(moment => {
    events[moment.eventId] = {
      title: t(`home.hero.moments.events.${moment.eventId}.title`, { defaultValue: moment.title || '' }),
      description: t(`home.hero.moments.events.${moment.eventId}.description`, { defaultValue: moment.description || '' })
    };
  });
  const date = activeMoment?.date || sentimentData.restrictionCutoffDate || sentimentData.lastUpdated;
  const dateParts = formatHeroMomentDate(date, locale);
  const headline = <div className="home-marketPreviewShell__headlineContent">
    <div className="home-marketPreviewShell__headlineTitle">
      <span className="home-marketPreviewShell__headlineLine">{t('home.hero.marketPreviewHeadline.brand')}</span>
      <span className="home-marketPreviewShell__headlineLine">{t('home.hero.marketPreviewHeadline.index')}</span>
    </div>
    <div className="home-marketPreviewShell__headlineMeta" aria-hidden={!activeMoment}
      style={{ visibility: activeMoment ? 'visible' : 'hidden' }}>
      <span className="home-marketPreviewShell__headlineEyebrow">
        {lang.startsWith('zh') ? '歷史上的極端情緒' : 'Historic extreme sentiment'}
      </span>
      <span className="home-marketPreviewShell__headlineDate">
        <span className="home-marketMomentPanel__dateSegment home-marketMomentPanel__dateSegment--year">{dateParts.year || '----'}</span>
        <span className="home-marketMomentPanel__dateDivider" aria-hidden="true" />
        <span className="home-marketMomentPanel__dateSegment home-marketMomentPanel__dateSegment--day">{dateParts.monthDay}</span>
      </span>
    </div>
  </div>;
  const footer = <div className="home-marketMomentPanel home-marketMomentPanel--stable">
    {Object.entries(events).map(([eventId, copy]) => {
      const active = !isLoading && activeMoment?.eventId === eventId;
      return <div key={eventId} className="home-marketMomentPanel__reservedEvent" aria-hidden={!active}
        style={{ visibility: active ? 'visible' : 'hidden' }}>
        <div className="home-marketMomentPanel__content">
          <div className="home-marketMomentPanel__body">
            <div className="home-marketMomentPanel__copy">
              <strong className="home-marketMomentPanel__title">{copy.title}</strong>
              <p className="home-marketMomentPanel__description">{copy.description}</p>
            </div>
          </div>
        </div>
      </div>;
    })}
  </div>;
  return <div className={`home-marketPreviewShell home-marketPreviewShell--stable${isLoading ? ' home-marketPreviewShell--pending' : ''}`}
    aria-busy={isLoading}>
    <div className="home-marketPreviewShell__content" aria-hidden={isLoading}
      style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
      <MarketSentimentGauge className="home-marketPreviewShell__gauge"
        sentimentData={{ totalScore: Number(activeMoment?.score ?? sentimentData.score ?? 0), compositeScoreLastUpdate: date }}
        isDataLoaded={!isLoading} showAnalysisResult={false} showLastUpdate={false}
        headlineText={headline} frameFooterContent={footer} />
    </div>
    {isLoading && <div className="home-marketPreviewShell__skeleton" aria-hidden="true">
      <div className="home-hero__loadingGauge" />
      <div className="home-hero__loadingGaugeFoot">
        <div className="home-skeleton home-hero__loadingBadge" />
        <div className="home-skeleton home-hero__loadingBadge home-hero__loadingBadge--short" />
      </div>
    </div>}
  </div>;
}
