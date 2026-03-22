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
    user: { id: 'user-123' }
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
    formatBenefitPreview: (benefits) => ({ title: benefits?.title || 'Discount applied' })
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

describe('RedemptionCodeInput regression gate', () => {
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

  it('validates the code and transitions the CTA into redeem mode', async () => {
    mockValidateCode.mockResolvedValueOnce({
      success: true,
      data: {
        code: 'SAVE50',
        isValid: true,
        canRedeem: true,
        summary: '代碼有效，可以兌換',
        errors: [],
        warnings: [],
        benefits: { type: 'discount', discountAmount: 50 }
      }
    });

    render(<RedemptionCodeInput showPreview={false} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'save50' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(mockValidateCode).toHaveBeenCalledWith('SAVE50');
    });

    expect(await screen.findByText('redemption.redeem')).toBeInTheDocument();
  });

  it('prevents duplicate validation submissions while a validation request is in flight', async () => {
    let resolveValidation;
    mockValidateCode.mockReturnValueOnce(new Promise((resolve) => {
      resolveValidation = resolve;
    }));

    render(<RedemptionCodeInput showPreview={false} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'save50' } });

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
        error: '找不到此兌換代碼',
        errorCode: 'CODE_NOT_FOUND'
      });
    });
  });

  it('redeems an already validated code and refreshes the subscription state', async () => {
    mockValidateCode.mockResolvedValueOnce({
      success: true,
      data: {
        code: 'SAVE50',
        isValid: true,
        canRedeem: true,
        summary: '代碼有效，可以兌換',
        errors: [],
        warnings: [],
        benefits: { type: 'discount', discountAmount: 50 }
      }
    });
    mockRedeemCode.mockResolvedValueOnce({
      success: true,
      data: {
        benefits: { type: 'discount', discountAmount: 50 }
      }
    });

    const onRedemptionSuccess = jest.fn();

    render(
      <RedemptionCodeInput
        showPreview={false}
        onRedemptionSuccess={onRedemptionSuccess}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'save50' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(await screen.findByText('redemption.redeem')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(mockRedeemCode).toHaveBeenCalledWith('SAVE50', true);
    });

    expect(mockRefreshUserPlan).toHaveBeenCalled();
    expect(onRedemptionSuccess).toHaveBeenCalledWith({
      benefits: { type: 'discount', discountAmount: 50 }
    });
    expect(await screen.findByText('redemption.success.redeemed')).toBeInTheDocument();
  });
});
