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
  const baseClass = 'apple-button';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const disabledClass = disabled ? `${baseClass}--disabled` : '';
  const loadingClass = loading ? `${baseClass}--loading` : '';
  
  const buttonClass = [
    baseClass,
    variantClass,
    sizeClass,
    disabledClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="apple-button__spinner" />}
      <span className={`apple-button__content ${loading ? 'apple-button__content--loading' : ''}`}>
        {children}
      </span>
    </button>
  );
};