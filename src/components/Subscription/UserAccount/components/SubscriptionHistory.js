import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../context/SubscriptionContext';
import { PlanBadge } from '../../shared/PlanBadge';
import './SubscriptionHistory.css';

export const SubscriptionHistory = () => {
  const { t } = useTranslation();
  const { subscriptionHistory, loading } = useSubscription();

  const getActionIcon = (action) => {
    const icons = {
      upgrade: '⬆️',
      downgrade: '⬇️',
      renewal: '🔄',
      cancellation: '❌'
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action) => {
    const colors = {
      upgrade: '#34C759',
      downgrade: '#FF9500',
      renewal: '#007AFF',
      cancellation: '#FF3B30'
    };
    return colors[action] || '#86868B';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#34C759',
      pending: '#FF9500',
      failed: '#FF3B30'
    };
    return colors[status] || '#86868B';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(document.documentElement.lang || 'zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat(document.documentElement.lang || 'zh-TW', {
      style: 'currency',
      currency: 'TWD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="subscription-history">
        <div className="subscription-history__loading">
          <div className="subscription-history__loading-spinner" />
          <p>{t('subscriptionHistory.loading', 'Loading subscription history...')}</p>
        </div>
      </div>
    );
  }

  if (!subscriptionHistory || subscriptionHistory.length === 0) {
    return (
      <div className="subscription-history">
        <div className="subscription-history__empty">
          <div className="subscription-history__empty-icon">📋</div>
          <h3 className="subscription-history__empty-title">
            {t('subscriptionHistory.noHistory', 'No Subscription History')}
          </h3>
          <p className="subscription-history__empty-description">
            {t('subscriptionHistory.noHistoryDescription', 'Your subscription changes and renewals will appear here.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-history">
      <div className="subscription-history__timeline">
        {subscriptionHistory.map((entry, index) => (
          <div key={entry.id} className="subscription-history__item">
            <div className="subscription-history__timeline-marker">
              <div 
                className="subscription-history__timeline-dot"
                style={{ backgroundColor: getActionColor(entry.action) }}
              >
                <span className="subscription-history__timeline-icon">
                  {getActionIcon(entry.action)}
                </span>
              </div>
              {index < subscriptionHistory.length - 1 && (
                <div className="subscription-history__timeline-line" />
              )}
            </div>

            <div className="subscription-history__content">
              <div className="subscription-history__header">
                <div className="subscription-history__action">
                  <h4 className="subscription-history__action-title">
                    {t(`subscriptionHistory.actions.${entry.action}`, entry.action)}
                  </h4>
                  <span 
                    className="subscription-history__status"
                    style={{ color: getStatusColor(entry.status) }}
                  >
                    {t(`subscriptionHistory.status.${entry.status}`, entry.status)}
                  </span>
                </div>
                <time className="subscription-history__date">
                  {formatDate(entry.date)}
                </time>
              </div>

              <div className="subscription-history__details">
                {entry.fromPlan && entry.toPlan && (
                  <div className="subscription-history__plan-change">
                    <PlanBadge plan={entry.fromPlan} size="small" />
                    <svg className="subscription-history__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <PlanBadge plan={entry.toPlan} size="small" />
                  </div>
                )}

                {entry.amount && (
                  <div className="subscription-history__amount">
                    <span className="subscription-history__amount-label">
                      {t('subscriptionHistory.amount', 'Amount')}:
                    </span>
                    <span className="subscription-history__amount-value">
                      {formatAmount(entry.amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};