import React from 'react';
import { useTranslation } from 'react-i18next';
import './PlanBadge.css';

export const PlanBadge = ({ 
  plan, 
  size = 'medium',
  showIcon = true,
  className = '' 
}) => {
  const { t } = useTranslation();
  
  const planConfig = {
    free: {
      label: t('subscription.plans.free', 'Free'),
      color: 'gray',
      icon: '🆓'
    },
    pro: {
      label: t('subscription.plans.pro', 'Pro'),
      color: 'blue',
      icon: '⭐'
    },
    ultra: {
      label: t('subscription.plans.ultra', 'Ultra'),
      color: 'purple',
      icon: '👑'
    }
  };

  const config = planConfig[plan] || planConfig.free;
  const badgeClass = [
    'plan-badge',
    `plan-badge--${config.color}`,
    `plan-badge--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClass}>
      {showIcon && <span className="plan-badge__icon">{config.icon}</span>}
      <span className="plan-badge__label">{config.label}</span>
    </span>
  );
};