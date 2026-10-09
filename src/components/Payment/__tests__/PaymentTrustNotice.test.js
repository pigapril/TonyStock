import React from 'react';
import { render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../../../locales/resources/en/common.json';
import zhTW from '../../../locales/resources/zh-TW/common.json';
import PaymentTrustNotice from '../PaymentTrustNotice';

describe.each([
  ['en', 'monthly', 'month', 'Terms & refund policy'],
  ['en', 'yearly', 'year', 'Terms & refund policy'],
  ['zh-TW', 'monthly', '月', '服務條款與退款政策'],
  ['zh-TW', 'yearly', '年', '服務條款與退款政策']
])('payment disclosure %s %s', (lang, billingPeriod, period, policy) => {
  it('shows card brands, recurring TWD charges and localized support links', () => {
    const i18n = createInstance();
    i18n.init({ lng: lang, resources: { en: { translation: en }, 'zh-TW': { translation: zhTW } }, initImmediate: false, interpolation: { escapeValue: false } });
    const { container } = render(<I18nextProvider i18n={i18n}><PaymentTrustNotice amount={179} billingPeriod={billingPeriod} lang={lang} /></I18nextProvider>);
    expect(screen.getByAltText('Visa')).toHaveAttribute('src', '/images/payment/visa.png');
    expect(screen.getByAltText('Mastercard')).toHaveAttribute('src', '/images/payment/mastercard.webp');
    expect(container.querySelector('.payment-page__renewal-notice')).toHaveTextContent('TWD 179');
    expect(container.querySelector('.payment-page__renewal-notice')).toHaveTextContent(period);
    expect(screen.getByText(/payment.ecpay.com.tw/)).toBeVisible();
    expect(screen.getByRole('link', { name: policy })).toHaveAttribute('href', `/${lang}/legal`);
    expect(container.querySelector(`a[href="/${lang}/user-account"]`)).toBeVisible();
    expect(container.querySelector('a[href="mailto:support@sentimentinsideout.com"]')).toBeVisible();
    expect(container.textContent).not.toMatch(/5 分鐘|5 minutes|guarantee|保證所有/i);
    if (lang === 'en') expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/);
  });
});
