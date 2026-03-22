import React from 'react';
import './Button.css';

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  ...props
}) {
  const buttonClassName = [
    'ui-button',
    `ui-button--${variant}`,
    `ui-button--${size}`,
    disabled && 'ui-button--disabled',
    loading && 'ui-button--loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="ui-button__spinner" aria-hidden="true" />}
      <span className="ui-button__content">{children}</span>
    </button>
  );
}
