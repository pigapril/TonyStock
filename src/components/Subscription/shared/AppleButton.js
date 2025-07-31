import React from 'react';
import './AppleButton.css';

export const AppleButton = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  onClick,
  className = '',
  ...props 
}) => {
  const buttonClass = [
    'apple-button',
    `apple-button--${variant}`,
    `apple-button--${size}`,
    disabled && 'apple-button--disabled',
    loading && 'apple-button--loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <div className="apple-button__spinner" />}
      <span className="apple-button__content">
        {children}
      </span>
    </button>
  );
};