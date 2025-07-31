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
  variant = 'default',
  className = '' 
}) => {
  const { t } = useTranslation();
  
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isUnlimited = limit === -1 || limit === Infinity;
  
  // Determine color based on usage percentage
  const getVariant = () => {
    if (variant !== 'default') return variant;
    if (isUnlimited) return 'unlimited';
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const currentVariant = getVariant();
  
  const progressClass = [
    'usage-progress',
    `usage-progress--${size}`,
    `usage-progress--${currentVariant}`,
    className
  ].filter(Boolean).join(' ');

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={progressClass}>
      {label && (
        <div className="usage-progress__header">
          <span className="usage-progress__label">{label}</span>
          {showNumbers && (
            <span className="usage-progress__numbers">
              {isUnlimited ? (
                <span className="usage-progress__unlimited">
                  {formatNumber(used)} / {t('subscription.unlimited')}
                </span>
              ) : (
                <span>
                  {formatNumber(used)} / {formatNumber(limit)}
                </span>
              )}
            </span>
          )}
        </div>
      )}
      
      <div className="usage-progress__track">
        <div 
          className="usage-progress__fill"
          style={{ 
            width: isUnlimited ? '100%' : `${percentage}%`,
            opacity: isUnlimited ? 0.3 : 1
          }}
        />
        {!isUnlimited && percentage > 0 && (
          <div 
            className="usage-progress__glow"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      
      {showPercentage && !isUnlimited && (
        <div className="usage-progress__percentage">
          {percentage.toFixed(0)}%
        </div>
      )}
      
      {isUnlimited && (
        <div className="usage-progress__unlimited-badge">
          ∞
        </div>
      )}
    </div>
  );
};