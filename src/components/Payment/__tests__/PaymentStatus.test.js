/**
 * PaymentStatus 組件測試
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import PaymentStatus from '../PaymentStatus';
import * as paymentService from '../../../services/paymentService';
import i18n from '../../../i18n';

// Mock services
jest.mock('../../../services/paymentService');
jest.mock('../../../utils/logger');

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
  useNavigate: jest.fn(() => jest.fn()),
  useSearchParams: jest.fn(() => [new URLSearchParams()]),
}));

const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  </BrowserRouter>
);

describe('PaymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockUseLocation.mockReturnValue({
      state: null,
      pathname: '/payment/status',
      search: '',
      hash: '',
      key: 'test'
    });

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/查詢付款狀態中/)).toBeInTheDocument();
  });

  it('displays success state when payment succeeds', () => {
    mockUseLocation.mockReturnValue({
      state: {
        success: true,
        subscription: {
          id: 'sub-123',
          planType: 'pro',
          status: 'active'
        }
      },
      pathname: '/payment/status',
      search: '',
      hash: '',
      key: 'test'
    });

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/付款成功/)).toBeInTheDocument();
    expect(screen.getByText(/恭喜您成功升級/)).toBeInTheDocument();
  });

  it('displays error state when payment fails', () => {
    mockUseLocation.mockReturnValue({
      state: {
        error: true,
        errorMessage: 'Payment failed'
      },
      pathname: '/payment/status',
      search: '',
      hash: '',
      key: 'test'
    });

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/付款失敗/)).toBeInTheDocument();
    expect(screen.getByText(/Payment failed/)).toBeInTheDocument();
  });

  it('queries payment status when merchantTradeNo is provided', async () => {
    const mockStatus = {
      status: 'paid',
      subscription: {
        id: 'sub-123',
        planType: 'pro'
      }
    };

    mockPaymentService.queryPaymentStatus.mockResolvedValue(mockStatus);
    
    // Mock URLSearchParams
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('merchantTradeNo', 'TN123456789');
    
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useSearchParams: () => [mockSearchParams],
      useLocation: () => ({
        state: null,
        pathname: '/payment/status',
        search: '?merchantTradeNo=TN123456789',
        hash: '',
        key: 'test'
      }),
      useNavigate: () => jest.fn(),
    }));

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockPaymentService.queryPaymentStatus).toHaveBeenCalledWith('TN123456789');
    });
  });

  it('handles payment status query error', async () => {
    const mockError = new Error('Query failed');
    mockPaymentService.queryPaymentStatus.mockRejectedValue(mockError);

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('merchantTradeNo', 'TN123456789');
    
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useSearchParams: () => [mockSearchParams],
      useLocation: () => ({
        state: null,
        pathname: '/payment/status',
        search: '?merchantTradeNo=TN123456789',
        hash: '',
        key: 'test'
      }),
      useNavigate: () => jest.fn(),
    }));

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/查詢失敗/)).toBeInTheDocument();
    });
  });

  it('shows retry button on error', () => {
    mockUseLocation.mockReturnValue({
      state: {
        error: true,
        errorMessage: 'Payment failed'
      },
      pathname: '/payment/status',
      search: '',
      hash: '',
      key: 'test'
    });

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/重試/)).toBeInTheDocument();
  });

  it('shows return to plans button', () => {
    mockUseLocation.mockReturnValue({
      state: {
        success: true,
        subscription: {
          id: 'sub-123',
          planType: 'pro'
        }
      },
      pathname: '/payment/status',
      search: '',
      hash: '',
      key: 'test'
    });

    render(
      <TestWrapper>
        <PaymentStatus />
      </TestWrapper>
    );

    expect(screen.getByText(/查看我的帳戶/)).toBeInTheDocument();
  });
});