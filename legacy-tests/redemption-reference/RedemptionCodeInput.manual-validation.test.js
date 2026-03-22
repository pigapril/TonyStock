/**
 * RedemptionCodeInput Manual Validation Tests
 * 
 * Tests to verify that automatic validation has been removed
 * and manual validation works correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock all dependencies
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

jest.mock('../../Auth/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user123' }
    })
}));

jest.mock('../../Subscription/SubscriptionContext', () => ({
    useSubscription: () => ({
        refreshUserPlan: jest.fn()
    })
}));

jest.mock('../../../services/redemptionService', () => ({
    validateCode: jest.fn(),
    previewRedemption: jest.fn(),
    redeemCode: jest.fn(),
    formatErrorMessage: jest.fn((error) => error.error || 'Error')
}));

jest.mock('../../../utils/analytics', () => ({
    Analytics: {
        track: jest.fn()
    }
}));

jest.mock('../../../hooks/useRedemptionFormatting', () => ({
    useRedemptionFormatting: () => ({
        formatters: {},
        formatError: (code) => `Error: ${code}`,
        formatBenefitPreview: (benefits) => ({ title: 'Test Benefit' })
    })
}));

// Mock LoadingSpinner
jest.mock('../../Common/LoadingSpinner', () => {
    return function LoadingSpinner() {
        return <div data-testid="loading-spinner">Loading...</div>;
    };
});

// Import the component after mocks
const RedemptionCodeInput = require('../RedemptionCodeInput').default;
const redemptionService = require('../../../services/redemptionService');

describe('RedemptionCodeInput Manual Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should not auto-validate on input change', async () => {
        redemptionService.validateCode = jest.fn();
        
        render(<RedemptionCodeInput />);
        
        const input = screen.getByRole('textbox');
        
        // Type a code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Wait a bit to ensure no automatic validation occurs
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Validation should not have been called automatically
        expect(redemptionService.validateCode).not.toHaveBeenCalled();
    });

    test('should show validate button when code length >= 3', () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByRole('textbox');
        const button = screen.getByRole('button');
        
        // Initially should show validate
        expect(button).toHaveTextContent('redemption.validate');
        
        // Type a short code
        fireEvent.change(input, { target: { value: 'TE' } });
        expect(button).toHaveTextContent('redemption.validate');
        
        // Type a longer code
        fireEvent.change(input, { target: { value: 'TEST' } });
        expect(button).toHaveTextContent('redemption.validate');
    });

    test('should trigger validation on button click', async () => {
        redemptionService.validateCode = jest.fn().mockResolvedValue({
            success: true,
            data: { isValid: true }
        });
        
        render(<RedemptionCodeInput showPreview={false} />);
        
        const input = screen.getByRole('textbox');
        const button = screen.getByRole('button');
        
        // Type a code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Click validate button
        fireEvent.click(button);
        
        // Validation should be called
        expect(redemptionService.validateCode).toHaveBeenCalledWith('TEST123');
    });

    test('should clear validation result when code changes', async () => {
        redemptionService.validateCode = jest.fn().mockResolvedValue({
            success: true,
            data: { 
                code: 'TEST123',
                isValid: true,
                canRedeem: true,
                summary: '代碼有效，可以兌換',
                errors: [],
                warnings: [],
                eligibility: { eligible: true },
                benefits: { type: 'discount', amount: 10 }
            }
        });
        
        render(<RedemptionCodeInput showPreview={false} />);
        
        const input = screen.getByRole('textbox');
        const button = screen.getByRole('button');
        
        // Type and validate a code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);
        
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalled();
        });
        
        // Change the code
        fireEvent.change(input, { target: { value: 'DIFFERENT' } });
        
        // Button should show validate again (not redeem)
        expect(button).toHaveTextContent('redemption.validate');
    });

    test('should handle Enter key to trigger validation', async () => {
        redemptionService.validateCode = jest.fn().mockResolvedValue({
            success: true,
            data: { isValid: true }
        });
        
        render(<RedemptionCodeInput showPreview={false} />);
        
        const input = screen.getByRole('textbox');
        
        // Type a code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Press Enter
        fireEvent.submit(input.closest('form'));
        
        // Validation should be called
        expect(redemptionService.validateCode).toHaveBeenCalledWith('TEST123');
    });

    test('should proceed to redemption after successful validation', async () => {
        redemptionService.validateCode = jest.fn().mockResolvedValue({
            success: true,
            data: { 
                code: 'TEST123',
                isValid: true,
                canRedeem: true,
                summary: '代碼有效，可以兌換',
                errors: [],
                warnings: [],
                eligibility: { eligible: true },
                benefits: { type: 'discount', amount: 10 }
            }
        });
        
        redemptionService.redeemCode = jest.fn().mockResolvedValue({
            success: true,
            data: { benefits: { type: 'discount' } }
        });
        
        render(<RedemptionCodeInput showPreview={false} />);
        
        const input = screen.getByRole('textbox');
        const button = screen.getByRole('button');
        
        // Type and validate a code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);
        
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalled();
        });
        
        // Button should now show redeem
        await waitFor(() => {
            expect(button).toHaveTextContent('redemption.redeem');
        });
        
        // Click redeem
        fireEvent.click(button);
        
        // Redemption should be called
        await waitFor(() => {
            expect(redemptionService.redeemCode).toHaveBeenCalledWith('TEST123', true);
        });
    });
});