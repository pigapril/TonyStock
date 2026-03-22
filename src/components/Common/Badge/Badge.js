import React from 'react';
import './Badge.css';

export function Badge({
  icon,
  label,
  variant = 'neutral',
  size = 'medium',
  iconOnly = false,
  className = ''
}) {
  const badgeClassName = [
    'ui-badge',
    `ui-badge--${variant}`,
    `ui-badge--${size}`,
    iconOnly && 'ui-badge--icon-only',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClassName}>
      {icon && <span className="ui-badge__icon">{icon}</span>}
      {!iconOnly && label && <span className="ui-badge__label">{label}</span>}
    </span>
  );
}
