import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './SubscriptionHistory.css';

export const SubscriptionHistory = ({ history, loading }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  if (loading) {
    return (
      <div className="subscription-history subscription-history--loading">
        <div className="subscription-history__skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="subscription-history__skeleton-item">
              <div className="subscription-history__skeleton-date" />
              <div className="subscription-history__skeleton-text" />
              <div className="subscription-history__skeleton-badge" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="subscription-history subscription-history--empty">
        <div className="subscription-history__empty-icon">📋</div>
        <h3 className="subscription-history__empty-title">
          {t('subscription.history.noHistory')}
        </h3>
        <p className="subscription-history__empty-description">
          {t('subscription.history.noHistoryDescription')}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = history.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatAmount = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'upgrade': return '⬆️';
      case 'downgrade': return '⬇️';
      case 'renewal': return '🔄';
      case 'cancellation': return '❌';
      default: return '📝';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'gray';
    }
  };

  return (
    <div className="subscription-history">
      <div className="subscription-history__list">
        {currentItems.map((item) => (
          <div key={item.id} className="subscription-history__item">
            <div className="subscription-history__item-header">
              <div className="subscription-history__item-icon">
                {getActionIcon(item.action)}
              </div>
              <div className="subscription-history__item-info">
                <div className="subscription-history__item-title">
                  {item.action === 'cancellation' && item.description ? (
                    item.description
                  ) : (
                    <>
                      {t(`subscription.history.actions.${item.action}`, item.action)}
                      {item.fromPlan && item.toPlan && item.action !== 'cancellation' && (
                        <span className="subscription-history__item-plans">
                          {t('subscription.plans.' + item.fromPlan)} → {t('subscription.plans.' + item.toPlan)}
                        </span>
                      )}
                      {item.action === 'cancellation' && item.toPlan && (
                        <span className="subscription-history__item-plans">
                          {t('subscription.plans.' + item.toPlan)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="subscription-history__item-date">
                  {formatDate(item.actionDate || item.date)}
                </div>
              </div>
              <div className="subscription-history__item-meta">
                {item.amount && (
                  <div className="subscription-history__item-amount">
                    {formatAmount(item.amount)}
                  </div>
                )}
                <div className={`subscription-history__item-status subscription-history__item-status--${getStatusColor(item.status)}`}>
                  {t(`subscription.history.statuses.${item.status}`, item.status)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="subscription-history__pagination">
          <button
            className="subscription-history__pagination-button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            {t('common.previous')}
          </button>
          
          <div className="subscription-history__pagination-info">
            <span className="subscription-history__pagination-current">
              {currentPage}
            </span>
            <span className="subscription-history__pagination-separator">
              /
            </span>
            <span className="subscription-history__pagination-total">
              {totalPages}
            </span>
          </div>
          
          <button
            className="subscription-history__pagination-button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="subscription-history__summary">
        <div className="subscription-history__summary-item">
          <span className="subscription-history__summary-label">
            {t('subscription.history.totalEntries')}:
          </span>
          <span className="subscription-history__summary-value">
            {history.length}
          </span>
        </div>
        
        <div className="subscription-history__summary-item">
          <span className="subscription-history__summary-label">
            {t('subscription.history.memberSince')}:
          </span>
          <span className="subscription-history__summary-value">
            {history.length > 0 ? formatDate(history[history.length - 1].date) : '-'}
          </span>
        </div>
      </div>
    </div>
  );
};