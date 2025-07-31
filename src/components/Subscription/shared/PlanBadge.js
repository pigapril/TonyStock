import React from 'react';
import { useTranslation } from 'react-i18next';
import './PlanBadge.css';

export const PlanBadge = ({ 
  plan, 
  size = 'medium', 
  showLabel = true,
  className = '' 
}) => {
  const { t } = useTranslation();
  
  const planConfig = {
    free: {
      label: t('subscription.plans.free'),
      color: 'gray',
      icon: '🆓'
    },
    pro: {
      label: t('subscription.plans.pro'),
      color: 'blue',
      icon: '⭐'
    }
  };

  const config = planConfig[plan] || planConfig.free;
  
  const badgeClass = [
    'plan-badge',
    `plan-badge--${config.color}`,
    `plan-badge--${size}`,
    !showLabel && 'plan-badge--icon-only',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={badgeClass}>
      <span className="plan-badge__icon">{config.icon}</span>
      {showLabel && (
        <span className="plan-badge__label">{config.label}</span>
      )}
    </div>
  );
};