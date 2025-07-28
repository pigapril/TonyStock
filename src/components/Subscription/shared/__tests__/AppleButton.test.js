import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppleButton } from '../AppleButton';

describe('AppleButton', () => {
  it('renders with default props', () => {
    render(<AppleButton>Click me</AppleButton>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('apple-button', 'apple-button--primary', 'apple-button--medium');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<AppleButton variant="secondary">Secondary</AppleButton>);
    expect(screen.getByRole('button')).toHaveClass('apple-button--secondary');

    rerender(<AppleButton variant="tertiary">Tertiary</AppleButton>);
    expect(screen.getByRole('button')).toHaveClass('apple-button--tertiary');

    rerender(<AppleButton variant="danger">Danger</AppleButton>);
    expect(screen.getByRole('button')).toHaveClass('apple-button--danger');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<AppleButton size="small">Small</AppleButton>);
    expect(screen.getByRole('button')).toHaveClass('apple-button--small');

    rerender(<AppleButton size="large">Large</AppleButton>);
    expect(screen.getByRole('button')).toHaveClass('apple-button--large');
  });

  it('handles disabled state', () => {
    render(<AppleButton disabled>Disabled</AppleButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('apple-button--disabled');
  });

  it('handles loading state', () => {
    render(<AppleButton loading>Loading</AppleButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('apple-button--loading');
    expect(button.querySelector('.apple-button__spinner')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<AppleButton onClick={handleClick}>Click me</AppleButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<AppleButton disabled onClick={handleClick}>Disabled</AppleButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<AppleButton loading onClick={handleClick}>Loading</AppleButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<AppleButton className="custom-class">Custom</AppleButton>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});