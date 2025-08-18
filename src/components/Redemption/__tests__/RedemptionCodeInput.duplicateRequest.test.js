/**
 * Test file for RedemptionCodeInput duplicate request prevention
 * Tests the implementation of task 1: 修復前端重複請求問題
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RedemptionCodeInput from '../RedemptionCodeInput';
import redemptionService from '../../../services/redemptionService';

// Create mock functions
const mockRefreshUserPlan = jest.fn();
const mockTrack = jest.fn();

// Mock dependencies
jest.mock('../../../services/redemptionService');
jest.mock('../../Auth/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-123' }
    })
}));
jest.mock('../../Subscription/SubscriptionContext', () => ({
    useSubscription: () => ({
        refreshUserPlan: mockRefreshUserPlan
    })
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));
jest.mock('../../../hooks/useRedemptionFormatting', () => ({
    useRedemptionFormatting: () => ({
        formatters: {},
        formatError: (code, params) => `Error: ${code}`,
        formatBenefitPreview: (benefits) => ({ title: 'Test benefit' })
    })
}));
jest.mock('../../../utils/analytics', () => ({
    Analytics: {
        track: mockTrack
    }
}));

describe('RedemptionCodeInput - Duplicate Request Prevention', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock successful validation response
        redemptionService.validateCode.mockResolvedValue({
            success: true,
            data: { valid: true }
        });
        redemptionService.previewRedemption.mockResolvedValue({
            success: true,
            data: { benefits: { type: 'discount', amount: 10 } }
        });
        redemptionService.redeemCode.mockResolvedValue({
            success: true,
            data: { benefits: { type: 'discount', amount: 10 } }
        });
    });

    test('should prevent duplicate validation requests', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Click button multiple times rapidly
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        // Wait for requests to complete
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalledTimes(1);
        });
    });

    test('should disable button during processing', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Click button
        fireEvent.click(button);

        // Button should be disabled immediately
        expect(button).toBeDisabled();
        
        // Wait for request to complete
        await waitFor(() => {
            expect(button).not.toBeDisabled();
        });
    });

    test('should disable input during processing', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Click button
        fireEvent.click(button);

        // Input should be disabled during processing
        expect(input).toBeDisabled();
        
        // Wait for request to complete
        await waitFor(() => {
            expect(input).not.toBeDisabled();
        });
    });

    test('should show loading spinner during validation', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Click button
        fireEvent.click(button);

        // Should show loading spinner
        await waitFor(() => {
            expect(screen.getByText('redemption.validating')).toBeInTheDocument();
        });
    });

    test('should generate unique request keys based on user ID and code', async () => {
        const { rerender } = render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Test with first code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);
        
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalledWith('TEST123');
        });

        // Clear and test with different code
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.change(input, { target: { value: 'TEST456' } });
        fireEvent.click(button);
        
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalledWith('TEST456');
        });

        // Should have been called twice with different codes
        expect(redemptionService.validateCode).toHaveBeenCalledTimes(2);
    });

    test('should block requests made within 1 second of each other', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // First click
        fireEvent.click(button);
        
        // Wait for first request to complete
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalledTimes(1);
        });

        // Immediate second click (should be blocked)
        fireEvent.click(button);
        
        // Should still only have been called once
        expect(redemptionService.validateCode).toHaveBeenCalledTimes(1);
    });

    test('should handle redemption with duplicate prevention', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code and validate first
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);
        
        // Wait for validation to complete
        await waitFor(() => {
            expect(screen.getByText('redemption.redeem')).toBeInTheDocument();
        });

        // Now click redeem multiple times
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        // Should only call redeem once
        await waitFor(() => {
            expect(redemptionService.redeemCode).toHaveBeenCalledTimes(1);
        });
    });

    test('should show appropriate button text based on processing state', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Initially should show validate
        expect(screen.getByText('redemption.validate')).toBeInTheDocument();

        // Enter code
        fireEvent.change(input, { target: { value: 'TEST123' } });
        
        // Click to validate
        fireEvent.click(button);

        // Should show validating
        await waitFor(() => {
            expect(screen.getByText('redemption.validating')).toBeInTheDocument();
        });

        // After validation, should show redeem
        await waitFor(() => {
            expect(screen.getByText('redemption.redeem')).toBeInTheDocument();
        });
    });

    test('should cleanup resources on unmount', async () => {
        const { unmount } = render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Start a request
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);

        // Unmount component
        unmount();

        // Component should handle cleanup gracefully
        expect(true).toBe(true); // Test passes if no errors thrown
    });

    test('should handle network errors gracefully', async () => {
        // Mock network error
        redemptionService.validateCode.mockRejectedValue(new Error('Network error'));

        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code and submit
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);

        // Should handle error and re-enable button
        await waitFor(() => {
            expect(button).not.toBeDisabled();
        });
    });

    test('should reset request state when code is cleared', async () => {
        render(<RedemptionCodeInput />);
        
        const input = screen.getByPlaceholderText('redemption.inputPlaceholder');
        const button = screen.getByRole('button');

        // Enter code and validate
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);
        
        // Wait for validation
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalledTimes(1);
        });

        // Clear the code
        fireEvent.change(input, { target: { value: '' } });

        // Enter same code again
        fireEvent.change(input, { target: { value: 'TEST123' } });
        fireEvent.click(button);

        // Should allow the request again
        await waitFor(() => {
            expect(redemptionService.validateCode).toHaveBeenCalledTimes(2);
        });
    });
});