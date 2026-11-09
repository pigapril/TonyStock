import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AdProvider, useAdContext } from '../AdContext';

const mockAuthState = { user: { id: 'user-1', plan: 'free' } };
const mockSubscriptionState = { userPlan: { type: 'free' } };
const mockDialogState = { dialog: null };

jest.mock('../../../Auth/useAuth', () => ({ useAuth: () => mockAuthState }));
jest.mock('../../../Subscription/SubscriptionContext', () => ({ useSubscription: () => mockSubscriptionState }));
jest.mock('../../Dialog/useDialog', () => ({ useDialog: () => mockDialogState }));
jest.mock('../../../Payment/FreeTrial/FreeTrialPromotion', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ request, onAcquire, onRelease }) => {
      global.trialPromotionRequest = request;
      return React.createElement(React.Fragment, null,
      React.createElement('button', {
        onClick: () => { global.trialLockResult = onAcquire(); }
      }, 'acquire trial'),
      React.createElement('button', { onClick: onRelease }, 'release trial')
    );
    }
  };
});
jest.mock('../InterstitialAdModal', () => {
  const React = require('react');
  return {
    InterstitialAdModal: ({ onClose }) => React.createElement('div', { 'data-testid': 'adsense-modal' },
      React.createElement('button', { onClick: onClose }, 'close AdSense')
    )
  };
});

function AdRequester() {
  const { requestAdDisplay } = useAdContext();
  return <button onClick={() => requestAdDisplay('test', 1)}>trigger AdSense</button>;
}

function TrialRequester() {
  const { requestTrialPromotion } = useAdContext();
  return <button onClick={() => {
    global.trialRequestResult = requestTrialPromotion('price_analysis_completed', '/zh-TW/priceanalysis');
  }}>request trial promotion</button>;
}

describe('AdProvider modal mutex', () => {
  beforeEach(() => {
    mockAuthState.user = { id: 'user-1', plan: 'free' };
    mockSubscriptionState.userPlan = { type: 'free' };
    mockDialogState.dialog = null;
    global.trialLockResult = undefined;
    global.trialPromotionRequest = null;
    global.trialRequestResult = undefined;
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('其他 Dialog 開啟時，同步阻擋 AdSense 與試用插頁', () => {
    mockDialogState.dialog = { isOpen: true };
    const { rerender } = render(<AdProvider><AdRequester /></AdProvider>);

    fireEvent.click(screen.getByText('trigger AdSense'));
    fireEvent.click(screen.getByText('acquire trial'));
    expect(screen.queryByTestId('adsense-modal')).not.toBeInTheDocument();
    expect(global.trialLockResult).toBe(false);

    mockDialogState.dialog = null;
    rerender(<AdProvider><AdRequester /></AdProvider>);
    fireEvent.click(screen.getByText('acquire trial'));
    expect(global.trialLockResult).toBe(true);
  });

  it('AdSense 開啟或冷卻期間仍保留試用請求，等待安全時機顯示', () => {
    render(<AdProvider><AdRequester /><TrialRequester /></AdProvider>);
    fireEvent.click(screen.getByText('trigger AdSense'));

    fireEvent.click(screen.getByText('request trial promotion'));
    expect(global.trialRequestResult).toBe(true);
    expect(global.trialPromotionRequest).toEqual(expect.objectContaining({
      triggerSource: 'price_analysis_completed', pathname: '/zh-TW/priceanalysis'
    }));

    fireEvent.click(screen.getByText('close AdSense'));
    fireEvent.click(screen.getByText('request trial promotion'));
    expect(global.trialRequestResult).toBe(true);
  });

  it('試用插頁持有鎖時，同步阻擋 AdSense 插頁', () => {
    render(<AdProvider><AdRequester /></AdProvider>);

    fireEvent.click(screen.getByText('acquire trial'));
    expect(global.trialLockResult).toBe(true);
    fireEvent.click(screen.getByText('trigger AdSense'));

    expect(screen.queryByTestId('adsense-modal')).not.toBeInTheDocument();
  });

  it('AdSense 持有鎖及冷卻期間阻擋試用插頁，冷卻結束後才允許取得鎖', () => {
    render(<AdProvider><AdRequester /></AdProvider>);

    fireEvent.click(screen.getByText('trigger AdSense'));
    expect(screen.getByTestId('adsense-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('acquire trial'));
    expect(global.trialLockResult).toBe(false);

    fireEvent.click(screen.getByText('close AdSense'));
    fireEvent.click(screen.getByText('acquire trial'));
    expect(global.trialLockResult).toBe(false);

    act(() => { jest.advanceTimersByTime(120000); });
    fireEvent.click(screen.getByText('acquire trial'));
    expect(global.trialLockResult).toBe(true);
  });
});
