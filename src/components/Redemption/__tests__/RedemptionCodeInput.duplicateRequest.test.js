import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockValidateCode = jest.fn();
const mockRedeemCode = jest.fn();
const mockPreviewRedemption = jest.fn();
const mockRefreshUserPlan = jest.fn();
const mockTrack = jest.fn();

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'zh-TW' }
    })
}));

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

jest.mock('../../../services/redemptionService', () => ({
    __esModule: true,
    default: {
        validateCode: (...args) => mockValidateCode(...args),
        redeemCode: (...args) => mockRedeemCode(...args),
        previewRedemption: (...args) => mockPreviewRedemption(...args),
        formatErrorMessage: jest.fn((error) => error?.error || 'unknown')
    }
}));

jest.mock('../../../hooks/useRedemptionFormatting', () => ({
    useRedemptionFormatting: () => ({
        formatters: {},
        formatError: (code) => `Error: ${code}`,
        formatBenefitPreview: (benefits) => ({ title: benefits?.title || 'Test benefit' })
    })
}));

jest.mock('../../../utils/analytics', () => ({
    Analytics: {
        track: (...args) => mockTrack(...args)
    }
}));

jest.mock('../../Common/LoadingSpinner', () => {
    return function MockLoadingSpinner() {
        return <span>Loading...</span>;
    };
});

import RedemptionCodeInput from '../RedemptionCodeInput';

describe('RedemptionCodeInput duplicate request reference suite', () => {
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('blocks duplicate validation clicks while the same validation is still in flight', async () => {
        let resolveValidation;
        mockValidateCode.mockReturnValueOnce(new Promise((resolve) => {
            resolveValidation = resolve;
        }));

        render(<RedemptionCodeInput showPreview={false} />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEST123' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        await waitFor(() => {
            expect(mockValidateCode).toHaveBeenCalledTimes(1);
        });

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        fireEvent.click(button);
        fireEvent.click(button);
        expect(mockValidateCode).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveValidation({
                success: false,
                error: 'Code not found',
                errorCode: 'CODE_NOT_FOUND'
            });
        });
    });

    it('keeps request keys scoped to the normalized code so a different code can be validated separately', async () => {
        mockValidateCode.mockResolvedValueOnce({
            success: true,
            data: {
                code: 'TEST123',
                isValid: true,
                canRedeem: true,
                summary: '代碼有效，可以兌換',
                errors: [],
                warnings: [],
                benefits: { type: 'discount', discountAmount: 10 }
            }
        });

        render(<RedemptionCodeInput showPreview={false} />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEST123' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        await waitFor(() => {
            expect(mockValidateCode).toHaveBeenCalledTimes(1);
        });

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEST456' } });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(mockValidateCode).toHaveBeenCalledTimes(2);
        });
        expect(mockValidateCode).toHaveBeenLastCalledWith('TEST456');
    });

    it('blocks duplicate redeem clicks after a code has already been validated', async () => {
        mockValidateCode.mockResolvedValueOnce({
            success: true,
            data: {
                code: 'TEST123',
                isValid: true,
                canRedeem: true,
                summary: '代碼有效，可以兌換',
                errors: [],
                warnings: [],
                benefits: { type: 'discount', discountAmount: 10 }
            }
        });

        let resolveRedeem;
        mockRedeemCode.mockReturnValueOnce(new Promise((resolve) => {
            resolveRedeem = resolve;
        }));

        render(<RedemptionCodeInput showPreview={false} />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEST123' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        expect(await screen.findByText('redemption.redeem')).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        await waitFor(() => {
            expect(mockRedeemCode).toHaveBeenCalledTimes(1);
        });

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        fireEvent.click(button);
        fireEvent.click(button);
        expect(mockRedeemCode).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveRedeem({
                success: true,
                data: { benefits: { type: 'discount', discountAmount: 10 } }
            });
        });
    });
});
