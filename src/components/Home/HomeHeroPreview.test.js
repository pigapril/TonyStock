import React from 'react';
import { render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import HomeHeroPreview from './HomeHeroPreview';
import en from '../../locales/resources/en/common.json';
import zh from '../../locales/resources/zh-TW/common.json';

const makeView = (instance, props) => <I18nextProvider i18n={instance}><HomeHeroPreview {...props} /></I18nextProvider>;

beforeEach(() => {
  window.matchMedia.mockImplementation(() => ({ matches: true, addListener: jest.fn(), removeListener: jest.fn() }));
});

test.each(['en', 'zh-TW'])('loading, carousel and failed-data states preserve the gauge and reserve all event copy in %s', lang => {
  const instance = createInstance();
  instance.use(initReactI18next).init({ lng: lang, fallbackLng: 'en', initImmediate: false,
    resources: { en: { translation: en }, 'zh-TW': { translation: zh } } });
  const copy = lang === 'en' ? en : zh;
  const events = Object.keys(copy.home.hero.moments.events);
  const moments = events.map(eventId => ({ eventId, date: '2022-10-03', score: 4 }));
  const { container, rerender } = render(makeView(instance, { isLoading: true, sentimentData: {} }));
  const gauge = container.querySelector('.msiArcGauge__svg');
  expect(gauge).not.toBeNull();
  expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  for (const { title } of Object.values(copy.home.hero.moments.events)) {
    expect(screen.getByText(title)).not.toBeVisible();
  }
  for (const moment of moments) {
    rerender(makeView(instance, { isLoading: false, sentimentData: { featuredMoments: moments }, activeMoment: moment }));
    expect(container.querySelector('.msiArcGauge__svg')).toBe(gauge);
    expect(screen.getByText(copy.home.hero.moments.events[moment.eventId].title)).toBeVisible();
    expect(container.querySelectorAll('.home-marketMomentPanel__reservedEvent[aria-hidden="false"]')).toHaveLength(1);
    expect(container.querySelector('.home-marketPreviewShell__skeleton')).not.toBeInTheDocument();
  }
  rerender(makeView(instance, { isLoading: false, sentimentData: {} }));
  expect(container.querySelector('.msiArcGauge__svg')).toBe(gauge);
  expect(container.querySelectorAll('.home-marketMomentPanel__reservedEvent[aria-hidden="false"]')).toHaveLength(0);
  expect(container.querySelectorAll('.home-marketMomentPanel__reservedEvent')).toHaveLength(events.length);
});
