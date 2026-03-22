import React from 'react';
import { Button } from '../../Common/Button/Button';

export const AppleButton = ({ 
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
};
