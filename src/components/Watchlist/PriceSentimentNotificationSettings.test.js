import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PriceSentimentNotificationSettings from './PriceSentimentNotificationSettings';
import watchlistService from './services/watchlistService';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: key => key, i18n: { language: 'zh-TW' } })
}));
jest.mock('./services/watchlistService', () => ({
    __esModule: true,
    default: {
        getPriceSentimentNotificationSettings: jest.fn(),
        updatePriceSentimentNotificationSettings: jest.fn()
    }
}));

const baseSettings = {
    enabled: false,
    selectedSentiments: ['extremeFear', 'extremeGreed'],
    canUseFeature: true,
    registeredEmail: 'member@example.com'
};

const renderComponent = () => render(
    <MemoryRouter><PriceSentimentNotificationSettings /></MemoryRouter>
);

const openDialog = () => fireEvent.click(screen.getByRole('button', {
    name: 'watchlist.priceSentimentNotifications.triggerButton'
}));

describe('PriceSentimentNotificationSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        watchlistService.getPriceSentimentNotificationSettings.mockResolvedValue({ ...baseSettings });
        watchlistService.updatePriceSentimentNotificationSettings.mockImplementation(async value => ({
            ...baseSettings, ...value
        }));
    });

    it('loads settings only after the dialog opens', async () => {
        renderComponent();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(watchlistService.getPriceSentimentNotificationSettings).not.toHaveBeenCalled();

        openDialog();

        expect(await screen.findByLabelText('watchlist.priceSentimentNotifications.enableTitle')).toBeInTheDocument();
        expect(screen.getByText('member@example.com')).toBeInTheDocument();
        expect(watchlistService.getPriceSentimentNotificationSettings).toHaveBeenCalledTimes(1);
    });

    it('saves the selected sentiments and enabled state', async () => {
        renderComponent();
        openDialog();

        fireEvent.click(await screen.findByLabelText('watchlist.priceSentimentNotifications.enableTitle'));
        fireEvent.click(screen.getByLabelText('watchlist.priceSentimentNotifications.sentiments.fear'));
        fireEvent.click(screen.getByRole('button', { name: 'watchlist.priceSentimentNotifications.save' }));

        await waitFor(() => expect(watchlistService.updatePriceSentimentNotificationSettings)
            .toHaveBeenCalledWith({
                enabled: true,
                selectedSentiments: ['extremeFear', 'fear', 'extremeGreed']
            }));
        expect(await screen.findByText('watchlist.priceSentimentNotifications.saved')).toBeInTheDocument();
    });

    it('shows an upgrade link for non-Pro members', async () => {
        watchlistService.getPriceSentimentNotificationSettings.mockResolvedValue({
            ...baseSettings,
            canUseFeature: false
        });
        renderComponent();
        openDialog();

        expect(await screen.findByText('watchlist.priceSentimentNotifications.proRequired')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'watchlist.priceSentimentNotifications.upgrade' }))
            .toHaveAttribute('href', '/zh-TW/subscription-plans');
    });

    it('allows retry after a settings load error', async () => {
        watchlistService.getPriceSentimentNotificationSettings
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ ...baseSettings });

        renderComponent();
        openDialog();

        expect(await screen.findByText('watchlist.priceSentimentNotifications.loadError')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
        expect(await screen.findByLabelText('watchlist.priceSentimentNotifications.enableTitle')).toBeInTheDocument();
        expect(watchlistService.getPriceSentimentNotificationSettings).toHaveBeenCalledTimes(2);
    });

    it('handles save errors gracefully', async () => {
        watchlistService.updatePriceSentimentNotificationSettings
            .mockRejectedValueOnce(new Error('Network error'));

        renderComponent();
        openDialog();

        fireEvent.click(await screen.findByLabelText('watchlist.priceSentimentNotifications.enableTitle'));
        fireEvent.click(screen.getByRole('button', { name: 'watchlist.priceSentimentNotifications.save' }));

        expect(await screen.findByText('Network error')).toBeInTheDocument();
    });

    it('disables save when enabled but no sentiments are selected', async () => {
        renderComponent();
        openDialog();

        fireEvent.click(await screen.findByLabelText('watchlist.priceSentimentNotifications.enableTitle'));
        // Deselect the two default sentiments
        fireEvent.click(screen.getByLabelText('watchlist.priceSentimentNotifications.sentiments.extremeFear'));
        fireEvent.click(screen.getByLabelText('watchlist.priceSentimentNotifications.sentiments.extremeGreed'));

        expect(screen.getByText('watchlist.priceSentimentNotifications.selectAtLeastOne')).toBeInTheDocument();
        const saveButton = screen.getByRole('button', { name: 'watchlist.priceSentimentNotifications.save' });
        expect(saveButton).toBeDisabled();
    });

    it('closes the dialog when the close button is clicked or Escape is pressed', async () => {
        renderComponent();
        openDialog();

        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        // Close using close button
        fireEvent.click(screen.getByRole('button', { name: 'dialog.closeAriaLabel' }));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        // Re-open and close with ESC
        openDialog();
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
});
