import React from 'react';
import PropTypes from 'prop-types';
import './EmotionTag.css';

const EmotionTag = ({
  sentimentType = 'neutral',
  sentimentText = '',
  percentileValue = null,
  isActive = false,
  isLoading = false,
  onTagClick = null,
  showConnectionLine = false,
  animationDelay = 0,
  className = ''
}) => {
  const handleClick = () => {
    if (onTagClick && !isLoading) {
      onTagClick(sentimentType);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onTagClick && !isLoading) {
      event.preventDefault();
      onTagClick(sentimentType);
    }
  };

  const tagClasses = [
    'emotion-tag',
    `emotion-tag--${sentimentType}`,
    isActive ? 'emotion-tag--active' : '',
    isLoading ? 'emotion-tag--loading' : '',
    onTagClick ? 'emotion-tag--clickable' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={tagClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onTagClick ? 0 : -1}
      role={onTagClick ? 'button' : 'text'}
      aria-label={`${sentimentText} ${percentileValue ? `${percentileValue}%` : ''}`}
      style={{
        animationDelay: `${animationDelay}ms`
      }}
    >
      <div className="emotion-tag__indicator">
        <div className="emotion-tag__pulse"></div>
        <div className="emotion-tag__core"></div>
      </div>
      
      <div className="emotion-tag__content">
        <span className="emotion-tag__text">{sentimentText}</span>
        {percentileValue !== null && (
          <span className="emotion-tag__value">{Math.round(percentileValue)}%</span>
        )}
      </div>
      
      {showConnectionLine && (
        <div className="emotion-tag__connection-line"></div>
      )}
      
      {isLoading && (
        <div className="emotion-tag__loading-overlay">
          <div className="emotion-tag__loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

EmotionTag.propTypes = {
  sentimentType: PropTypes.oneOf([
    'extremeFear',
    'fear', 
    'neutral',
    'greed',
    'extremeGreed',
    'notAvailable'
  ]),
  sentimentText: PropTypes.string.isRequired,
  percentileValue: PropTypes.number,
  isActive: PropTypes.bool,
  isLoading: PropTypes.bool,
  onTagClick: PropTypes.func,
  showConnectionLine: PropTypes.bool,
  animationDelay: PropTypes.number,
  className: PropTypes.string
};

export default EmotionTag;