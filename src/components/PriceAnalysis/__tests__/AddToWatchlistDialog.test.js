import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddToWatchlistDialog } from '../AddToWatchlistDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options = {}) => (options.defaultValue || key)
      .replace('{{count}}', options.count ?? '')
      .replace('{{stockCode}}', options.stockCode ?? '')
  })
}));

jest.mock('../../Common/Dialog/Dialog', () => ({
  Dialog: ({ open, title, description, children }) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
    );
  }
}));

const categories = [
  {
    id: 'cat-existing',
    name: '核心持股',
    stocks: [{ stockCode: 'AAPL' }, { symbol: 'MSFT' }]
  },
  {
    id: 'cat-growth',
    name: '成長觀察',
    stocks: [{ stockSymbol: 'NVDA' }]
  }
];

describe('AddToWatchlistDialog', () => {
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the analysed stock context and selectable categories', () => {
    render(
      <AddToWatchlistDialog
        open
        categories={categories}
        stockCode="NVDA"
        stockPriceText="$352.10"
        sentimentText="中性"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('$352.10')).toBeInTheDocument();
    expect(screen.getByText('中性')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /核心持股/ })).toBeChecked();
    expect(screen.getByText('2 檔股票')).toBeInTheDocument();
    const alreadyAddedLabel = screen.getByText('已加入');
    expect(alreadyAddedLabel).toBeInTheDocument();
    expect(alreadyAddedLabel).toHaveClass('add-to-watchlist-dialog__already-added');
    expect(screen.getByRole('radio', { name: /成長觀察/ })).toBeDisabled();
  });

  it('submits the selected category using the existing callback contract', () => {
    render(
      <AddToWatchlistDialog
        open
        categories={categories}
        stockCode="TSLA"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /成長觀察/ }));
    fireEvent.click(screen.getByRole('button', { name: '加入追蹤清單' }));
    expect(onSubmit).toHaveBeenCalledWith({ categoryId: 'cat-growth', newCategoryName: null });
  });

  it('creates a new category and trims its name before submitting', () => {
    render(
      <AddToWatchlistDialog
        open
        categories={categories}
        stockCode="TSLA"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '建立新分類' }));
    const input = screen.getByLabelText('新分類名稱');
    fireEvent.change(input, { target: { value: '  長期投資  ' } });
    fireEvent.click(screen.getByRole('button', { name: '加入追蹤清單' }));

    expect(onSubmit).toHaveBeenCalledWith({ categoryId: null, newCategoryName: '長期投資' });
  });

  it('starts in create mode when the account has no categories', () => {
    render(
      <AddToWatchlistDialog
        open
        categories={[]}
        stockCode="TSLA"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByLabelText('新分類名稱')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '加入追蹤清單' })).toBeDisabled();
  });
});
