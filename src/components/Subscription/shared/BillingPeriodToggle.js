import React from 'react';
import { useTranslation } from 'react-i18next';
import './BillingPeriodToggle.css';

export const BillingPeriodToggle = ({ value, onChange, className = '' }) => {
  const { t } = useTranslation();

  const handleToggle = (period) => {
    if (period !== value && onChange) {
      onChange(period);
    }
  };

  return (
    <div className={`billing-period-toggle ${className}`}>
      <div className="billing-period-toggle__container">
        <div 
          className={`billing-period-toggle__slider ${value === 'yearly' ? 'billing-period-toggle__slider--yearly' : ''}`}
        />
        <button
          type="button"
          className={`billing-period-toggle__option ${value === 'monthly' ? 'billing-period-toggle__option--active' : ''}`}
          onClick={() => handleToggle('monthly')}
          aria-pressed={value === 'monthly'}
        >
          {t('subscription.billingPeriod.monthly')}
        </button>
        <button
          type="button"
          className={`billing-period-toggle__option billing-period-toggle__option--yearly ${value === 'yearly' ? 'billing-period-toggle__option--active' : ''}`}
          onClick={() => handleToggle('yearly')}
          aria-pressed={value === 'yearly'}
        >
          <div className="billing-period-toggle__yearly-content">
            <span className="billing-period-toggle__option-text">
              {t('subscription.billingPeriod.yearly')}
            </span>
            <span className="billing-period-toggle__discount-badge">
              {t('subscription.billingPeriod.save')} 17%
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};