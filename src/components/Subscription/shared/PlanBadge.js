import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../Common/Badge/Badge';

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

  return (
    <Badge
      icon={config.icon}
      label={config.label}
      variant={config.color === 'gray' ? 'neutral' : config.color}
      size={size}
      iconOnly={!showLabel}
      className={className}
    />
  );
};
