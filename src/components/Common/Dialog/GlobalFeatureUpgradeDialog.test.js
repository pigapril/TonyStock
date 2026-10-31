import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDialog } from './useDialog';
import { GlobalFeatureUpgradeDialog } from './GlobalFeatureUpgradeDialog';

jest.mock('react-router-dom', () => ({ useNavigate: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: jest.fn() }));
jest.mock('./useDialog', () => ({ useDialog: jest.fn() }));
jest.mock('../../Auth/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('../../../services/freeTrialService', () => ({ fetchFreeTrialEligibility: (...args) => mockFetchEligibility(...args) }));
jest.mock('../../../utils/freeTrialRollout', () => ({ canSeeFreeTrial: (email) => Boolean(email) }));
jest.mock('./FeatureUpgradeDialog', () => ({
    FeatureUpgradeDialog: ({ context, onClose, onUpgrade, primaryCtaLabel }) => (
        <div data-testid="upgrade-dialog" data-feature={context.feature}>
            <button onClick={onUpgrade}>{primaryCtaLabel || 'Upgrade'}</button>
            <button onClick={onClose}>Close</button>
            <button onClick={context.onBrowseFreeStocks}>Browse free stocks</button>
        </div>
    )
}));

const navigate = jest.fn();
const closeDialog = jest.fn();
const mockAuth = { user: null };
const mockFetchEligibility = jest.fn();
const plansUrl = (returnPath) => `/en/subscription-plans?${new URLSearchParams({ returnTo: returnPath })}`;
let dialog;

beforeEach(() => {
    jest.clearAllMocks();
    dialog = { type: 'featureUpgrade', isOpen: true, props: { feature: 'stockAccess' } };
    useDialog.mockImplementation(() => ({ dialog, closeDialog }));
    useNavigate.mockReturnValue(navigate);
    useTranslation.mockReturnValue({ t: (key) => key, i18n: { language: 'en' } });
    mockAuth.user = null;
    mockFetchEligibility.mockResolvedValue({ eligible: false });
});

it('shows the trial CTA and opens the trial flow for eligible subscribers', async () => {
    mockAuth.user = { id: 'eligible', email: 'eligible@example.com' };
    mockFetchEligibility.mockResolvedValue({ eligible: true });
    render(<GlobalFeatureUpgradeDialog />);

    const trialButton = await screen.findByRole('button', { name: 'freeTrial.ctaShort' });
    fireEvent.click(trialButton);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/en/payment/free-trial'));
});

it('uses SPA navigation and preserves the stock, years and backtest date', () => {
    const returnPath = '/en/priceanalysis?stockCode=AAPL&years=7&backTestDate=2026-09-01';
    dialog.props.upgradeUrl = plansUrl(returnPath);
    const originalLocation = window.location.href;
    render(<GlobalFeatureUpgradeDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    expect(navigate).toHaveBeenCalledWith(plansUrl(returnPath));
    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(originalLocation);
});

it('keeps the active language and existing non-navigation context', () => {
    const browseFreeStocks = jest.fn();
    useTranslation.mockReturnValue({ i18n: { language: 'zh-TW' } });
    dialog.props = { feature: 'watchlist', onBrowseFreeStocks: browseFreeStocks };
    render(<GlobalFeatureUpgradeDialog />);

    expect(screen.getByTestId('upgrade-dialog')).toHaveAttribute('data-feature', 'watchlist');
    fireEvent.click(screen.getByRole('button', { name: 'Browse free stocks' }));
    expect(browseFreeStocks).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));
    expect(navigate).toHaveBeenCalledWith('/zh-TW/subscription-plans');
});

it.each([
    'https://example.com/steal',
    '//example.com/steal',
    '/en/payment/result?token=secret',
    '/en/priceanalysis/../payment'
])('discards an unsafe return target: %s', (returnPath) => {
    dialog.props.upgradeUrl = plansUrl(returnPath);
    render(<GlobalFeatureUpgradeDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    expect(navigate).toHaveBeenCalledWith('/en/subscription-plans');
});

it.each([
    `https://example.com${plansUrl('/en/priceanalysis?stockCode=AAPL&years=7')}`,
    '/en/payment?returnTo=%2Fen%2Fpriceanalysis',
    'http://['
])('ignores an external, unrelated or malformed upgrade URL: %s', (upgradeUrl) => {
    dialog.props.upgradeUrl = upgradeUrl;
    render(<GlobalFeatureUpgradeDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    expect(navigate).toHaveBeenCalledWith('/en/subscription-plans');
});

it.each([
    { type: 'auth', isOpen: true },
    { type: 'featureUpgrade', isOpen: false }
])('does not render or navigate for an inactive upgrade dialog: %o', (state) => {
    Object.assign(dialog, state);
    render(<GlobalFeatureUpgradeDialog />);

    expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
});

it('closing the dialog does not navigate', () => {
    render(<GlobalFeatureUpgradeDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
});
