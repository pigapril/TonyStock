/**
 * 付款狀態頁面
 * 
 * 用戶從綠界支付返回後的狀態查詢頁面
 */

import React from 'react';
import PaymentStatus from '../components/Payment/PaymentStatus';

const PaymentStatusPage = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <PaymentStatus />
        </div>
    );
};

export default PaymentStatusPage;