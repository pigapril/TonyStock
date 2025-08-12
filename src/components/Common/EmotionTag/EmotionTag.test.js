import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmotionTag from './EmotionTag';

describe('EmotionTag', () => {
  const defaultProps = {
    sentimentType: 'neutral',
    sentimentText: 'Neutral',
    percentileValue: 50
  };

  test('renders with basic props', () => {
    render(<EmotionTag {...defaultProps} />);
    
    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('renders different sentiment types correctly', () => {
    const sentimentTypes = ['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed', 'notAvailable'];
    
    sentimentTypes.forEach(type => {
      const { rerender } = render(
        <EmotionTag 
          sentimentType={type}
          sentimentText={type}
          percentileValue={50}
        />
      );
      
      const element = screen.getByRole('text');
      expect(element).toHaveClass(`emotion-tag--${type}`);
      
      rerender(<div />); // Clean up for next iteration
    });
  });

  test('handles click events when clickable', () => {
    const mockOnClick = jest.fn();
    
    render(
      <EmotionTag 
        {...defaultProps}
        onTagClick={mockOnClick}
      />
    );
    
    const element = screen.getByRole('button');
    fireEvent.click(element);
    
    expect(mockOnClick).toHaveBeenCalledWith('neutral');
  });

  test('handles keyboard events', () => {
    const mockOnClick = jest.fn();
    
    render(
      <EmotionTag 
        {...defaultProps}
        onTagClick={mockOnClick}
      />
    );
    
    const element = screen.getByRole('button');
    
    fireEvent.keyDown(element, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledWith('neutral');
    
    fireEvent.keyDown(element, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  test('shows loading state', () => {
    render(
      <EmotionTag 
        {...defaultProps}
        isLoading={true}
      />
    );
    
    expect(screen.getByRole('text')).toHaveClass('emotion-tag--loading');
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  test('shows active state', () => {
    render(
      <EmotionTag 
        {...defaultProps}
        isActive={true}
      />
    );
    
    expect(screen.getByRole('text')).toHaveClass('emotion-tag--active');
  });

  test('handles null percentile value', () => {
    render(
      <EmotionTag 
        sentimentType="neutral"
        sentimentText="Neutral"
        percentileValue={null}
      />
    );
    
    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(
      <EmotionTag 
        {...defaultProps}
        className="custom-class"
      />
    );
    
    expect(screen.getByRole('text')).toHaveClass('custom-class');
  });

  test('shows connection line when enabled', () => {
    const { container } = render(
      <EmotionTag 
        {...defaultProps}
        showConnectionLine={true}
      />
    );
    
    expect(container.querySelector('.emotion-tag__connection-line')).toBeInTheDocument();
  });

  test('applies animation delay', () => {
    const { container } = render(
      <EmotionTag 
        {...defaultProps}
        animationDelay={500}
      />
    );
    
    const element = container.querySelector('.emotion-tag');
    expect(element).toHaveStyle('animation-delay: 500ms');
  });

  test('has proper accessibility attributes', () => {
    render(
      <EmotionTag 
        {...defaultProps}
        onTagClick={() => {}}
      />
    );
    
    const element = screen.getByRole('button');
    expect(element).toHaveAttribute('aria-label', 'Neutral 50%');
    expect(element).toHaveAttribute('tabIndex', '0');
  });

  test('does not interfere when loading and clicked', () => {
    const mockOnClick = jest.fn();
    
    render(
      <EmotionTag 
        {...defaultProps}
        isLoading={true}
        onTagClick={mockOnClick}
      />
    );
    
    const element = screen.getByRole('text'); // Should be 'text' role when loading, not 'button'
    fireEvent.click(element);
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });
});