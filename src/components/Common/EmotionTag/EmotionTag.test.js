import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmotionTag from './EmotionTag';

describe('EmotionTag', () => {
  const defaultProps = {
    sentimentType: 'neutral',
    sentimentText: 'Neutral',
    percentileValue: 50
  };

  it('renders text and percentile content', () => {
    render(<EmotionTag {...defaultProps} />);

    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders interactive state when clickable and forwards clicks and keyboard activation', () => {
    const onTagClick = jest.fn();

    render(<EmotionTag {...defaultProps} onTagClick={onTagClick} />);

    const button = screen.getByRole('button', { name: 'Neutral 50%' });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });

    expect(onTagClick).toHaveBeenCalledTimes(3);
    expect(onTagClick).toHaveBeenNthCalledWith(1, 'neutral');
  });

  it('applies loading, active, and custom css hooks without invoking clicks', () => {
    const onTagClick = jest.fn();
    const { container } = render(
      <EmotionTag
        {...defaultProps}
        isActive={true}
        isLoading={true}
        onTagClick={onTagClick}
        showConnectionLine={true}
        animationDelay={500}
        className="custom-class"
      />
    );

    const root = container.querySelector('.emotion-tag');
    fireEvent.click(root);

    expect(root).toHaveClass('emotion-tag--active');
    expect(root).toHaveClass('emotion-tag--loading');
    expect(root).toHaveClass('custom-class');
    expect(root).toHaveStyle('animation-delay: 500ms');
    expect(container.querySelector('.emotion-tag__connection-line')).toBeInTheDocument();
    expect(onTagClick).not.toHaveBeenCalled();
  });

  it('omits the percentile value when it is null', () => {
    render(
      <EmotionTag
        sentimentType="neutral"
        sentimentText="Neutral"
        percentileValue={null}
      />
    );

    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
