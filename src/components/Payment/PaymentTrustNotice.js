import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PaymentTrustNotice({ amount, billingPeriod, lang }) {
    const { t } = useTranslation();
    return (
        <div className="payment-page__security-notice ui-surface-card ui-surface-card--prominent">
            <div className="payment-page__security-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div className="payment-page__security-text">
                <h4>{t('payment.security.title')}</h4>
                <div className="payment-page__card-brands" role="group" aria-label={t('payment.security.cards')}>
                    <span className="payment-page__card-brand">
                        <img src="/images/payment/visa.png" alt="Visa" width="58" height="19" />
                    </span>
                    <span className="payment-page__card-brand">
                        <img src="/images/payment/mastercard.webp" alt="Mastercard" width="42" height="26" />
                    </span>
                </div>
                <ul>
                    {t('payment.security.notices', { returnObjects: true }).map((notice, index) => (
                        <li key={index}>{notice}</li>
                    ))}
                </ul>
                {Number.isFinite(Number(amount)) && (
                    <p className="payment-page__renewal-notice">
                        {t('payment.security.renewal', {
                            amount: Number(amount).toLocaleString(lang === 'en' ? 'en-US' : 'zh-TW'),
                            period: t(`payment.security.${billingPeriod === 'monthly' ? 'monthly' : 'yearly'}`)
                        })}
                    </p>
                )}
                <div className="payment-page__support-links">
                    <a className="payment-page__link" href={`/${lang}/user-account`} target="_blank" rel="noopener noreferrer">{t('payment.security.cancel')}</a>
                    <a className="payment-page__link" href={`/${lang}/legal`} target="_blank" rel="noopener noreferrer">{t('payment.security.policy')}</a>
                    <a className="payment-page__link" href="mailto:support@sentimentinsideout.com">{t('payment.security.support')}</a>
                </div>
            </div>
        </div>
    );
}
