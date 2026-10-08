import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import snapshot from './data/usSentimentHistoryExamples.json';
import './SentimentHistoryExamples.css';

const X_START = 52;
const X_END = 650;
const SCORE_TOP = 32;
const SCORE_BOTTOM = 148;
const PRICE_TOP = 206;
const PRICE_BOTTOM = 320;
const day = (date) => Date.parse(`${date}T00:00:00Z`);
const pathFor = (points, x, y, value) => points.map((point, index) => `${index ? 'L' : 'M'}${x(point.date).toFixed(2)},${y(value(point)).toFixed(2)}`).join(' ');

function HistoryFigure({ example, t, language }) {
  const titleId = useId();
  const descriptionId = useId();
  const start = day(example.points[0].date);
  const end = day(example.points[example.points.length - 1].date);
  const x = date => X_START + (day(date) - start) / (end - start) * (X_END - X_START);
  const scoreY = value => SCORE_BOTTOM - value / 100 * (SCORE_BOTTOM - SCORE_TOP);
  const prices = example.points.map(point => point.spyClose);
  const low = Math.min(...prices) * 0.97;
  const high = Math.max(...prices) * 1.03;
  const priceY = value => PRICE_BOTTOM - (value - low) / (high - low) * (PRICE_BOTTOM - PRICE_TOP);
  const formatDate = date => new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(day(date)));
  const formatAxisDate = date => new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day(date)));
  const labels = [example.points[0].date, example.points[Math.floor(example.points.length / 2)].date, example.points[example.points.length - 1].date];

  return (
    <figure className="sentiment-examples__figure">
      <svg className="sentiment-examples__chart" viewBox="0 0 700 365" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>{t(`sentimentHistoryExamples.cases.${example.id}.title`)}</title>
        <desc id={descriptionId}>{t('sentimentHistoryExamples.chartDescription', { count: example.markers.length, start: formatDate(labels[0]), end: formatDate(labels[2]) })}</desc>
        <rect x={X_START} y={scoreY(20)} width={X_END - X_START} height={SCORE_BOTTOM - scoreY(20)} className="sentiment-examples__fear-band" />
        <text x={X_START} y="19" className="sentiment-examples__axis-heading">{t('sentimentHistoryExamples.scoreLabel')}</text>
        <text x={X_START} y="193" className="sentiment-examples__axis-heading">{t('sentimentHistoryExamples.priceLabel')}</text>
        {[0, 50, 100].map(value => <g key={value}>
          <line x1={X_START} x2={X_END} y1={scoreY(value)} y2={scoreY(value)} className="sentiment-examples__grid" />
          <text x="41" y={scoreY(value) + 4} textAnchor="end" className="sentiment-examples__axis-label">{value}</text>
        </g>)}
        {[low, (low + high) / 2, high].map(value => <g key={value}>
          <line x1={X_START} x2={X_END} y1={priceY(value)} y2={priceY(value)} className="sentiment-examples__grid" />
          <text x="41" y={priceY(value) + 4} textAnchor="end" className="sentiment-examples__axis-label">{Math.round(value)}</text>
        </g>)}
        <path d={pathFor(example.points, x, scoreY, point => point.compositeScore)} className="sentiment-examples__score-line" />
        <path d={pathFor(example.points, x, priceY, point => point.spyClose)} className="sentiment-examples__price-line" />
        {example.markers.map(marker => <g key={marker.date}>
          <line x1={x(marker.date)} x2={x(marker.date)} y1={SCORE_TOP} y2={PRICE_BOTTOM} className="sentiment-examples__marker-guide" />
          <circle cx={x(marker.date)} cy={scoreY(marker.compositeScore)} r="5.5" className="sentiment-examples__marker" />
          <circle cx={x(marker.date)} cy={priceY(marker.spyClose)} r="4" className="sentiment-examples__price-marker" />
        </g>)}
        {labels.map((date, index) => <text key={date} x={x(date)} y="346" textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'} className="sentiment-examples__axis-label">{formatAxisDate(date)}</text>)}
      </svg>
      <figcaption>
        <span className="sentiment-examples__marker-key" aria-hidden="true" />
        {t('sentimentHistoryExamples.markerLabel')}
        <span className="sentiment-examples__dates">{example.markers.map(marker => `${formatDate(marker.date)} · ${t('sentimentHistoryExamples.scoreValue', { score: new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(marker.compositeScore) })}`).join(' / ')}</span>
      </figcaption>
    </figure>
  );
}

export default function SentimentHistoryExamples({ lang }) {
  const { t } = useTranslation();
  const [caseId, setCaseId] = useState(snapshot.cases[0].id);
  const example = snapshot.cases.find(item => item.id === caseId);
  const language = lang === 'zh-TW' ? 'zh-TW' : 'en-US';
  const panelId = useId();
  const headingId = useId();

  return (
    <section id="sio-history-examples" className="sentiment-examples" aria-labelledby={headingId}>
      <p className="sentiment-examples__eyebrow">{t('sentimentHistoryExamples.eyebrow')}</p>
      <h2 id={headingId}>{t('sentimentHistoryExamples.heading')}</h2>
      <p className="sentiment-examples__intro">{t('sentimentHistoryExamples.intro')}</p>
      <div className="sentiment-examples__choices" aria-label={t('sentimentHistoryExamples.chooseCase')}>
        {snapshot.cases.map(item => <button key={item.id} type="button" aria-pressed={item.id === caseId} aria-controls={panelId} onClick={() => setCaseId(item.id)}>
          {t(`sentimentHistoryExamples.cases.${item.id}.label`)}
        </button>)}
      </div>
      <div id={panelId}>
        <h3 className="sentiment-examples__case-title">{t(`sentimentHistoryExamples.cases.${caseId}.title`)}</h3>
        <HistoryFigure example={example} t={t} language={language} />
        <p className="sentiment-examples__reading">{t(`sentimentHistoryExamples.cases.${caseId}.reading`)}</p>
      </div>
      <div className="sentiment-examples__next">
        <div><h3>{t('sentimentHistoryExamples.nextHeading')}</h3><p>{t('sentimentHistoryExamples.nextBody')}</p></div>
        <Link className="sentiment-examples__cta" to={`/${lang}/market-sentiment`}>{t('sentimentHistoryExamples.cta')}<span aria-hidden="true"> →</span></Link>
      </div>
    </section>
  );
}
