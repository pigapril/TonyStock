import React from 'react';
import { useTranslation } from 'react-i18next';
import './UsageProgressBar.css';

export const UsageProgressBar = ({ 
  used, 
  limit, 
  label,
  showPercentage = true,
  showNumbers = true,
  size = 'medium',
  className = '' 
}) => {
  const { t } = useTranslation();
  
  // Handle unlimited plans (-1 limit)
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  
  // Determine color based on usage percentage
  const getProgressColor = () => {
    if (isUnlimited) return 'blue';
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'orange';
    return 'blue';
  };

  const progressColor = getProgressColor();
  const progressClass = [
    'usage-progress',
    `usage-progress--${size}`,
    `usage-progress--${progressColor}`,
    className
  ].filter(Boolean).join(' ');

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={progressClass}>
      <div className="usage-progress__header">
        <span className="usage-progress__label">{label}</span>
        <div className="usage-progress__stats">
          {showNumbers && (
            <span className="usage-progress__numbers">
              {formatNumber(used)} {!isUnlimited && `/ ${formatNumber(limit)}`}
            </span>
          )}
          {showPercentage && !isUnlimited && (
            <span className="usage-progress__percentage">
              {Math.round(percentage)}%
            </span>
          )}
          {isUnlimited && (
            <span className="usage-progress__unlimited">
              {t('subscription.unlimited', 'Unlimited')}
            </span>
          )}
        </div>
      </div>
      
      <div className="usage-progress__track">
        <div 
          className="usage-progress__fill"
          style={{ 
            width: isUnlimited ? '100%' : `${percentage}%`,
            opacity: isUnlimited ? 0.3 : 1
          }}
        />
      </div>
      
      {!isUnlimited && percentage >= 90 && (
        <div className="usage-progress__warning">
          {percentage >= 100 
            ? t('subscription.quotaExceeded', 'Quota exceeded')
            : t('subscription.quotaNearLimit', 'Near limit')
          }
        </div>
      )}
    </div>
  );
};