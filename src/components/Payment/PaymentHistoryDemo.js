/**
 * PaymentHistory 演示頁面 - 展示蘋果風格設計
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import PaymentHistory from './PaymentHistory';
import i18n from '../../i18n';
import './PaymentHistory.css';

// 模擬更多數據來展示分頁功能
const generateMockPayments = () => {
  const payments = [];
  const statuses = ['success', 'pending', 'failed', 'refunded'];
  const methods = ['Credit Card', 'ATM Transfer', 'Bank Transfer'];
  const plans = ['pro', 'premium'];
  const periods = ['monthly', 'yearly'];
  
  for (let i = 1; i <= 25; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const plan = plans[Math.floor(Math.random() * plans.length)];
    const period = periods[Math.floor(Math.random() * periods.length)];
    const amount = period === 'yearly' ? (plan === 'pro' ? 2990 : 4990) : (plan === 'pro' ? 299 : 499);
    
    payments.push({
      id: `payment-${i}`,
      orderId: `TN2024${String(i).padStart(8, '0')}`,
      amount,
      currency: 'TWD',
      status,
      paymentMethod: method,
      planType: plan,
      billingPeriod: period,
      paymentDate: new Date(2024, 0, i).toISOString(),
      description: `${plan.toUpperCase()} 方案 - ${period === 'yearly' ? '年付' : '月付'}`,
      invoiceUrl: status === 'success' ? `https://example.com/invoice/${i}` : null,
      failureReason: status === 'failed' ? '付款處理失敗' : null
    });
  }
  
  return payments.reverse(); // 最新的在前面
};

const mockPaymentService = {
  getPaymentHistory: () => Promise.resolve(generateMockPayments())
};

// 替換原始的 paymentService
jest.doMock('../../services/paymentService', () => mockPaymentService);

const PaymentHistoryDemo = () => {
  return (
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <div style={{ 
          minHeight: '100vh', 
          background: 'var(--color-bg-page, #f5f5f7)', 
          padding: '40px 20px' 
        }}>
          <div style={{ 
            maxWidth: '1000px', 
            margin: '0 auto' 
          }}>
            <div style={{
              background: 'var(--color-bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--color-border-soft, #e5e5e5)'
            }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--color-text-primary, rgba(0, 0, 0, 0.85))',
                margin: '0 0 8px 0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
              }}>
                付款記錄
              </h1>
              <p style={{
                fontSize: '16px',
                color: 'var(--color-text-secondary, rgba(0, 0, 0, 0.60))',
                margin: '0 0 32px 0',
                lineHeight: '1.5'
              }}>
                查看您的所有付款交易記錄
              </p>
              
              <PaymentHistory userId="demo-user" />
            </div>
          </div>
        </div>
      </I18nextProvider>
    </BrowserRouter>
  );
};

export default PaymentHistoryDemo;