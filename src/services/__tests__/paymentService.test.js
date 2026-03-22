import paymentService from '../paymentService';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient', () => jest.fn());
jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const mockApiClient = apiClient;

describe('paymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an order through the create-order endpoint', async () => {
    const orderData = {
      planType: 'pro',
      billingPeriod: 'monthly',
      paymentMethod: 'Credit'
    };
    const responseData = {
      orderId: 'order-123',
      merchantTradeNo: 'TN123456789',
      amount: 299,
      paymentUrl: 'https://payment.ecpay.com.tw/test'
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: responseData
      }
    });

    const result = await paymentService.createOrder(orderData);

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/payment/create-order',
      data: orderData
    });
    expect(result).toEqual(responseData);
  });

  it('queries payment status by merchantTradeNo', async () => {
    const responseData = {
      orderStatus: 'paid',
      paymentStatus: 'success'
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: responseData
      }
    });

    const result = await paymentService.queryPaymentStatus('TN123456789');

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/payment/status/TN123456789'
    });
    expect(result).toEqual(responseData);
  });

  it('returns the normalized payment history payload', async () => {
    const responseData = [
      {
        id: 'payment-1',
        merchantTradeNo: 'TN123456789',
        amount: 299,
        status: 'success'
      }
    ];

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: responseData
      }
    });

    const result = await paymentService.getPaymentHistory();

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/payment/history'
    });
    expect(result).toEqual(responseData);
  });

  it('calls the cancel-order endpoint when cancelling a payment', async () => {
    const responseData = {
      orderId: 'order-123',
      status: 'cancelled'
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: responseData
      }
    });

    const result = await paymentService.cancelPayment('order-123');

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/payment/cancel-order/order-123'
    });
    expect(result).toEqual(responseData);
  });

  it('submits retry requests to the retry endpoint', async () => {
    const responseData = {
      orderId: 'order-123',
      paymentUrl: 'https://payment.ecpay.com.tw/retry'
    };

    mockApiClient.mockResolvedValue({
      data: {
        status: 'success',
        data: responseData
      }
    });

    const result = await paymentService.retryPayment('order-123');

    expect(mockApiClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/payment/retry/order-123'
    });
    expect(result).toEqual(responseData);
  });

  it('returns a structured failure result when polling by orderId fails', async () => {
    jest.spyOn(paymentService, 'checkPaymentStatus').mockResolvedValue({
      success: false,
      error: '訂單不存在'
    });

    const result = await paymentService.pollPaymentStatus('order-123', {
      maxAttempts: 1,
      interval: 1
    });

    expect(result).toEqual({
      success: false,
      status: 'timeout',
      error: '付款狀態查詢超時，請稍後再試'
    });
  });
});
