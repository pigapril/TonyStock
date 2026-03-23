import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { SearchBox } from '../SearchBox';

describe('SearchBox', () => {
  const watchlistService = {
    searchStocks: jest.fn()
  };

  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderSearchBox = () => render(
    <I18nextProvider i18n={i18n}>
      <SearchBox
        onSelect={onSelect}
        watchlistService={watchlistService}
        categoryId="cat-1"
      />
    </I18nextProvider>
  );

  it('shows search results after debounced input', async () => {
    watchlistService.searchStocks.mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple', market: 'US' }
    ]);

    renderSearchBox();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'aapl' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });

  it('shows empty state when no results are returned', async () => {
    watchlistService.searchStocks.mockResolvedValue([]);

    renderSearchBox();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xxxx' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/No matching stocks found|查無符合股票/i)).toBeInTheDocument();
    });
  });

  it('shows translated error state when the search fails', async () => {
    watchlistService.searchStocks.mockRejectedValue(new Error('boom'));

    renderSearchBox();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tsla' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/unknown error occurred|未知錯誤/i)).toBeInTheDocument();
    });
  });
});
