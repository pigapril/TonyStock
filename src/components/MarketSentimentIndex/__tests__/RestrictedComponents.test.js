import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/i18n';
import RestrictedMarketSentimentGauge from '../RestrictedMarketSentimentGauge/RestrictedMarketSentimentGauge';
import RestrictedCompositionView from '../RestrictedCompositionView/RestrictedCompositionView';

// Mock i18n for testing
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
    I18nextProvider: ({ children }) => children,
}));

describe('Restricted Components with Background Images', () => {
    const mockOnUpgradeClick = jest.fn();

    beforeEach(() => {
        mockOnUpgradeClick.mockClear();
    });

    describe('RestrictedMarketSentimentGauge', () => {
        test('renders with background screenshot image', () => {
            render(
                <RestrictedMarketSentimentGauge onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查背景圖片是否存在
            const backgroundImage = screen.getByAltText('Sentiment Gauge Feature');
            expect(backgroundImage).toBeInTheDocument();
            expect(backgroundImage).toHaveAttribute('src', '/images/market-sentiment/sentiment-gauge-feature.svg');
            expect(backgroundImage).toHaveClass('screenshot-image');
        });

        test('renders SVG gauge overlay', () => {
            render(
                <RestrictedMarketSentimentGauge onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查 SVG 儀表盤是否存在
            const svgElement = screen.getByRole('img', { hidden: true });
            expect(svgElement).toBeInTheDocument();
        });

        test('renders restriction overlay with upgrade button', () => {
            render(
                <RestrictedMarketSentimentGauge onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查升級按鈕
            const upgradeButton = screen.getByRole('button');
            expect(upgradeButton).toBeInTheDocument();
            expect(upgradeButton).toHaveClass('upgrade-cta-button');
        });
    });

    describe('RestrictedCompositionView', () => {
        test('renders with background screenshot image', () => {
            render(
                <RestrictedCompositionView onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查背景圖片是否存在
            const backgroundImage = screen.getByAltText('Composition Feature');
            expect(backgroundImage).toBeInTheDocument();
            expect(backgroundImage).toHaveAttribute('src', '/images/market-sentiment/composition-feature.png');
            expect(backgroundImage).toHaveClass('composition-screenshot-image');
        });

        test('renders mock composition items', () => {
            render(
                <RestrictedCompositionView onUpgradeClick={mockOnUpgradeClick} indicatorCount={5} />
            );

            // 檢查模擬的組成項目
            const mockItems = screen.getAllByTestId(/mock-composition-item/i);
            expect(mockItems).toHaveLength(5);
        });

        test('renders upgrade button with icon', () => {
            render(
                <RestrictedCompositionView onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查升級按鈕
            const upgradeButton = screen.getByRole('button');
            expect(upgradeButton).toBeInTheDocument();
            expect(upgradeButton).toHaveClass('composition-upgrade-button');
            
            // 檢查按鈕圖標
            const buttonIcon = upgradeButton.querySelector('.button-icon');
            expect(buttonIcon).toBeInTheDocument();
        });
    });

    describe('CSS Classes and Structure', () => {
        test('RestrictedMarketSentimentGauge has correct CSS structure', () => {
            const { container } = render(
                <RestrictedMarketSentimentGauge onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查主要容器
            expect(container.querySelector('.restricted-gauge-container')).toBeInTheDocument();
            expect(container.querySelector('.gauge-blur-overlay')).toBeInTheDocument();
            expect(container.querySelector('.feature-screenshot-background')).toBeInTheDocument();
            expect(container.querySelector('.blurred-gauge')).toBeInTheDocument();
            expect(container.querySelector('.blur-filter')).toBeInTheDocument();
            expect(container.querySelector('.restriction-overlay')).toBeInTheDocument();
        });

        test('RestrictedCompositionView has correct CSS structure', () => {
            const { container } = render(
                <RestrictedCompositionView onUpgradeClick={mockOnUpgradeClick} />
            );

            // 檢查主要容器
            expect(container.querySelector('.restricted-composition-container')).toBeInTheDocument();
            expect(container.querySelector('.composition-blur-overlay')).toBeInTheDocument();
            expect(container.querySelector('.composition-feature-screenshot-background')).toBeInTheDocument();
            expect(container.querySelector('.blurred-composition')).toBeInTheDocument();
            expect(container.querySelector('.composition-blur-filter')).toBeInTheDocument();
            expect(container.querySelector('.composition-restriction-overlay')).toBeInTheDocument();
        });
    });
});